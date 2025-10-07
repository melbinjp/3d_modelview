import * as THREE from 'three';

/**
 * MemoryManager - Manages memory usage with texture compression and model optimization
 * Monitors memory usage and automatically frees unused resources
 */
export class MemoryManager {
    constructor(core) {
        this.core = core;
        
        // Memory configuration
        this.config = {
            enabled: true,
            maxMemoryMB: 512,
            warningThresholdMB: 400,
            cleanupIntervalMs: 30000, // 30 seconds
            textureCompressionEnabled: true,
            geometryOptimizationEnabled: true,
            autoDisposeUnused: true,
            maxUnusedTime: 60000 // 1 minute
        };
        
        // Memory tracking
        this.memoryStats = {
            totalUsage: 0,
            textureMemory: 0,
            geometryMemory: 0,
            lastCleanup: 0,
            peakUsage: 0
        };
        
        // Resource tracking
        this.trackedTextures = new Map(); // texture -> { size, lastUsed, refCount }
        this.trackedGeometries = new Map(); // geometry -> { size, lastUsed, refCount }
        this.trackedMaterials = new Map(); // material -> { lastUsed, refCount }
        this.disposedResources = new Set();
        
        // Compression cache
        this.compressedTextures = new Map(); // original -> compressed
        this.optimizedGeometries = new Map(); // original -> optimized
        
        // Cleanup timer
        this.cleanupTimer = null;
        
        this.initialized = false;
    }

    /**
     * Initialize the memory manager
     */
    init() {
        if (this.initialized) {
            console.warn('MemoryManager already initialized');
            return;
        }

        this.startMemoryMonitoring();
        this.startPeriodicCleanup();
        this.setupEventListeners();
        this.initialized = true;
        
        // Silent initialization
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for model loading
        this.core.on('model:loaded', (data) => this.onModelLoaded(data));
        
        // Listen for model removal
        this.core.on('model:removed', () => this.onModelRemoved());
        
        // Listen for performance issues
        this.core.on('performance:optimization_triggered', (data) => {
            if (data.issueType === 'high_memory') {
                this.freeUnusedResources();
            }
        });
    }

    /**
     * Start memory monitoring
     */
    startMemoryMonitoring() {
        // Skip monitoring in test environment
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
            return;
        }
        
        const monitor = () => {
            if (!this.config.enabled) {
                setTimeout(monitor, 5000);
                return;
            }
            
            this.updateMemoryStats();
            this.checkMemoryThresholds();
            
            setTimeout(monitor, 5000); // Check every 5 seconds
        };
        
        setTimeout(monitor, 1000);
    }

    /**
     * Start periodic cleanup
     */
    startPeriodicCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        
        this.cleanupTimer = setInterval(() => {
            if (this.config.enabled && this.config.autoDisposeUnused) {
                this.cleanupUnusedResources();
            }
        }, this.config.cleanupIntervalMs);
    }

    /**
     * Update memory statistics
     */
    updateMemoryStats() {
        let totalMemory = 0;
        let textureMemory = 0;
        let geometryMemory = 0;
        
        // Calculate texture memory
        this.trackedTextures.forEach((info, texture) => {
            if (!this.disposedResources.has(texture)) {
                textureMemory += info.size;
            }
        });
        
        // Calculate geometry memory
        this.trackedGeometries.forEach((info, geometry) => {
            if (!this.disposedResources.has(geometry)) {
                geometryMemory += info.size;
            }
        });
        
        totalMemory = textureMemory + geometryMemory;
        
        // Update stats
        this.memoryStats.totalUsage = totalMemory;
        this.memoryStats.textureMemory = textureMemory;
        this.memoryStats.geometryMemory = geometryMemory;
        this.memoryStats.peakUsage = Math.max(this.memoryStats.peakUsage, totalMemory);
        
        // Add browser memory if available
        if (performance.memory) {
            this.memoryStats.browserMemory = performance.memory.usedJSHeapSize / (1024 * 1024);
        }
        
        // Emit memory update
        this.core.emit('memory:updated', this.memoryStats);
    }

    /**
     * Check memory thresholds and trigger cleanup if needed
     */
    checkMemoryThresholds() {
        const totalMB = this.memoryStats.totalUsage / (1024 * 1024);
        
        if (totalMB > this.config.maxMemoryMB) {
            console.warn(`Memory usage exceeded limit: ${totalMB.toFixed(1)}MB > ${this.config.maxMemoryMB}MB`);
            this.triggerEmergencyCleanup();
            this.core.emit('memory:limit_exceeded', { usage: totalMB, limit: this.config.maxMemoryMB });
        } else if (totalMB > this.config.warningThresholdMB) {
            console.warn(`Memory usage approaching limit: ${totalMB.toFixed(1)}MB`);
            this.freeUnusedResources();
            this.core.emit('memory:warning', { usage: totalMB, threshold: this.config.warningThresholdMB });
        }
    }

    /**
     * Trigger emergency cleanup when memory limit is exceeded
     */
    triggerEmergencyCleanup() {
        console.log('Triggering emergency memory cleanup...');
        
        // Immediate cleanup of unused resources
        this.freeUnusedResources();
        
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
            console.log('Forced garbage collection');
        }
        
        // More aggressive cleanup - reduce reference time threshold
        const originalMaxUnusedTime = this.config.maxUnusedTime;
        this.config.maxUnusedTime = 10000; // 10 seconds instead of 1 minute
        
        setTimeout(() => {
            this.freeUnusedResources();
            this.config.maxUnusedTime = originalMaxUnusedTime; // Restore original threshold
        }, 1000);
        
        // Emit emergency cleanup event
        this.core.emit('memory:emergency_cleanup', { 
            timestamp: Date.now(),
            memoryUsage: this.memoryStats.totalUsage / (1024 * 1024)
        });
    }

    /**
     * Analyze a model for memory optimization
     */
    analyzeModel(model) {
        if (!this.config.enabled) return;
        
        model.traverse((child) => {
            if (child.isMesh) {
                // Track geometry
                if (child.geometry) {
                    this.trackGeometry(child.geometry);
                }
                
                // Track materials and textures
                if (child.material) {
                    this.trackMaterial(child.material);
                    
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => this.trackMaterialTextures(mat));
                    } else {
                        this.trackMaterialTextures(child.material);
                    }
                }
            }
        });
        
        console.log('Model analyzed for memory optimization');
    }

    /**
     * Track geometry memory usage
     */
    trackGeometry(geometry) {
        if (this.trackedGeometries.has(geometry)) {
            const info = this.trackedGeometries.get(geometry);
            info.refCount++;
            info.lastUsed = Date.now();
            return;
        }
        
        // Calculate geometry memory usage
        let size = 0;
        
        // Position attribute
        if (geometry.attributes.position) {
            size += geometry.attributes.position.array.byteLength;
        }
        
        // Normal attribute
        if (geometry.attributes.normal) {
            size += geometry.attributes.normal.array.byteLength;
        }
        
        // UV attribute
        if (geometry.attributes.uv) {
            size += geometry.attributes.uv.array.byteLength;
        }
        
        // Index
        if (geometry.index) {
            size += geometry.index.array.byteLength;
        }
        
        // Other attributes
        Object.keys(geometry.attributes).forEach(key => {
            if (key !== 'position' && key !== 'normal' && key !== 'uv') {
                size += geometry.attributes[key].array.byteLength;
            }
        });
        
        this.trackedGeometries.set(geometry, {
            size,
            lastUsed: Date.now(),
            refCount: 1
        });
    }

    /**
     * Track material
     */
    trackMaterial(material) {
        if (this.trackedMaterials.has(material)) {
            const info = this.trackedMaterials.get(material);
            info.refCount++;
            info.lastUsed = Date.now();
            return;
        }
        
        this.trackedMaterials.set(material, {
            lastUsed: Date.now(),
            refCount: 1
        });
    }

    /**
     * Track textures in a material
     */
    trackMaterialTextures(material) {
        const textureProperties = [
            'map', 'normalMap', 'roughnessMap', 'metalnessMap', 
            'emissiveMap', 'bumpMap', 'displacementMap', 'alphaMap',
            'lightMap', 'aoMap', 'envMap'
        ];
        
        textureProperties.forEach(prop => {
            if (material[prop] && material[prop].isTexture) {
                this.trackTexture(material[prop]);
            }
        });
    }

    /**
     * Track texture memory usage
     */
    trackTexture(texture) {
        if (this.trackedTextures.has(texture)) {
            const info = this.trackedTextures.get(texture);
            info.refCount++;
            info.lastUsed = Date.now();
            return;
        }
        
        // Calculate texture memory usage
        let size = 0;
        
        if (texture.image) {
            const width = texture.image.width || 0;
            const height = texture.image.height || 0;
            const channels = 4; // Assume RGBA
            const bytesPerChannel = 1; // Assume 8-bit
            
            size = width * height * channels * bytesPerChannel;
            
            // Account for mipmaps
            if (texture.generateMipmaps) {
                size *= 1.33; // Approximate mipmap overhead
            }
        }
        
        this.trackedTextures.set(texture, {
            size,
            lastUsed: Date.now(),
            refCount: 1
        });
        
        // Compress texture if enabled
        if (this.config.textureCompressionEnabled) {
            this.compressTexture(texture);
        }
    }

    /**
     * Compress a texture to reduce memory usage
     */
    compressTexture(texture) {
        if (this.compressedTextures.has(texture)) return;
        
        // Skip if texture is already compressed
        if (texture.format === THREE.RGB_S3TC_DXT1_Format || 
            texture.format === THREE.RGBA_S3TC_DXT5_Format) {
            return;
        }
        
        // For now, we'll implement basic compression by reducing resolution
        // In a production system, you might want to use proper texture compression
        if (texture.image && texture.image.width > 512) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            const newWidth = Math.max(512, texture.image.width / 2);
            const newHeight = Math.max(512, texture.image.height / 2);
            
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            ctx.drawImage(texture.image, 0, 0, newWidth, newHeight);
            
            const compressedTexture = texture.clone();
            compressedTexture.image = canvas;
            compressedTexture.needsUpdate = true;
            
            this.compressedTextures.set(texture, compressedTexture);
            
            console.log(`Texture compressed: ${texture.image.width}x${texture.image.height} -> ${newWidth}x${newHeight}`);
        }
    }

    /**
     * Optimize geometry to reduce memory usage
     */
    optimizeGeometry(geometry) {
        if (this.optimizedGeometries.has(geometry)) {
            return this.optimizedGeometries.get(geometry);
        }
        
        if (!this.config.geometryOptimizationEnabled) return geometry;
        
        const optimized = geometry.clone();
        
        // Remove unused attributes
        const requiredAttributes = ['position', 'normal', 'uv'];
        Object.keys(optimized.attributes).forEach(key => {
            if (!requiredAttributes.includes(key)) {
                optimized.deleteAttribute(key);
            }
        });
        
        // Merge vertices if possible
        if (!optimized.index) {
            optimized.mergeVertices();
        }
        
        // Compute bounding box and sphere for culling
        optimized.computeBoundingBox();
        optimized.computeBoundingSphere();
        
        this.optimizedGeometries.set(geometry, optimized);
        
        console.log('Geometry optimized for memory usage');
        return optimized;
    }

    /**
     * Free unused resources
     */
    freeUnusedResources() {
        const now = Date.now();
        let freedMemory = 0;
        
        // Free unused textures
        this.trackedTextures.forEach((info, texture) => {
            if (info.refCount === 0 && now - info.lastUsed > this.config.maxUnusedTime) {
                texture.dispose();
                this.disposedResources.add(texture);
                this.trackedTextures.delete(texture);
                freedMemory += info.size;
            }
        });
        
        // Free unused geometries
        this.trackedGeometries.forEach((info, geometry) => {
            if (info.refCount === 0 && now - info.lastUsed > this.config.maxUnusedTime) {
                geometry.dispose();
                this.disposedResources.add(geometry);
                this.trackedGeometries.delete(geometry);
                freedMemory += info.size;
            }
        });
        
        // Free unused materials
        this.trackedMaterials.forEach((info, material) => {
            if (info.refCount === 0 && now - info.lastUsed > this.config.maxUnusedTime) {
                material.dispose();
                this.disposedResources.add(material);
                this.trackedMaterials.delete(material);
            }
        });
        
        if (freedMemory > 0) {
            console.log(`Freed ${(freedMemory / (1024 * 1024)).toFixed(2)}MB of unused resources`);
            this.core.emit('memory:resources_freed', { freedMemory });
        }
        
        this.memoryStats.lastCleanup = now;
    }

    /**
     * Cleanup unused resources (called periodically)
     */
    cleanupUnusedResources() {
        this.freeUnusedResources();
        
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
    }

    /**
     * Free resources for a specific model
     */
    freeModelResources() {
        // Decrease reference counts for all tracked resources
        // This would typically be called when a model is removed
        this.trackedTextures.forEach((info) => {
            info.refCount = Math.max(0, info.refCount - 1);
        });
        
        this.trackedGeometries.forEach((info) => {
            info.refCount = Math.max(0, info.refCount - 1);
        });
        
        this.trackedMaterials.forEach((info) => {
            info.refCount = Math.max(0, info.refCount - 1);
        });
        
        // Trigger cleanup
        this.freeUnusedResources();
    }

    /**
     * Handle model loaded event
     */
    onModelLoaded(data) {
        this.analyzeModel(data.model);
    }

    /**
     * Handle model removed event
     */
    onModelRemoved() {
        this.freeModelResources();
    }

    /**
     * Set quality level
     */
    setQualityLevel(quality) {
        switch (quality) {
            case 'low':
                this.config.maxMemoryMB = 256;
                this.config.textureCompressionEnabled = true;
                this.config.geometryOptimizationEnabled = true;
                break;
            case 'medium':
                this.config.maxMemoryMB = 512;
                this.config.textureCompressionEnabled = true;
                this.config.geometryOptimizationEnabled = true;
                break;
            case 'high':
                this.config.maxMemoryMB = 1024;
                this.config.textureCompressionEnabled = false;
                this.config.geometryOptimizationEnabled = false;
                break;
            case 'ultra':
                this.config.maxMemoryMB = 2048;
                this.config.textureCompressionEnabled = false;
                this.config.geometryOptimizationEnabled = false;
                break;
        }
    }

    /**
     * Get memory statistics
     */
    getStats() {
        return {
            ...this.memoryStats,
            trackedTextures: this.trackedTextures.size,
            trackedGeometries: this.trackedGeometries.size,
            trackedMaterials: this.trackedMaterials.size,
            disposedResources: this.disposedResources.size,
            compressedTextures: this.compressedTextures.size,
            optimizedGeometries: this.optimizedGeometries.size
        };
    }

    /**
     * Enable/disable memory management
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
        
        if (enabled) {
            this.startPeriodicCleanup();
        } else if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }

    /**
     * Update memory manager
     */
    update() {
        if (!this.config.enabled || !this.initialized) return;
        
        // Update memory stats periodically
        // The main monitoring is done via setTimeout in startMemoryMonitoring
    }

    /**
     * Destroy memory manager
     */
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        
        // Clear all tracking
        this.trackedTextures.clear();
        this.trackedGeometries.clear();
        this.trackedMaterials.clear();
        this.disposedResources.clear();
        this.compressedTextures.clear();
        this.optimizedGeometries.clear();
        
        this.initialized = false;
        console.log('MemoryManager destroyed');
    }
}