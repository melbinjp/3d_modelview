import * as THREE from 'three';

/**
 * TextureManager - Handles efficient texture loading, caching, and material mapping
 */
export class TextureManager {
    constructor(loadingManager, loaderRegistry) {
        this.loadingManager = loadingManager || new THREE.LoadingManager();
        this.loaderRegistry = loaderRegistry;
        this.textureCache = new Map();
        this.materialCache = new Map();
        this.texturePatterns = this.setupTexturePatterns();
        this.compressionSupport = this.detectCompressionSupport();
    }

    /**
     * Setup common texture naming patterns for automatic detection
     */
    setupTexturePatterns() {
        return {
            diffuse: [
                '_diffuse', '_albedo', '_basecolor', '_base_color', '_color', '_col',
                '_diff', '_d', '_bc', '_c'
            ],
            normal: [
                '_normal', '_norm', '_n', '_nrm', '_normalmap', '_bump'
            ],
            roughness: [
                '_roughness', '_rough', '_r', '_rgh'
            ],
            metallic: [
                '_metallic', '_metal', '_met', '_m', '_metalness'
            ],
            specular: [
                '_specular', '_spec', '_s', '_reflection'
            ],
            emission: [
                '_emission', '_emissive', '_emit', '_e', '_glow'
            ],
            ao: [
                '_ao', '_ambient', '_occlusion', '_ambientocclusion'
            ],
            displacement: [
                '_displacement', '_disp', '_height', '_h'
            ],
            opacity: [
                '_opacity', '_alpha', '_transparency', '_trans'
            ]
        };
    }

    /**
     * Detect GPU compression support
     */
    detectCompressionSupport() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            return { s3tc: false, etc1: false, etc2: false, astc: false, bptc: false };
        }

        return {
            s3tc: !!gl.getExtension('WEBGL_compressed_texture_s3tc'),
            etc1: !!gl.getExtension('WEBGL_compressed_texture_etc1'),
            etc2: !!gl.getExtension('WEBGL_compressed_texture_etc'),
            astc: !!gl.getExtension('WEBGL_compressed_texture_astc'),
            bptc: !!gl.getExtension('EXT_texture_compression_bptc')
        };
    }

    /**
     * Load texture with automatic format detection and optimization
     */
    async loadTexture(source, options = {}) {
        const cacheKey = this.generateCacheKey(source, options);
        
        // Check cache first
        if (this.textureCache.has(cacheKey)) {
            return this.textureCache.get(cacheKey).clone();
        }

        try {
            let texture;
            
            if (typeof source === 'string') {
                texture = await this.loadTextureFromUrl(source, options);
            } else if (source instanceof File) {
                texture = await this.loadTextureFromFile(source, options);
            } else {
                throw new Error('Invalid texture source');
            }

            // Apply texture options
            this.applyTextureOptions(texture, options);
            
            // Cache the texture
            this.textureCache.set(cacheKey, texture);
            
            return texture;
            
        } catch (error) {
            console.error('Failed to load texture:', error);
            throw error;
        }
    }

    /**
     * Load texture from URL
     */
    async loadTextureFromUrl(url, options = {}) {
        const extension = this.extractExtension(url);
        const loader = this.loaderRegistry.getLoader(extension);
        
        if (!loader) {
            throw new Error(`Unsupported texture format: ${extension}`);
        }

        return new Promise((resolve, reject) => {
            loader.load(
                url,
                (texture) => resolve(texture),
                undefined,
                (error) => reject(error)
            );
        });
    }

    /**
     * Load texture from file
     */
    async loadTextureFromFile(file, options = {}) {
        const extension = this.extractExtension(file.name);
        const loader = this.loaderRegistry.getLoader(extension);
        
        if (!loader) {
            throw new Error(`Unsupported texture format: ${extension}`);
        }

        const url = URL.createObjectURL(file);
        
        try {
            const texture = await new Promise((resolve, reject) => {
                loader.load(
                    url,
                    (texture) => resolve(texture),
                    undefined,
                    (error) => reject(error)
                );
            });
            
            return texture;
        } finally {
            URL.revokeObjectURL(url);
        }
    }

    /**
     * Automatically detect and load textures from a directory structure
     */
    async detectAndLoadTextures(files, baseName = '') {
        const textureMap = new Map();
        const fileArray = Array.isArray(files) ? files : Array.from(files);
        
        // Group files by potential texture type
        for (const file of fileArray) {
            const fileName = file.name.toLowerCase();
            const extension = this.extractExtension(fileName);
            
            // Skip non-texture files
            if (!this.loaderRegistry.getSupportedTextureFormats().includes(extension)) {
                continue;
            }

            // Detect texture type based on filename patterns
            const textureType = this.detectTextureType(fileName, baseName);
            
            if (textureType) {
                if (!textureMap.has(textureType)) {
                    textureMap.set(textureType, []);
                }
                textureMap.get(textureType).push(file);
            }
        }

        // Load detected textures
        const loadedTextures = new Map();
        
        for (const [textureType, textureFiles] of textureMap.entries()) {
            // Use the first matching file (could be enhanced to choose best quality)
            const textureFile = textureFiles[0];
            
            try {
                const texture = await this.loadTexture(textureFile);
                loadedTextures.set(textureType, texture);
            } catch (error) {
                console.warn(`Failed to load ${textureType} texture:`, error);
            }
        }

        return loadedTextures;
    }

    /**
     * Detect texture type from filename
     */
    detectTextureType(fileName, baseName = '') {
        const normalizedName = fileName.toLowerCase();
        const baseNormalized = baseName.toLowerCase();
        
        // Remove base name and extension for pattern matching
        let nameForMatching = normalizedName;
        if (baseNormalized && normalizedName.includes(baseNormalized)) {
            nameForMatching = normalizedName.replace(baseNormalized, '');
        }
        
        // Remove extension
        nameForMatching = nameForMatching.replace(/\.[^.]+$/, '');

        // Check patterns
        for (const [textureType, patterns] of Object.entries(this.texturePatterns)) {
            for (const pattern of patterns) {
                if (nameForMatching.includes(pattern)) {
                    return textureType;
                }
            }
        }

        // Default to diffuse if no pattern matches but it's a texture file
        return 'diffuse';
    }

    /**
     * Create PBR material from texture map
     */
    createPBRMaterial(textureMap, options = {}) {
        const materialOptions = {
            ...options
        };

        // Apply textures to material
        if (textureMap.has('diffuse')) {
            materialOptions.map = textureMap.get('diffuse');
        }
        
        if (textureMap.has('normal')) {
            materialOptions.normalMap = textureMap.get('normal');
        }
        
        if (textureMap.has('roughness')) {
            materialOptions.roughnessMap = textureMap.get('roughness');
        }
        
        if (textureMap.has('metallic')) {
            materialOptions.metalnessMap = textureMap.get('metallic');
        }
        
        if (textureMap.has('ao')) {
            materialOptions.aoMap = textureMap.get('ao');
        }
        
        if (textureMap.has('emission')) {
            materialOptions.emissiveMap = textureMap.get('emission');
            materialOptions.emissive = new THREE.Color(0xffffff);
        }
        
        if (textureMap.has('displacement')) {
            materialOptions.displacementMap = textureMap.get('displacement');
            materialOptions.displacementScale = options.displacementScale || 0.1;
        }
        
        if (textureMap.has('opacity')) {
            materialOptions.alphaMap = textureMap.get('opacity');
            materialOptions.transparent = true;
        }

        return new THREE.MeshStandardMaterial(materialOptions);
    }

    /**
     * Apply texture options (wrapping, filtering, etc.)
     */
    applyTextureOptions(texture, options = {}) {
        // Wrapping
        texture.wrapS = options.wrapS || THREE.RepeatWrapping;
        texture.wrapT = options.wrapT || THREE.RepeatWrapping;
        
        // Filtering
        texture.magFilter = options.magFilter || THREE.LinearFilter;
        texture.minFilter = options.minFilter || THREE.LinearMipmapLinearFilter;
        
        // Repeat
        if (options.repeat) {
            texture.repeat.set(options.repeat.x || 1, options.repeat.y || 1);
        }
        
        // Offset
        if (options.offset) {
            texture.offset.set(options.offset.x || 0, options.offset.y || 0);
        }
        
        // Rotation
        if (options.rotation !== undefined) {
            texture.rotation = options.rotation;
        }
        
        // Color space
        if (options.colorSpace) {
            texture.colorSpace = options.colorSpace;
        } else {
            // Set appropriate color space based on texture type
            texture.colorSpace = THREE.SRGBColorSpace;
        }
        
        // Generate mipmaps if needed
        if (options.generateMipmaps !== false) {
            texture.generateMipmaps = true;
        }
        
        texture.needsUpdate = true;
    }

    /**
     * Optimize texture for performance
     */
    optimizeTexture(texture, options = {}) {
        const maxSize = options.maxSize || 2048;
        
        // Resize if too large
        if (texture.image && (texture.image.width > maxSize || texture.image.height > maxSize)) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const scale = Math.min(maxSize / texture.image.width, maxSize / texture.image.height);
            canvas.width = texture.image.width * scale;
            canvas.height = texture.image.height * scale;
            
            ctx.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
            
            texture.image = canvas;
            texture.needsUpdate = true;
        }
        
        // Apply compression if supported
        if (options.useCompression && this.compressionSupport.s3tc) {
            // Note: This would require additional processing to convert to compressed format
            console.log('Compression optimization available but not implemented in this version');
        }
        
        return texture;
    }

    /**
     * Generate cache key for texture
     */
    generateCacheKey(source, options = {}) {
        const sourceKey = typeof source === 'string' ? source : source.name + source.size;
        const optionsKey = JSON.stringify(options);
        return `${sourceKey}_${optionsKey}`;
    }

    /**
     * Extract file extension
     */
    extractExtension(filename) {
        if (!filename) return '';
        const parts = filename.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    }

    /**
     * Clear texture cache
     */
    clearCache() {
        // Dispose of cached textures
        for (const texture of this.textureCache.values()) {
            texture.dispose();
        }
        
        this.textureCache.clear();
        this.materialCache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            textureCount: this.textureCache.size,
            materialCount: this.materialCache.size,
            compressionSupport: this.compressionSupport
        };
    }

    /**
     * Preload common texture formats for better performance
     */
    async preloadTextures(textureUrls) {
        const promises = textureUrls.map(url => 
            this.loadTexture(url).catch(error => {
                console.warn(`Failed to preload texture ${url}:`, error);
                return null;
            })
        );
        
        const results = await Promise.all(promises);
        return results.filter(texture => texture !== null);
    }

    /**
     * Create texture from canvas or image data
     */
    createTextureFromData(data, width, height, format = THREE.RGBAFormat, type = THREE.UnsignedByteType) {
        const texture = new THREE.DataTexture(data, width, height, format, type);
        texture.needsUpdate = true;
        return texture;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.clearCache();
    }
}