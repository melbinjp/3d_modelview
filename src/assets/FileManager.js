import * as THREE from 'three';

/**
 * FileManager - Handles file management and organization system
 * Provides recent files, project folders, search, and metadata management
 */
export class FileManager {
    constructor(core) {
        this.core = core;
        this.recentFiles = [];
        this.projects = new Map();
        this.collections = new Map();
        this.metadata = new Map();
        this.thumbnails = new Map();
        this.searchIndex = new Map();
        
        // Configuration
        this.maxRecentFiles = 20;
        this.thumbnailSize = { width: 200, height: 150 };
        
        this.initialized = false;
    }

    /**
     * Initialize the file manager
     */
    async init() {
        if (this.initialized) {
            console.warn('FileManager already initialized');
            return;
        }

        // Load saved data from localStorage
        this.loadRecentFiles();
        this.loadProjects();
        this.loadCollections();
        this.loadMetadata();
        
        // Setup event listeners
        this.setupEventListeners();
        
        this.initialized = true;
        this.core.emit('filemanager:initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for model loading events to update recent files
        this.core.on('assets:model:loaded', (data) => {
            this.addToRecentFiles(data);
        });

        // Listen for folder loading events
        this.core.on('assets:folder:loaded', (data) => {
            this.addToRecentFiles(data);
        });
    }

    /**
     * Add file to recent files list
     */
    addToRecentFiles(data) {
        const fileInfo = {
            id: this.generateFileId(),
            name: data.file || data.url || data.folder || 'Unknown',
            type: this.getFileType(data),
            url: data.url,
            file: data.file,
            folder: data.folder,
            timestamp: Date.now(),
            model: data.model,
            animations: data.animations || [],
            metadata: this.extractModelMetadata(data.model)
        };

        // Remove existing entry if it exists
        this.recentFiles = this.recentFiles.filter(file => 
            file.name !== fileInfo.name || file.url !== fileInfo.url
        );

        // Add to beginning of list
        this.recentFiles.unshift(fileInfo);

        // Limit list size
        if (this.recentFiles.length > this.maxRecentFiles) {
            this.recentFiles = this.recentFiles.slice(0, this.maxRecentFiles);
        }

        // Generate thumbnail
        this.generateThumbnail(fileInfo);

        // Update search index
        this.updateSearchIndex(fileInfo);

        // Save to localStorage
        this.saveRecentFiles();

        // Emit event
        this.core.emit('filemanager:recent:updated', { files: this.recentFiles });
    }

    /**
     * Generate unique file ID
     */
    generateFileId() {
        return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get file type from data
     */
    getFileType(data) {
        if (data.file) {
            const extension = data.file.split('.').pop().toLowerCase();
            return extension;
        }
        if (data.url) {
            const extension = data.url.split('.').pop().toLowerCase();
            return extension;
        }
        if (data.folder) {
            return 'folder';
        }
        return 'unknown';
    }

    /**
     * Extract metadata from loaded model
     */
    extractModelMetadata(model) {
        if (!model) return {};

        const metadata = {
            vertices: 0,
            faces: 0,
            materials: 0,
            textures: 0,
            boundingBox: null,
            size: 0
        };

        // Calculate bounding box
        const box = new THREE.Box3().setFromObject(model);
        metadata.boundingBox = {
            min: { x: box.min.x, y: box.min.y, z: box.min.z },
            max: { x: box.max.x, y: box.max.y, z: box.max.z },
            size: {
                x: box.max.x - box.min.x,
                y: box.max.y - box.min.y,
                z: box.max.z - box.min.z
            }
        };

        // Count vertices, faces, materials
        const materials = new Set();
        const textures = new Set();

        model.traverse((child) => {
            if (child.isMesh) {
                if (child.geometry) {
                    if (child.geometry.attributes.position) {
                        metadata.vertices += child.geometry.attributes.position.count;
                    }
                    if (child.geometry.index) {
                        metadata.faces += child.geometry.index.count / 3;
                    } else if (child.geometry.attributes.position) {
                        metadata.faces += child.geometry.attributes.position.count / 3;
                    }
                }

                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            materials.add(mat.uuid);
                            this.extractTexturesFromMaterial(mat, textures);
                        });
                    } else {
                        materials.add(child.material.uuid);
                        this.extractTexturesFromMaterial(child.material, textures);
                    }
                }
            }
        });

        metadata.materials = materials.size;
        metadata.textures = textures.size;

        return metadata;
    }

    /**
     * Extract textures from material
     */
    extractTexturesFromMaterial(material, textureSet) {
        const textureProperties = [
            'map', 'normalMap', 'roughnessMap', 'metalnessMap', 
            'emissiveMap', 'aoMap', 'displacementMap', 'alphaMap'
        ];

        textureProperties.forEach(prop => {
            if (material[prop] && material[prop].isTexture) {
                textureSet.add(material[prop].uuid);
            }
        });
    }

    /**
     * Generate thumbnail for file
     */
    async generateThumbnail(fileInfo) {
        if (!fileInfo.model) return;

        try {
            // Create temporary renderer for thumbnail
            const canvas = document.createElement('canvas');
            canvas.width = this.thumbnailSize.width;
            canvas.height = this.thumbnailSize.height;

            const renderer = new THREE.WebGLRenderer({ 
                canvas, 
                antialias: true, 
                alpha: true,
                preserveDrawingBuffer: true
            });
            renderer.setSize(this.thumbnailSize.width, this.thumbnailSize.height);
            renderer.setClearColor(0x000000, 0);

            // Create scene and camera
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(45, canvas.width / canvas.height, 0.1, 1000);

            // Add model to scene
            const modelClone = fileInfo.model.clone();
            scene.add(modelClone);

            // Add lighting
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambientLight);

            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(1, 1, 1);
            scene.add(directionalLight);

            // Position camera to frame model
            const box = new THREE.Box3().setFromObject(modelClone);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);

            camera.position.copy(center);
            camera.position.z += maxDim * 2;
            camera.lookAt(center);

            // Render thumbnail
            renderer.render(scene, camera);

            // Convert to data URL
            const thumbnailData = canvas.toDataURL('image/jpeg', 0.8);
            this.thumbnails.set(fileInfo.id, thumbnailData);

            // Save thumbnails to localStorage (with size limit)
            this.saveThumbnails();

            // Cleanup
            renderer.dispose();
            scene.clear();

            // Emit event
            this.core.emit('filemanager:thumbnail:generated', { 
                fileId: fileInfo.id, 
                thumbnail: thumbnailData 
            });

        } catch (error) {
            console.warn('Failed to generate thumbnail:', error);
        }
    }

    /**
     * Update search index for file
     */
    updateSearchIndex(fileInfo) {
        const searchTerms = [
            fileInfo.name.toLowerCase(),
            fileInfo.type.toLowerCase(),
            ...this.extractSearchTermsFromMetadata(fileInfo.metadata)
        ];

        searchTerms.forEach(term => {
            if (!this.searchIndex.has(term)) {
                this.searchIndex.set(term, new Set());
            }
            this.searchIndex.get(term).add(fileInfo.id);
        });
    }

    /**
     * Extract search terms from metadata
     */
    extractSearchTermsFromMetadata(metadata) {
        const terms = [];
        
        if (metadata.vertices) {
            if (metadata.vertices < 1000) terms.push('low-poly');
            else if (metadata.vertices > 100000) terms.push('high-poly');
            else terms.push('medium-poly');
        }

        if (metadata.materials > 5) terms.push('multi-material');
        if (metadata.textures > 0) terms.push('textured');

        return terms;
    }

    /**
     * Create new project
     */
    createProject(name, description = '') {
        const projectId = this.generateProjectId();
        const project = {
            id: projectId,
            name,
            description,
            created: Date.now(),
            modified: Date.now(),
            files: [],
            tags: []
        };

        this.projects.set(projectId, project);
        this.saveProjects();

        this.core.emit('filemanager:project:created', { project });
        return project;
    }

    /**
     * Generate unique project ID
     */
    generateProjectId() {
        return 'project_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Add file to project
     */
    addFileToProject(projectId, fileId) {
        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        if (!project.files.includes(fileId)) {
            project.files.push(fileId);
            project.modified = Date.now();
            this.saveProjects();

            this.core.emit('filemanager:project:file:added', { projectId, fileId });
        }
    }

    /**
     * Remove file from project
     */
    removeFileFromProject(projectId, fileId) {
        const project = this.projects.get(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        const index = project.files.indexOf(fileId);
        if (index > -1) {
            project.files.splice(index, 1);
            project.modified = Date.now();
            this.saveProjects();

            this.core.emit('filemanager:project:file:removed', { projectId, fileId });
        }
    }

    /**
     * Create new collection
     */
    createCollection(name, description = '') {
        const collectionId = this.generateCollectionId();
        const collection = {
            id: collectionId,
            name,
            description,
            created: Date.now(),
            modified: Date.now(),
            files: [],
            tags: []
        };

        this.collections.set(collectionId, collection);
        this.saveCollections();

        this.core.emit('filemanager:collection:created', { collection });
        return collection;
    }

    /**
     * Generate unique collection ID
     */
    generateCollectionId() {
        return 'collection_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Add file to collection
     */
    addFileToCollection(collectionId, fileId) {
        const collection = this.collections.get(collectionId);
        if (!collection) {
            throw new Error(`Collection not found: ${collectionId}`);
        }

        if (!collection.files.includes(fileId)) {
            collection.files.push(fileId);
            collection.modified = Date.now();
            this.saveCollections();

            this.core.emit('filemanager:collection:file:added', { collectionId, fileId });
        }
    }

    /**
     * Search files
     */
    searchFiles(query, options = {}) {
        const {
            type = null,
            project = null,
            collection = null,
            tags = [],
            dateRange = null,
            sortBy = 'timestamp',
            sortOrder = 'desc'
        } = options;

        let results = [];

        if (query) {
            // Text search using search index
            const queryTerms = query.toLowerCase().split(' ');
            const matchingFileIds = new Set();

            queryTerms.forEach(term => {
                this.searchIndex.forEach((fileIds, indexTerm) => {
                    if (indexTerm.includes(term)) {
                        fileIds.forEach(id => matchingFileIds.add(id));
                    }
                });
            });

            results = this.recentFiles.filter(file => 
                matchingFileIds.has(file.id) || 
                file.name.toLowerCase().includes(query.toLowerCase())
            );
        } else {
            results = [...this.recentFiles];
        }

        // Apply filters
        if (type) {
            results = results.filter(file => file.type === type);
        }

        if (project) {
            const projectObj = this.projects.get(project);
            if (projectObj) {
                results = results.filter(file => projectObj.files.includes(file.id));
            }
        }

        if (collection) {
            const collectionObj = this.collections.get(collection);
            if (collectionObj) {
                results = results.filter(file => collectionObj.files.includes(file.id));
            }
        }

        if (tags.length > 0) {
            results = results.filter(file => {
                const fileMetadata = this.metadata.get(file.id);
                return fileMetadata && tags.some(tag => 
                    fileMetadata.tags && fileMetadata.tags.includes(tag)
                );
            });
        }

        if (dateRange) {
            results = results.filter(file => 
                file.timestamp >= dateRange.start && 
                file.timestamp <= dateRange.end
            );
        }

        // Sort results
        results.sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];

            if (sortBy === 'name') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (sortOrder === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });

        return results;
    }

    /**
     * Get file by ID
     */
    getFile(fileId) {
        return this.recentFiles.find(file => file.id === fileId);
    }

    /**
     * Get recent files
     */
    getRecentFiles(limit = null) {
        return limit ? this.recentFiles.slice(0, limit) : [...this.recentFiles];
    }

    /**
     * Get all projects
     */
    getProjects() {
        return Array.from(this.projects.values());
    }

    /**
     * Get project by ID
     */
    getProject(projectId) {
        return this.projects.get(projectId);
    }

    /**
     * Get all collections
     */
    getCollections() {
        return Array.from(this.collections.values());
    }

    /**
     * Get collection by ID
     */
    getCollection(collectionId) {
        return this.collections.get(collectionId);
    }

    /**
     * Get thumbnail for file
     */
    getThumbnail(fileId) {
        return this.thumbnails.get(fileId);
    }

    /**
     * Add metadata to file
     */
    addMetadata(fileId, metadata) {
        const existing = this.metadata.get(fileId) || {};
        this.metadata.set(fileId, { ...existing, ...metadata });
        this.saveMetadata();

        this.core.emit('filemanager:metadata:updated', { fileId, metadata });
    }

    /**
     * Add tags to file
     */
    addTags(fileId, tags) {
        const metadata = this.metadata.get(fileId) || {};
        metadata.tags = metadata.tags || [];
        
        tags.forEach(tag => {
            if (!metadata.tags.includes(tag)) {
                metadata.tags.push(tag);
            }
        });

        this.metadata.set(fileId, metadata);
        this.saveMetadata();

        // Update search index
        const file = this.getFile(fileId);
        if (file) {
            this.updateSearchIndex(file);
        }

        this.core.emit('filemanager:tags:updated', { fileId, tags: metadata.tags });
    }

    /**
     * Batch operations
     */
    batchOperation(operation, fileIds, options = {}) {
        const results = [];

        fileIds.forEach(fileId => {
            try {
                let result;
                switch (operation) {
                    case 'delete':
                        result = this.deleteFile(fileId);
                        break;
                    case 'addToProject':
                        result = this.addFileToProject(options.projectId, fileId);
                        break;
                    case 'addToCollection':
                        result = this.addFileToCollection(options.collectionId, fileId);
                        break;
                    case 'addTags':
                        result = this.addTags(fileId, options.tags);
                        break;
                    default:
                        throw new Error(`Unknown operation: ${operation}`);
                }
                results.push({ fileId, success: true, result });
            } catch (error) {
                results.push({ fileId, success: false, error: error.message });
            }
        });

        this.core.emit('filemanager:batch:completed', { operation, results });
        return results;
    }

    /**
     * Delete file from recent files
     */
    deleteFile(fileId) {
        const index = this.recentFiles.findIndex(file => file.id === fileId);
        if (index > -1) {
            this.recentFiles.splice(index, 1);
            this.thumbnails.delete(fileId);
            this.metadata.delete(fileId);
            
            // Remove from search index
            this.searchIndex.forEach((fileIds, term) => {
                fileIds.delete(fileId);
                if (fileIds.size === 0) {
                    this.searchIndex.delete(term);
                }
            });

            this.saveRecentFiles();
            this.saveThumbnails();
            this.saveMetadata();

            this.core.emit('filemanager:file:deleted', { fileId });
            return true;
        }
        return false;
    }

    /**
     * Load recent files from localStorage
     */
    loadRecentFiles() {
        try {
            const saved = localStorage.getItem('filemanager-recent-files');
            if (saved) {
                this.recentFiles = JSON.parse(saved);
                // Rebuild search index
                this.recentFiles.forEach(file => this.updateSearchIndex(file));
            }
        } catch (error) {
            console.warn('Failed to load recent files:', error);
            this.recentFiles = [];
        }
    }

    /**
     * Save recent files to localStorage
     */
    saveRecentFiles() {
        try {
            // Save without model objects to avoid circular references
            const toSave = this.recentFiles.map(file => ({
                ...file,
                model: null // Don't save model objects
            }));
            localStorage.setItem('filemanager-recent-files', JSON.stringify(toSave));
        } catch (error) {
            console.warn('Failed to save recent files:', error);
        }
    }

    /**
     * Load projects from localStorage
     */
    loadProjects() {
        try {
            const saved = localStorage.getItem('filemanager-projects');
            if (saved) {
                const projects = JSON.parse(saved);
                this.projects = new Map(Object.entries(projects));
            }
        } catch (error) {
            console.warn('Failed to load projects:', error);
            this.projects = new Map();
        }
    }

    /**
     * Save projects to localStorage
     */
    saveProjects() {
        try {
            const projectsObj = Object.fromEntries(this.projects);
            localStorage.setItem('filemanager-projects', JSON.stringify(projectsObj));
        } catch (error) {
            console.warn('Failed to save projects:', error);
        }
    }

    /**
     * Load collections from localStorage
     */
    loadCollections() {
        try {
            const saved = localStorage.getItem('filemanager-collections');
            if (saved) {
                const collections = JSON.parse(saved);
                this.collections = new Map(Object.entries(collections));
            }
        } catch (error) {
            console.warn('Failed to load collections:', error);
            this.collections = new Map();
        }
    }

    /**
     * Save collections to localStorage
     */
    saveCollections() {
        try {
            const collectionsObj = Object.fromEntries(this.collections);
            localStorage.setItem('filemanager-collections', JSON.stringify(collectionsObj));
        } catch (error) {
            console.warn('Failed to save collections:', error);
        }
    }

    /**
     * Load metadata from localStorage
     */
    loadMetadata() {
        try {
            const saved = localStorage.getItem('filemanager-metadata');
            if (saved) {
                const metadata = JSON.parse(saved);
                this.metadata = new Map(Object.entries(metadata));
            }
        } catch (error) {
            console.warn('Failed to load metadata:', error);
            this.metadata = new Map();
        }
    }

    /**
     * Save metadata to localStorage
     */
    saveMetadata() {
        try {
            const metadataObj = Object.fromEntries(this.metadata);
            localStorage.setItem('filemanager-metadata', JSON.stringify(metadataObj));
        } catch (error) {
            console.warn('Failed to save metadata:', error);
        }
    }

    /**
     * Save thumbnails to localStorage (with size limit)
     */
    saveThumbnails() {
        try {
            // Limit thumbnail storage to prevent localStorage overflow
            const maxThumbnails = 50;
            const thumbnailEntries = Array.from(this.thumbnails.entries());
            
            if (thumbnailEntries.length > maxThumbnails) {
                // Keep only the most recent thumbnails
                const recentThumbnails = thumbnailEntries.slice(-maxThumbnails);
                this.thumbnails = new Map(recentThumbnails);
            }

            const thumbnailsObj = Object.fromEntries(this.thumbnails);
            localStorage.setItem('filemanager-thumbnails', JSON.stringify(thumbnailsObj));
        } catch (error) {
            console.warn('Failed to save thumbnails:', error);
            // Clear some thumbnails if storage is full
            if (error.name === 'QuotaExceededError') {
                this.thumbnails.clear();
            }
        }
    }

    /**
     * Load thumbnails from localStorage
     */
    loadThumbnails() {
        try {
            const saved = localStorage.getItem('filemanager-thumbnails');
            if (saved) {
                const thumbnails = JSON.parse(saved);
                this.thumbnails = new Map(Object.entries(thumbnails));
            }
        } catch (error) {
            console.warn('Failed to load thumbnails:', error);
            this.thumbnails = new Map();
        }
    }

    /**
     * Get statistics
     */
    getStatistics() {
        return {
            totalFiles: this.recentFiles.length,
            totalProjects: this.projects.size,
            totalCollections: this.collections.size,
            totalThumbnails: this.thumbnails.size,
            searchIndexSize: this.searchIndex.size
        };
    }

    /**
     * Clear all data
     */
    clearAll() {
        this.recentFiles = [];
        this.projects.clear();
        this.collections.clear();
        this.metadata.clear();
        this.thumbnails.clear();
        this.searchIndex.clear();

        // Clear localStorage
        localStorage.removeItem('filemanager-recent-files');
        localStorage.removeItem('filemanager-projects');
        localStorage.removeItem('filemanager-collections');
        localStorage.removeItem('filemanager-metadata');
        localStorage.removeItem('filemanager-thumbnails');

        this.core.emit('filemanager:cleared');
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.clearAll();
        this.initialized = false;
    }
}