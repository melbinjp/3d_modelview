import * as THREE from 'three';
import { LoaderRegistry } from './LoaderRegistry.js';
import { TextureManager } from './TextureManager.js';
import { OnlineLibraryManager } from './OnlineLibraryManager.js';
import { FileManager } from './FileManager.js';

/**
 * AssetManager - Handles loading, caching, and management of 3D models, textures, and environments
 */
export class AssetManager {
    constructor(core) {
        this.core = core;
        this.loadingManager = new THREE.LoadingManager();
        this.loaderRegistry = new LoaderRegistry(this.loadingManager);
        this.textureManager = new TextureManager(this.loadingManager, this.loaderRegistry);
        this.onlineLibraryManager = new OnlineLibraryManager(this);
        this.fileManager = new FileManager(this.core);
        this.assetCache = new Map();
        
        this.initialized = false;
        this.setupLoadingManager();
    }

    /**
     * Initialize the asset manager
     */
    async init() {
        if (this.initialized) {
            console.warn('AssetManager already initialized');
            return;
        }

        try {
            // Initialize online library manager with error handling
            try {
                await this.onlineLibraryManager.init();
            } catch (error) {
                console.warn('OnlineLibraryManager initialization failed, continuing without it:', error);
                // Continue initialization even if online library fails
            }

            // Initialize file manager with error handling
            try {
                await this.fileManager.init();
            } catch (error) {
                console.warn('FileManager initialization failed, continuing without it:', error);
                // Continue initialization even if file manager fails
            }

            this.initialized = true;
            this.core.emit('assets:initialized');
        } catch (error) {
            console.error('AssetManager initialization failed:', error);
            await this.core.handleError(error, {
                type: 'initialization_error',
                severity: 'critical',
                context: { module: 'AssetManager', phase: 'initialization' }
            });
            throw error;
        }
    }



    /**
     * Setup loading manager callbacks
     */
    setupLoadingManager() {
        this.loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
            this.core.emit('assets:loading:start', { url, itemsLoaded, itemsTotal });
        };

        this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
            const progress = itemsLoaded / itemsTotal;
            this.core.emit('assets:loading:progress', { url, itemsLoaded, itemsTotal, progress });
        };

        this.loadingManager.onLoad = () => {
            this.core.emit('assets:loading:complete');
        };

        this.loadingManager.onError = (url) => {
            this.core.emit('assets:loading:error', { url });
        };
    }

    /**
     * Get loader for file extension
     */
    getLoaderForExtension(extension) {
        return this.loaderRegistry.getLoader(extension);
    }

    /**
     * Get loader for URL
     */
    getLoaderForUrl(url) {
        return this.loaderRegistry.getLoaderForUrl(url);
    }

    /**
     * Get loader for file
     */
    getLoaderForFile(file) {
        return this.loaderRegistry.getLoaderForFile(file);
    }

    /**
     * Load model from URL with automatic retry mechanism
     */
    async loadModelFromUrl(url, retryCount = 0) {
        const maxRetries = 3;
        const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        
        try {
            this.core.setState({ isLoading: true });
            
            // Check cache first
            if (this.assetCache.has(url)) {
                const cachedAsset = this.assetCache.get(url);
                this.core.setState({ isLoading: false });
                return cachedAsset;
            }

            const loader = this.getLoaderForUrl(url);
            if (!loader) {
                const error = new Error(`Unsupported file format for URL: ${url}`);
                await this.core.handleError(error, {
                    type: 'unsupported_format',
                    severity: 'medium',
                    context: { url, source: 'url_loading' }
                });
                throw error;
            }

            const loadedModel = await this.loadWithLoaderRetry(loader, url, retryCount);
            
            // Process the loaded model
            const processedModel = this.processLoadedModel(loadedModel);
            
            // Cache the asset
            this.assetCache.set(url, processedModel);
            
            this.core.setState({ isLoading: false });
            // Silent model loading
            this.core.emit('assets:model:loaded', { 
                model: processedModel.model, 
                animations: processedModel.animations,
                url 
            });
            
            return processedModel;
            
        } catch (error) {
            // Check if this is a network error and we can retry
            const isNetworkError = error.message.includes('network') || 
                                 error.message.includes('fetch') || 
                                 error.message.includes('Failed to fetch') ||
                                 error.message.includes('NetworkError') ||
                                 error.name === 'TypeError';
            
            if (isNetworkError && retryCount < maxRetries) {
                console.warn(`Network error loading ${url}, retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${maxRetries + 1})`);
                
                // Emit retry event
                this.core.emit('assets:loading:retry', { 
                    url, 
                    attempt: retryCount + 1, 
                    maxAttempts: maxRetries + 1,
                    delay: retryDelay 
                });
                
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                
                // Recursive retry
                return this.loadModelFromUrl(url, retryCount + 1);
            }
            
            this.core.setState({ isLoading: false, error: error.message });
            
            // Handle different types of loading errors
            let errorType = 'asset_load_failed';
            let severity = 'medium';
            
            if (isNetworkError) {
                errorType = 'network_error';
                severity = retryCount >= maxRetries ? 'high' : 'medium';
            } else if (error.message.includes('format') || error.message.includes('Unsupported')) {
                errorType = 'unsupported_format';
            } else if (error.message.includes('corrupted') || error.message.includes('parse')) {
                errorType = 'corrupted_file';
            } else if (error.message.includes('size') || error.message.includes('large')) {
                errorType = 'file_too_large';
                severity = 'high';
            }
            
            await this.core.handleError(error, {
                type: errorType,
                severity: severity,
                context: { 
                    url, 
                    source: 'url_loading', 
                    filename: this.getFilenameFromUrl(url),
                    retryCount,
                    maxRetries
                }
            });
            
            this.core.emit('assets:model:error', { error, url, retryCount });
            throw error;
        }
    }

    /**
     * Load with loader and retry capability
     */
    async loadWithLoaderRetry(loader, url, retryCount = 0) {
        try {
            return await this.loadWithLoader(loader, url);
        } catch (error) {
            // Add retry context to error
            error.retryCount = retryCount;
            throw error;
        }
    }

    /**
     * Get filename from URL
     */
    getFilenameFromUrl(url) {
        try {
            return url.split('/').pop().split('?')[0];
        } catch (error) {
            return 'unknown';
        }
    }

    /**
     * Load model from file
     */
    async loadModelFromFile(file) {
        try {
            this.core.setState({ isLoading: true });
            
            // Check file size
            const maxFileSize = 100 * 1024 * 1024; // 100MB
            if (file.size > maxFileSize) {
                const error = new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum size is 100MB.`);
                await this.core.handleError(error, {
                    type: 'file_too_large',
                    severity: 'high',
                    context: { filename: file.name, size: file.size, maxSize: maxFileSize }
                });
                throw error;
            }
            
            const loader = this.getLoaderForFile(file);
            if (!loader) {
                const error = new Error(`Unsupported file format: ${file.name}`);
                await this.core.handleError(error, {
                    type: 'unsupported_format',
                    severity: 'medium',
                    context: { filename: file.name, format: file.name.split('.').pop(), source: 'file_loading' }
                });
                throw error;
            }

            const fileData = await this.readFileAsArrayBuffer(file);
            let loadedModel;

            if (file.name.toLowerCase().endsWith('.glb') || file.name.toLowerCase().endsWith('.gltf')) {
                loadedModel = await this.parseWithLoader(loader, fileData, '');
            } else {
                const blob = new Blob([fileData]);
                const url = URL.createObjectURL(blob);
                try {
                    loadedModel = await this.loadWithLoader(loader, url);
                } finally {
                    URL.revokeObjectURL(url);
                }
            }

            const processedModel = this.processLoadedModel(loadedModel);
            
            this.core.setState({ isLoading: false });
            this.core.emit('assets:model:loaded', { 
                model: processedModel.model, 
                animations: processedModel.animations,
                file: file.name 
            });
            
            return processedModel;
            
        } catch (error) {
            this.core.setState({ isLoading: false, error: error.message });
            this.core.emit('assets:model:error', { error, file: file.name });
            throw error;
        }
    }

    /**
     * Load environment from URL
     */
    async loadEnvironmentFromUrl(url) {
        try {
            this.core.setState({ isLoading: true });
            
            // Check cache first
            if (this.assetCache.has(url)) {
                const cachedAsset = this.assetCache.get(url);
                this.core.setState({ isLoading: false });
                return cachedAsset;
            }

            const loader = this.getLoaderForUrl(url);
            if (!loader) {
                throw new Error(`Unsupported environment format for URL: ${url}`);
            }

            const texture = await this.loadWithLoader(loader, url);
            texture.mapping = THREE.EquirectangularReflectionMapping;
            
            // Cache the asset
            this.assetCache.set(url, texture);
            
            this.core.setState({ isLoading: false });
            this.core.emit('assets:environment:loaded', { texture, url });
            
            return texture;
            
        } catch (error) {
            this.core.setState({ isLoading: false, error: error.message });
            this.core.emit('assets:environment:error', { error, url });
            throw error;
        }
    }

    /**
     * Process loaded model to standardize format
     */
    processLoadedModel(loadedModel) {
        let model;
        let animations = [];

        if (loadedModel.scene) {
            // GLTF format
            model = loadedModel.scene;
            animations = loadedModel.animations || [];
        } else if (loadedModel.isBufferGeometry || loadedModel.isGeometry) {
            // Geometry format (STL, PLY)
            const material = new THREE.MeshPhongMaterial({ color: 0x888888 });
            model = new THREE.Mesh(loadedModel, material);
        } else {
            // Other formats
            model = loadedModel;
        }

        return { model, animations };
    }

    /**
     * Load with a Three.js loader (Promise wrapper)
     */
    loadWithLoader(loader, url) {
        return new Promise((resolve, reject) => {
            loader.load(
                url,
                (result) => resolve(result),
                () => {
                    // Progress is handled by LoadingManager
                },
                (error) => reject(error)
            );
        });
    }

    /**
     * Parse with a Three.js loader (Promise wrapper)
     */
    parseWithLoader(loader, data, path) {
        return new Promise((resolve, reject) => {
            loader.parse(
                data,
                path,
                (result) => resolve(result),
                (error) => reject(error)
            );
        });
    }

    /**
     * Read file as ArrayBuffer (Promise wrapper)
     */
    readFileAsArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Get cached asset
     */
    getCachedAsset(key) {
        return this.assetCache.get(key);
    }

    /**
     * Cache asset
     */
    cacheAsset(key, asset) {
        this.assetCache.set(key, asset);
    }

    /**
     * Clear cache
     */
    clearCache() {
        const clearedCount = this.assetCache.size;
        this.assetCache.clear();
        this.core.emit('assets:cache:cleared', { clearedCount });
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        let totalSize = 0;
        const entries = [];

        this.assetCache.forEach((asset, key) => {
            const entry = {
                key,
                type: asset.model ? 'model' : 'texture',
                timestamp: asset.timestamp || Date.now()
            };
            
            // Estimate memory usage
            if (asset.model && asset.model.traverse) {
                let triangles = 0;
                asset.model.traverse(child => {
                    if (child.geometry) {
                        triangles += child.geometry.attributes.position ? 
                            child.geometry.attributes.position.count / 3 : 0;
                    }
                });
                entry.triangles = triangles;
                entry.estimatedSize = triangles * 36; // Rough estimate: 36 bytes per triangle
                totalSize += entry.estimatedSize;
            }
            
            entries.push(entry);
        });

        return {
            totalEntries: this.assetCache.size,
            totalEstimatedSize: totalSize,
            entries: entries.sort((a, b) => b.estimatedSize - a.estimatedSize)
        };
    }

    /**
     * Get cache size
     */
    getCacheSize() {
        return this.assetCache.size;
    }

    /**
     * Preload assets for better performance
     */
    async preloadAssets(urls) {
        const preloadPromises = urls.map(url => {
            if (!this.assetCache.has(url)) {
                return this.loadModelFromUrl(url).catch(error => {
                    console.warn(`Failed to preload asset: ${url}`, error);
                    return null;
                });
            }
            return Promise.resolve(this.assetCache.get(url));
        });

        const results = await Promise.allSettled(preloadPromises);
        const successful = results.filter(result => result.status === 'fulfilled' && result.value).length;
        
        this.core.emit('assets:preload:complete', {
            total: urls.length,
            successful,
            failed: urls.length - successful
        });

        return results;
    }

    /**
     * Load model from folder with automatic texture detection
     */
    async loadModelFromFolder(files) {
        try {
            this.core.setState({ isLoading: true });
            
            const fileArray = Array.isArray(files) ? files : Array.from(files);
            
            // Find model files
            const modelFiles = fileArray.filter(file => {
                const extension = this.loaderRegistry.extractExtension(file.name);
                return this.loaderRegistry.getSupportedModelFormats().includes(extension);
            });
            
            if (modelFiles.length === 0) {
                throw new Error('No supported model files found in folder');
            }
            
            // Load the first model file
            const modelFile = modelFiles[0];
            const loadedModel = await this.loadModelFromFile(modelFile);
            
            // Detect and load textures from the same folder
            const baseName = modelFile.name.replace(/\.[^.]+$/, '');
            const textureMap = await this.textureManager.detectAndLoadTextures(fileArray, baseName);
            
            // Apply textures to model if any were found
            if (textureMap.size > 0) {
                this.applyTexturesToModel(loadedModel.model, textureMap);
            }
            
            this.core.setState({ isLoading: false });
            this.core.emit('assets:folder:loaded', { 
                model: loadedModel.model, 
                animations: loadedModel.animations,
                textures: textureMap,
                folder: modelFile.webkitRelativePath || 'folder'
            });
            
            return { ...loadedModel, textures: textureMap };
            
        } catch (error) {
            this.core.setState({ isLoading: false, error: error.message });
            this.core.emit('assets:folder:error', { error });
            throw error;
        }
    }

    /**
     * Load texture using TextureManager
     */
    async loadTexture(source, options = {}) {
        return await this.textureManager.loadTexture(source, options);
    }

    /**
     * Search online asset libraries
     */
    async searchOnlineAssets(query, libraryId = null, options = {}) {
        console.log('AssetManager.searchOnlineAssets called with:', { query, libraryId, options });
        try {
            const result = await this.onlineLibraryManager.searchAssets(query, libraryId, options);
            console.log('AssetManager.searchOnlineAssets returning:', result);
            return result;
        } catch (error) {
            console.error('AssetManager.searchOnlineAssets error:', error);
            throw error;
        }
    }

    /**
     * Load asset from online library
     */
    async loadAssetFromLibrary(assetInfo, options = {}) {
        return await this.onlineLibraryManager.loadAssetFromLibrary(assetInfo, options);
    }

    /**
     * Apply textures to model materials
     */
    applyTexturesToModel(model, textureMap) {
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                // Create new PBR material with detected textures
                const newMaterial = this.textureManager.createPBRMaterial(textureMap, {
                    // Preserve existing material properties
                    color: child.material.color,
                    transparent: child.material.transparent,
                    opacity: child.material.opacity
                });
                
                child.material = newMaterial;
            }
        });
    }

    /**
     * Load MTL file for OBJ models
     */
    async loadMTLFile(mtlFile, objModel) {
        try {
            const mtlLoader = this.loaderRegistry.getLoader('mtl');
            if (!mtlLoader) {
                console.warn('MTL loader not available');
                return objModel;
            }

            const mtlUrl = URL.createObjectURL(mtlFile);
            
            try {
                const materials = await new Promise((resolve, reject) => {
                    mtlLoader.load(mtlUrl, resolve, undefined, reject);
                });
                
                materials.preload();
                
                // Apply materials to OBJ model
                objModel.traverse((child) => {
                    if (child.isMesh) {
                        const materialName = child.material.name;
                        if (materials.materials[materialName]) {
                            child.material = materials.materials[materialName];
                        }
                    }
                });
                
                return objModel;
            } finally {
                URL.revokeObjectURL(mtlUrl);
            }
        } catch (error) {
            console.warn('Failed to load MTL file:', error);
            return objModel;
        }
    }

    /**
     * Get format information
     */
    getFormatInfo(extension) {
        return this.loaderRegistry.getFormatInfo(extension);
    }

    /**
     * Get supported formats
     */
    getSupportedFormats() {
        return this.loaderRegistry.getSupportedFormats();
    }

    /**
     * Get supported model formats
     */
    getSupportedModelFormats() {
        return this.loaderRegistry.getSupportedModelFormats();
    }

    /**
     * Get supported texture formats
     */
    getSupportedTextureFormats() {
        return this.loaderRegistry.getSupportedTextureFormats();
    }

    /**
     * Get supported HDR formats
     */
    getSupportedHDRFormats() {
        return this.loaderRegistry.getSupportedHDRFormats();
    }

    /**
     * Get available online libraries
     */
    getAvailableLibraries() {
        return this.onlineLibraryManager.getAvailableLibraries();
    }

    /**
     * Get file manager
     */
    getFileManager() {
        return this.fileManager;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Dispose of cached Three.js objects
        this.assetCache.forEach((asset, key) => {
            if (asset.model && asset.model.traverse) {
                asset.model.traverse((child) => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(material => material.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                });
            }
            if (asset.texture && asset.texture.dispose) {
                asset.texture.dispose();
            }
        });
        
        this.clearCache();
        
        if (this.textureManager) {
            this.textureManager.destroy();
        }
        
        if (this.onlineLibraryManager) {
            this.onlineLibraryManager.clearCache();
        }
        
        if (this.fileManager) {
            this.fileManager.destroy();
        }
        
        this.initialized = false;
    }
}