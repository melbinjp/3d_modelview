/**
 * OnlineLibraryManager - Handles integration with online model repositories and asset libraries
 */
export class OnlineLibraryManager {
    constructor(assetManager) {
        this.assetManager = assetManager;
        this.libraries = new Map();
        this.cache = new Map();
        this.localCache = null; // IndexedDB cache
        this.offlineAssets = new Map();
        this.searchHistory = [];
        this.favorites = new Set();
        this.setupLibraries();
        this.initializeLocalCache();
    }

    /**
     * Setup supported online libraries
     */
    setupLibraries() {
        // Sketchfab integration (requires API key)
        this.libraries.set('sketchfab', {
            name: 'Sketchfab',
            baseUrl: 'https://api.sketchfab.com/v3',
            searchEndpoint: '/search',
            downloadEndpoint: '/models',
            requiresAuth: true,
            supportedFormats: ['gltf', 'glb'],
            description: 'Professional 3D model marketplace'
        });

        // Poly Haven (free HDRIs and textures)
        this.libraries.set('polyhaven', {
            name: 'Poly Haven',
            baseUrl: 'https://api.polyhaven.com',
            searchEndpoint: '/assets',
            downloadEndpoint: '/files',
            requiresAuth: false,
            supportedFormats: ['hdr', 'exr', 'jpg', 'png'],
            description: 'Free HDRIs, textures and 3D models'
        });

        // Three.js examples (free sample models)
        this.libraries.set('threejs-examples', {
            name: 'Three.js Examples',
            baseUrl: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models',
            searchEndpoint: '',
            downloadEndpoint: '',
            requiresAuth: false,
            supportedFormats: ['gltf', 'glb', 'fbx', 'obj'],
            description: 'Sample models from Three.js examples'
        });

        // Khronos Group glTF samples (GitHub API)
        this.libraries.set('gltf-samples', {
            name: 'glTF Sample Models',
            baseUrl: 'https://api.github.com/repos/KhronosGroup/glTF-Sample-Models/contents/2.0',
            searchEndpoint: '',
            downloadEndpoint: '',
            requiresAuth: false,
            supportedFormats: ['gltf', 'glb'],
            description: 'Official glTF sample models from GitHub'
        });

        // Free3D.com public models
        this.libraries.set('free3d', {
            name: 'Free3D Models',
            baseUrl: 'https://free3d.com/api/v1',
            searchEndpoint: '/models/search',
            downloadEndpoint: '/models',
            requiresAuth: false,
            supportedFormats: ['obj', 'fbx', 'blend', '3ds'],
            description: 'Free 3D models from Free3D.com'
        });

        // Environments library
        this.libraries.set('environments', {
            name: 'Environments & HDRIs',
            baseUrl: 'https://polyhaven.com/api/v1',
            searchEndpoint: '/assets',
            downloadEndpoint: '/files',
            requiresAuth: false,
            supportedFormats: ['hdr', 'exr', 'jpg', 'png'],
            description: 'HDRI environments and skyboxes'
        });
    }

    /**
     * Search for assets in online libraries
     */
    async searchAssets(query, libraryId = null, options = {}) {
        try {
            const libraries = libraryId ? [libraryId] : Array.from(this.libraries.keys());
            const results = [];

            for (const libId of libraries) {
                const library = this.libraries.get(libId);
                if (!library) continue;

                try {
                    const libraryResults = await this.searchInLibrary(libId, query, options);
                    results.push(...libraryResults.map(result => ({
                        ...result,
                        library: libId,
                        libraryName: library.name
                    })));
                } catch (error) {
                    console.warn(`Search failed for library ${libId}:`, error);
                }
            }

            return results;
        } catch (error) {
            console.error('Asset search failed:', error);
            throw error;
        }
    }

    /**
     * Search in specific library
     */
    async searchInLibrary(libraryId, query, options = {}) {
        const library = this.libraries.get(libraryId);
        if (!library) {
            throw new Error(`Library ${libraryId} not found`);
        }

        switch (libraryId) {
            case 'sketchfab':
                return this.searchSketchfab(query, options);
            case 'polyhaven':
                return this.searchPolyHaven(query, options);
            case 'threejs-examples':
                return this.getThreeJSExamples(options);
            case 'gltf-samples':
                return this.searchGLTFSamplesGitHub(query, options);
            case 'free3d':
                return this.searchFree3D(query, options);
            case 'environments':
                return this.searchEnvironments(query, options);
            default:
                throw new Error(`Search not implemented for library ${libraryId}`);
        }
    }

    /**
     * Search Sketchfab (requires API key)
     */
    async searchSketchfab(query, options = {}) {
        const library = this.libraries.get('sketchfab');
        const params = new URLSearchParams({
            q: query,
            type: 'models',
            downloadable: 'true',
            sort_by: options.sortBy || 'relevance',
            count: options.count || 20
        });

        // Note: This requires a Sketchfab API key
        // In a real implementation, this would be configured by the user
        const apiKey = options.apiKey || process.env.SKETCHFAB_API_KEY;
        if (!apiKey) {
            throw new Error('Sketchfab API key required');
        }

        const response = await fetch(`${library.baseUrl}${library.searchEndpoint}?${params}`, {
            headers: {
                'Authorization': `Token ${apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error(`Sketchfab API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.results.map(model => ({
            id: model.uid,
            name: model.name,
            description: model.description,
            thumbnail: model.thumbnails?.images?.[0]?.url,
            author: model.user?.displayName,
            downloadUrl: model.archives?.gltf?.url,
            format: 'gltf',
            license: model.license?.label,
            tags: model.tags?.map(tag => tag.name) || []
        }));
    }

    /**
     * Search Poly Haven
     */
    async searchPolyHaven(query, options = {}) {
        const library = this.libraries.get('polyhaven');
        const params = new URLSearchParams({
            search: query,
            type: options.type || 'all', // 'hdris', 'textures', 'models'
            limit: options.count || 20
        });

        const response = await fetch(`${library.baseUrl}${library.searchEndpoint}?${params}`);
        
        if (!response.ok) {
            throw new Error(`Poly Haven API error: ${response.statusText}`);
        }

        const data = await response.json();
        const results = [];

        for (const [assetId, asset] of Object.entries(data)) {
            results.push({
                id: assetId,
                name: asset.name || assetId,
                description: asset.description || '',
                thumbnail: `https://cdn.polyhaven.com/asset_img/thumbs/${assetId}.png`,
                author: asset.author || 'Poly Haven',
                downloadUrl: `${library.baseUrl}${library.downloadEndpoint}/${assetId}`,
                format: this.detectPolyHavenFormat(asset),
                license: 'CC0',
                tags: asset.tags || []
            });
        }

        return results;
    }

    /**
     * Get Three.js example models
     */
    async getThreeJSExamples(options = {}) {
        // Predefined list of Three.js example models
        const examples = [
            {
                id: 'horse',
                name: 'Horse',
                description: 'Animated horse model',
                format: 'gltf',
                path: 'gltf/Horse.glb'
            },
            {
                id: 'flamingo',
                name: 'Flamingo',
                description: 'Animated flamingo model',
                format: 'gltf',
                path: 'gltf/Flamingo.glb'
            },
            {
                id: 'stork',
                name: 'Stork',
                description: 'Animated stork model',
                format: 'gltf',
                path: 'gltf/Stork.glb'
            },
            {
                id: 'parrot',
                name: 'Parrot',
                description: 'Animated parrot model',
                format: 'gltf',
                path: 'gltf/Parrot.glb'
            },
            {
                id: 'soldier',
                name: 'Soldier',
                description: 'Animated soldier model',
                format: 'gltf',
                path: 'gltf/Soldier.glb'
            },
            {
                id: 'car',
                name: 'Car',
                description: 'A detailed car model',
                format: 'gltf',
                path: 'gltf/ferrari.glb'
            }
        ];

        const library = this.libraries.get('threejs-examples');
        return examples.map(example => ({
            ...example,
            downloadUrl: `${library.baseUrl}/${example.path}`,
            thumbnail: null,
            author: 'Three.js',
            license: 'MIT',
            tags: ['example', 'animation']
        }));
    }

    /**
     * Search glTF sample models from GitHub API
     */
    async searchGLTFSamplesGitHub(query, options = {}) {
        try {
            const library = this.libraries.get('gltf-samples');
            const response = await fetch(library.baseUrl);
            
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.statusText}`);
            }
            
            const folders = await response.json();
            const results = [];
            
            // Filter folders based on query
            const filteredFolders = folders.filter(folder => 
                folder.type === 'dir' && 
                (query === '' || folder.name.toLowerCase().includes(query.toLowerCase()))
            ).slice(0, options.count || 20);
            
            for (const folder of filteredFolders) {
                // Try to find GLB file in the folder
                const glbUrl = `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/${folder.name}/glTF-Binary/${folder.name}.glb`;
                const gltfUrl = `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/${folder.name}/glTF/${folder.name}.gltf`;
                
                results.push({
                    id: folder.name.toLowerCase(),
                    name: folder.name,
                    description: `glTF sample model: ${folder.name}`,
                    downloadUrl: glbUrl, // Prefer GLB format
                    alternativeUrl: gltfUrl,
                    format: 'glb',
                    thumbnail: `https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/${folder.name}/screenshot/screenshot.png`,
                    author: 'Khronos Group',
                    license: 'Various',
                    tags: ['sample', 'gltf', 'official']
                });
            }
            
            return results;
        } catch (error) {
            console.warn('Failed to fetch glTF samples from GitHub:', error);
            // Fallback to static list
            return this.getGLTFSamplesFallback(query, options);
        }
    }

    /**
     * Get a specific sample model by ID
     */
    async getSampleModel(sampleId) {
        const samples = this.getGLTFSamplesFallback();
        return samples.find(sample => sample.id === sampleId);
    }

    /**
     * Get all available sample models
     */
    getSampleModels() {
        return this.getGLTFSamplesFallback();
    }

    /**
     * Fallback static glTF samples with better categorization
     */
    getGLTFSamplesFallback(query, options = {}) {
        const samples = [
            {
                id: 'duck',
                name: 'Duck',
                description: 'Simple duck model',
                downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
                format: 'glb',
                thumbnail: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/screenshot/screenshot.png',
                author: 'Khronos Group',
                license: 'CC0',
                tags: ['animal', 'duck', 'bird', 'sample'],
                category: 'animals',
                hasAnimations: false,
                hasTextures: true
            },
            {
                id: 'avocado',
                name: 'Avocado',
                description: 'Photorealistic avocado fruit',
                downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Avocado/glTF-Binary/Avocado.glb',
                format: 'glb',
                thumbnail: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Avocado/screenshot/screenshot.png',
                author: 'Khronos Group',
                license: 'CC0',
                tags: ['food', 'fruit', 'avocado', 'organic'],
                category: 'nature',
                hasAnimations: false,
                hasTextures: true
            },
            {
                id: 'brainstem',
                name: 'BrainStem',
                description: 'Animated brain stem anatomy model',
                downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BrainStem/glTF-Binary/BrainStem.glb',
                format: 'glb',
                thumbnail: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BrainStem/screenshot/screenshot.png',
                author: 'Khronos Group',
                license: 'CC0',
                tags: ['medical', 'anatomy', 'brain', 'science', 'animation'],
                category: 'characters',
                hasAnimations: true,
                hasTextures: true
            },
            {
                id: 'cesium-man',
                name: 'Cesium Man',
                description: 'Animated character with walking animation',
                downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumMan/glTF-Binary/CesiumMan.glb',
                format: 'glb',
                thumbnail: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumMan/screenshot/screenshot.png',
                author: 'Khronos Group',
                license: 'CC0',
                tags: ['character', 'human', 'man', 'animation', 'walking'],
                category: 'characters',
                hasAnimations: true,
                hasTextures: true
            },
            {
                id: 'damaged-helmet',
                name: 'Damaged Helmet',
                description: 'Battle-worn sci-fi helmet',
                downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
                format: 'glb',
                thumbnail: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/screenshot/screenshot.png',
                author: 'Khronos Group',
                license: 'CC0',
                tags: ['helmet', 'armor', 'sci-fi', 'damaged', 'military'],
                category: 'weapons',
                hasAnimations: false,
                hasTextures: true
            },
            {
                id: 'flight-helmet',
                name: 'Flight Helmet',
                description: 'Pilot flight helmet with detailed textures',
                downloadUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/FlightHelmet/glTF/FlightHelmet.gltf',
                format: 'gltf',
                thumbnail: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/FlightHelmet/screenshot/screenshot.png',
                author: 'Khronos Group',
                license: 'CC0',
                tags: ['helmet', 'pilot', 'aviation', 'military', 'flight'],
                category: 'vehicles',
                hasAnimations: false,
                hasTextures: true
            }
        ];

        let filtered = samples;

        // Filter by query if provided
        if (query && query.trim()) {
            const searchTerm = query.toLowerCase().trim();
            filtered = samples.filter(sample => 
                sample.name.toLowerCase().includes(searchTerm) ||
                sample.description.toLowerCase().includes(searchTerm) ||
                sample.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
                sample.category.toLowerCase().includes(searchTerm)
            );
        }

        // Apply additional filters from options
        if (options.category && options.category !== '') {
            filtered = filtered.filter(sample => sample.category === options.category);
        }

        if (options.hasAnimations !== undefined) {
            filtered = filtered.filter(sample => sample.hasAnimations === options.hasAnimations);
        }

        if (options.hasTextures !== undefined) {
            filtered = filtered.filter(sample => sample.hasTextures === options.hasTextures);
        }

        // Apply sorting
        if (options.sortBy) {
            switch (options.sortBy) {
                case 'name':
                    filtered.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                case 'name-desc':
                    filtered.sort((a, b) => b.name.localeCompare(a.name));
                    break;
                case 'category':
                    filtered.sort((a, b) => a.category.localeCompare(b.category));
                    break;
                // 'relevance' and others keep original order
            }
        }

        return filtered.slice(0, options.count || 20);
    }

    /**
     * Search Free3D models (mock implementation)
     */
    async searchFree3D(query, options = {}) {
        // Note: Free3D.com doesn't have a public API, so this is a mock
        // In a real implementation, you'd need to scrape or use their API if available
        const mockResults = [
            {
                id: 'chair-modern',
                name: 'Modern Chair',
                description: 'Contemporary office chair model',
                downloadUrl: 'https://example.com/chair.obj', // Mock URL
                format: 'obj',
                thumbnail: null,
                author: 'Free3D User',
                license: 'Free',
                tags: ['furniture', 'chair', 'modern']
            },
            {
                id: 'car-sports',
                name: 'Sports Car',
                description: 'High-performance sports car',
                downloadUrl: 'https://example.com/car.fbx', // Mock URL
                format: 'fbx',
                thumbnail: null,
                author: 'Free3D User',
                license: 'Free',
                tags: ['vehicle', 'car', 'sports']
            }
        ];

        // Filter by query
        const filtered = query ? 
            mockResults.filter(result => 
                result.name.toLowerCase().includes(query.toLowerCase()) ||
                result.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
            ) : mockResults;

        return filtered.slice(0, options.count || 10);
    }

    /**
     * Search environments and HDRIs
     */
    async searchEnvironments(query, options = {}) {
        // Static environment collection for now
        const environments = [
            {
                id: 'studio-small',
                name: 'Studio Small',
                description: 'Small photography studio environment',
                downloadUrl: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_03_1k.hdr',
                format: 'hdr',
                thumbnail: 'https://cdn.polyhaven.com/asset_img/thumbs/studio_small_03.png',
                author: 'Poly Haven',
                license: 'CC0',
                tags: ['studio', 'indoor', 'lighting', 'photography'],
                category: 'environments',
                type: 'hdri'
            },
            {
                id: 'forest-path',
                name: 'Forest Path',
                description: 'Natural forest path environment',
                downloadUrl: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/forest_path_01_1k.hdr',
                format: 'hdr',
                thumbnail: 'https://cdn.polyhaven.com/asset_img/thumbs/forest_path_01.png',
                author: 'Poly Haven',
                license: 'CC0',
                tags: ['forest', 'nature', 'outdoor', 'trees', 'path'],
                category: 'environments',
                type: 'hdri'
            },
            {
                id: 'sunset-beach',
                name: 'Sunset Beach',
                description: 'Beautiful sunset beach environment',
                downloadUrl: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloppenheim_06_1k.hdr',
                format: 'hdr',
                thumbnail: 'https://cdn.polyhaven.com/asset_img/thumbs/kloppenheim_06.png',
                author: 'Poly Haven',
                license: 'CC0',
                tags: ['sunset', 'beach', 'ocean', 'outdoor', 'golden hour'],
                category: 'environments',
                type: 'hdri'
            },
            {
                id: 'urban-alley',
                name: 'Urban Alley',
                description: 'City alley environment with dramatic lighting',
                downloadUrl: 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/urban_alley_01_1k.hdr',
                format: 'hdr',
                thumbnail: 'https://cdn.polyhaven.com/asset_img/thumbs/urban_alley_01.png',
                author: 'Poly Haven',
                license: 'CC0',
                tags: ['urban', 'city', 'alley', 'dramatic', 'moody'],
                category: 'environments',
                type: 'hdri'
            }
        ];

        let filtered = environments;

        // Filter by query
        if (query && query.trim()) {
            const searchTerm = query.toLowerCase().trim();
            filtered = environments.filter(env => 
                env.name.toLowerCase().includes(searchTerm) ||
                env.description.toLowerCase().includes(searchTerm) ||
                env.tags.some(tag => tag.toLowerCase().includes(searchTerm))
            );
        }

        return filtered.slice(0, options.count || 20);
    }

    /**
     * Download asset from online library
     */
    async downloadAsset(assetInfo, options = {}) {
        try {
            // Check cache first
            const cacheKey = `${assetInfo.library}_${assetInfo.id}`;
            if (this.cache.has(cacheKey) && !options.forceDownload) {
                return this.cache.get(cacheKey);
            }

            // Download the asset
            const response = await fetch(assetInfo.downloadUrl);
            if (!response.ok) {
                throw new Error(`Download failed: ${response.statusText}`);
            }

            const blob = await response.blob();
            const file = new File([blob], `${assetInfo.name}.${assetInfo.format}`, {
                type: blob.type
            });

            // Cache the downloaded asset
            if (options.cache !== false) {
                this.cache.set(cacheKey, file);
            }

            return file;
        } catch (error) {
            console.error('Asset download failed:', error);
            throw error;
        }
    }

    /**
     * Load asset directly from online library
     */
    async loadAssetFromLibrary(assetInfo, options = {}) {
        try {
            const file = await this.downloadAsset(assetInfo, options);
            return await this.assetManager.loadModelFromFile(file);
        } catch (error) {
            console.error('Failed to load asset from library:', error);
            throw error;
        }
    }

    /**
     * Get library information
     */
    getLibraryInfo(libraryId) {
        return this.libraries.get(libraryId);
    }

    /**
     * Get all available libraries
     */
    getAvailableLibraries() {
        return Array.from(this.libraries.entries()).map(([id, info]) => ({
            id,
            ...info
        }));
    }

    /**
     * Detect format for Poly Haven assets
     */
    detectPolyHavenFormat(asset) {
        if (asset.type === 'hdri') return 'hdr';
        if (asset.type === 'texture') return 'jpg';
        if (asset.type === 'model') return 'gltf';
        return 'unknown';
    }

    /**
     * Initialize IndexedDB for local caching
     */
    async initializeLocalCache() {
        try {
            this.localCache = await this.openIndexedDB();
            await this.loadOfflineAssets();
        } catch (error) {
            console.warn('Failed to initialize local cache:', error);
        }
    }

    /**
     * Open IndexedDB connection
     */
    openIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ModelViewerAssets', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains('assets')) {
                    const assetStore = db.createObjectStore('assets', { keyPath: 'id' });
                    assetStore.createIndex('library', 'library', { unique: false });
                    assetStore.createIndex('format', 'format', { unique: false });
                    assetStore.createIndex('downloadDate', 'downloadDate', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains('thumbnails')) {
                    db.createObjectStore('thumbnails', { keyPath: 'id' });
                }
            };
        });
    }

    /**
     * Load offline assets from IndexedDB
     */
    async loadOfflineAssets() {
        if (!this.localCache) return;
        
        try {
            const transaction = this.localCache.transaction(['assets'], 'readonly');
            const store = transaction.objectStore('assets');
            const request = store.getAll();
            
            request.onsuccess = () => {
                request.result.forEach(asset => {
                    this.offlineAssets.set(asset.id, asset);
                });
            };
        } catch (error) {
            console.warn('Failed to load offline assets:', error);
        }
    }

    /**
     * Get glTF sample models (convenience method for tests and direct access)
     */
    async getGLTFSamples(options = {}) {
        try {
            return await this.searchInLibrary('gltf-samples', '', options);
        } catch (error) {
            console.warn('Failed to get glTF samples from GitHub, using fallback:', error);
            return this.getGLTFSamplesFallback('', options);
        }
    }

    /**
     * Enhanced search with caching and offline support
     */
    async searchAssets(query, libraryId = null, options = {}) {
        try {
            console.log('OnlineLibraryManager.searchAssets called with:', { query, libraryId, options });
            
            // Add to search history
            if (query && !this.searchHistory.includes(query)) {
                this.searchHistory.unshift(query);
                this.searchHistory = this.searchHistory.slice(0, 10); // Keep last 10 searches
            }

            // Check if we're offline and have cached results
            if (!navigator.onLine && options.allowOffline !== false) {
                console.log('Searching offline assets');
                return this.searchOfflineAssets(query, libraryId, options);
            }

            const libraries = libraryId ? [libraryId] : Array.from(this.libraries.keys());
            console.log('Searching libraries:', libraries);
            const results = [];

            for (const libId of libraries) {
                const library = this.libraries.get(libId);
                if (!library) continue;

                try {
                    console.log(`Searching in library: ${libId}`);
                    const libraryResults = await this.searchInLibrary(libId, query, options);
                    console.log(`Library ${libId} returned ${libraryResults.length} results`);
                    
                    const enhancedResults = libraryResults.map(result => ({
                        ...result,
                        library: libId,
                        libraryName: library.name,
                        isFavorite: this.favorites.has(`${libId}_${result.id}`),
                        isOfflineAvailable: this.offlineAssets.has(`${libId}_${result.id}`)
                    }));
                    results.push(...enhancedResults);
                } catch (error) {
                    console.warn(`Search failed for library ${libId}:`, error);
                }
            }

            console.log('Total search results:', results.length);
            
            // Cache search results
            this.cacheSearchResults(query, results);

            return results;
        } catch (error) {
            console.error('Asset search failed:', error);
            throw error;
        }
    }

    /**
     * Search offline assets
     */
    searchOfflineAssets(query, libraryId = null, options = {}) {
        const results = [];
        const searchTerm = query.toLowerCase();

        for (const [id, asset] of this.offlineAssets) {
            if (libraryId && asset.library !== libraryId) continue;
            
            const matchesName = asset.name.toLowerCase().includes(searchTerm);
            const matchesTags = asset.tags && asset.tags.some(tag => 
                tag.toLowerCase().includes(searchTerm)
            );
            const matchesDescription = asset.description && 
                asset.description.toLowerCase().includes(searchTerm);

            if (matchesName || matchesTags || matchesDescription) {
                results.push({
                    ...asset,
                    isOfflineAvailable: true,
                    isFavorite: this.favorites.has(id)
                });
            }
        }

        return results.slice(0, options.count || 20);
    }

    /**
     * Cache search results
     */
    cacheSearchResults(query, results) {
        const cacheKey = `search_${query}`;
        this.cache.set(cacheKey, {
            results,
            timestamp: Date.now(),
            ttl: 5 * 60 * 1000 // 5 minutes
        });
    }

    /**
     * Enhanced download with local caching
     */
    async downloadAsset(assetInfo, options = {}) {
        try {
            const assetId = `${assetInfo.library}_${assetInfo.id}`;
            
            // Check local cache first
            if (this.offlineAssets.has(assetId) && !options.forceDownload) {
                return this.getOfflineAsset(assetId);
            }

            // Check memory cache
            if (this.cache.has(assetId) && !options.forceDownload) {
                return this.cache.get(assetId);
            }

            // Download the asset
            const response = await fetch(assetInfo.downloadUrl);
            if (!response.ok) {
                throw new Error(`Download failed: ${response.statusText}`);
            }

            const blob = await response.blob();
            const file = new File([blob], `${assetInfo.name}.${assetInfo.format}`, {
                type: blob.type
            });

            // Cache in memory
            if (options.cache !== false) {
                this.cache.set(assetId, file);
            }

            // Cache locally for offline use
            if (options.saveOffline !== false) {
                await this.saveAssetOffline(assetId, assetInfo, blob);
            }

            return file;
        } catch (error) {
            console.error('Asset download failed:', error);
            throw error;
        }
    }

    /**
     * Save asset to IndexedDB for offline use
     */
    async saveAssetOffline(assetId, assetInfo, blob) {
        if (!this.localCache) return;

        try {
            const transaction = this.localCache.transaction(['assets', 'metadata'], 'readwrite');
            
            // Save asset data
            const assetStore = transaction.objectStore('assets');
            const assetData = {
                id: assetId,
                name: assetInfo.name,
                description: assetInfo.description,
                format: assetInfo.format,
                library: assetInfo.library,
                libraryName: assetInfo.libraryName,
                author: assetInfo.author,
                license: assetInfo.license,
                tags: assetInfo.tags || [],
                downloadDate: new Date().toISOString(),
                blob: blob
            };
            
            await new Promise((resolve, reject) => {
                const request = assetStore.put(assetData);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            // Save metadata
            const metadataStore = transaction.objectStore('metadata');
            const metadata = {
                id: assetId,
                size: blob.size,
                type: blob.type,
                downloadUrl: assetInfo.downloadUrl,
                thumbnail: assetInfo.thumbnail
            };
            
            await new Promise((resolve, reject) => {
                const request = metadataStore.put(metadata);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            // Update offline assets map
            this.offlineAssets.set(assetId, assetData);
            
        } catch (error) {
            console.warn('Failed to save asset offline:', error);
        }
    }

    /**
     * Get offline asset from IndexedDB
     */
    async getOfflineAsset(assetId) {
        const asset = this.offlineAssets.get(assetId);
        if (!asset) return null;

        return new File([asset.blob], `${asset.name}.${asset.format}`, {
            type: asset.blob.type
        });
    }

    /**
     * Add asset to favorites
     */
    addToFavorites(assetInfo) {
        const assetId = `${assetInfo.library}_${assetInfo.id}`;
        this.favorites.add(assetId);
        this.saveFavorites();
    }

    /**
     * Remove asset from favorites
     */
    removeFromFavorites(assetInfo) {
        const assetId = `${assetInfo.library}_${assetInfo.id}`;
        this.favorites.delete(assetId);
        this.saveFavorites();
    }

    /**
     * Get favorites list
     */
    getFavorites() {
        const favorites = [];
        for (const assetId of this.favorites) {
            const asset = this.offlineAssets.get(assetId);
            if (asset) {
                favorites.push({
                    ...asset,
                    isFavorite: true,
                    isOfflineAvailable: true
                });
            }
        }
        return favorites;
    }

    /**
     * Save favorites to localStorage
     */
    saveFavorites() {
        try {
            localStorage.setItem('modelViewer_favorites', JSON.stringify([...this.favorites]));
        } catch (error) {
            console.warn('Failed to save favorites:', error);
        }
    }

    /**
     * Load favorites from localStorage
     */
    loadFavorites() {
        try {
            const saved = localStorage.getItem('modelViewer_favorites');
            if (saved) {
                this.favorites = new Set(JSON.parse(saved));
            }
        } catch (error) {
            console.warn('Failed to load favorites:', error);
        }
    }

    /**
     * Get asset preview/thumbnail
     */
    async getAssetPreview(assetInfo) {
        if (assetInfo.thumbnail) {
            return assetInfo.thumbnail;
        }

        // Generate preview for local assets
        if (assetInfo.isOfflineAvailable) {
            return this.generatePreview(assetInfo);
        }

        return null;
    }

    /**
     * Generate preview for asset
     */
    async generatePreview(assetInfo) {
        // This would generate a thumbnail from the 3D model
        // For now, return a placeholder
        return 'data:image/svg+xml;base64,' + btoa(`
            <svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
                <rect width="200" height="150" fill="#f0f0f0"/>
                <text x="100" y="75" text-anchor="middle" font-family="Arial" font-size="12" fill="#666">
                    ${assetInfo.name}
                </text>
            </svg>
        `);
    }

    /**
     * Get search suggestions
     */
    getSearchSuggestions(query) {
        const suggestions = [];
        
        // Add from search history
        this.searchHistory.forEach(term => {
            if (term.toLowerCase().includes(query.toLowerCase())) {
                suggestions.push({ type: 'history', text: term });
            }
        });

        // Add popular tags
        const popularTags = ['character', 'vehicle', 'building', 'furniture', 'nature', 'weapon'];
        popularTags.forEach(tag => {
            if (tag.toLowerCase().includes(query.toLowerCase())) {
                suggestions.push({ type: 'tag', text: tag });
            }
        });

        return suggestions.slice(0, 5);
    }

    /**
     * Clear download cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Clear offline cache
     */
    async clearOfflineCache() {
        if (!this.localCache) return;

        try {
            const transaction = this.localCache.transaction(['assets', 'metadata', 'thumbnails'], 'readwrite');
            await Promise.all([
                new Promise(resolve => {
                    const request = transaction.objectStore('assets').clear();
                    request.onsuccess = () => resolve();
                }),
                new Promise(resolve => {
                    const request = transaction.objectStore('metadata').clear();
                    request.onsuccess = () => resolve();
                }),
                new Promise(resolve => {
                    const request = transaction.objectStore('thumbnails').clear();
                    request.onsuccess = () => resolve();
                })
            ]);
            
            this.offlineAssets.clear();
        } catch (error) {
            console.warn('Failed to clear offline cache:', error);
        }
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            cachedAssets: this.cache.size,
            offlineAssets: this.offlineAssets.size,
            libraries: this.libraries.size,
            favorites: this.favorites.size,
            searchHistory: this.searchHistory.length
        };
    }

    /**
     * Configure library API keys
     */
    configureLibrary(libraryId, config) {
        const library = this.libraries.get(libraryId);
        if (library) {
            Object.assign(library, config);
        }
    }

    /**
     * Initialize the manager
     */
    async init() {
        try {
            console.log('Loading favorites...');
            this.loadFavorites();
            console.log('Initializing local cache...');
            await this.initializeLocalCache();
            // Silent initialization complete
        } catch (error) {
            console.warn('Failed to fully initialize OnlineLibraryManager:', error);
            // Continue with basic functionality even if IndexedDB fails
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.clearCache();
        this.saveFavorites();
        if (this.localCache) {
            this.localCache.close();
        }
    }
}