import * as THREE from 'three';

/**
 * AdaptiveQualityManager - Automatically adjusts rendering quality based on performance
 * Monitors FPS and adjusts various quality settings to maintain target performance
 */
export class AdaptiveQualityManager {
    constructor(core, renderer) {
        this.core = core;
        this.renderer = renderer;
        
        // Quality configuration
        this.config = {
            enabled: true,
            targetFPS: 60,
            minFPS: 30,
            maxFPS: 120,
            adaptationSpeed: 0.1, // How quickly to adapt (0-1)
            stabilityThreshold: 5, // Frames to wait before adapting
            qualityLevels: {
                ultra: {
                    pixelRatio: 2.0,
                    shadowMapSize: 4096,
                    antialias: true,
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.0,
                    postProcessing: true,
                    maxLights: 8
                },
                high: {
                    pixelRatio: 1.5,
                    shadowMapSize: 2048,
                    antialias: true,
                    toneMapping: THREE.ACESFilmicToneMapping,
                    toneMappingExposure: 1.0,
                    postProcessing: true,
                    maxLights: 6
                },
                medium: {
                    pixelRatio: 1.0,
                    shadowMapSize: 1024,
                    antialias: true,
                    toneMapping: THREE.LinearToneMapping,
                    toneMappingExposure: 1.0,
                    postProcessing: false,
                    maxLights: 4
                },
                low: {
                    pixelRatio: 0.75,
                    shadowMapSize: 512,
                    antialias: false,
                    toneMapping: THREE.LinearToneMapping,
                    toneMappingExposure: 1.0,
                    postProcessing: false,
                    maxLights: 2
                },
                potato: {
                    pixelRatio: 0.5,
                    shadowMapSize: 256,
                    antialias: false,
                    toneMapping: THREE.NoToneMapping,
                    toneMappingExposure: 1.0,
                    postProcessing: false,
                    maxLights: 1
                }
            }
        };
        
        // Current state
        this.currentQuality = 'high';
        this.baseQuality = 'high'; // User-set base quality
        this.targetQuality = 'high';
        
        // Performance monitoring
        this.performanceHistory = [];
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.stableFrameCount = 0;
        this.lastQualityChange = 0;
        
        // Quality transition
        this.isTransitioning = false;
        this.transitionProgress = 0;
        
        this.initialized = false;
    }

    /**
     * Initialize the adaptive quality manager
     */
    init() {
        if (this.initialized) {
            console.warn('AdaptiveQualityManager already initialized');
            return;
        }

        this.applyQualitySettings(this.currentQuality);
        this.setupEventListeners();
        this.startPerformanceMonitoring();
        this.initialized = true;
        
        // Silent initialization
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for performance updates
        this.core.on('performance:updated', (stats) => this.onPerformanceUpdate(stats));
        
        // Listen for viewport changes
        this.core.on('viewport:resized', (data) => this.onViewportResize(data.width, data.height));
        
        // Listen for user quality changes
        this.core.on('settings:quality_changed', (quality) => this.setBaseQuality(quality));
    }

    /**
     * Start performance monitoring
     */
    startPerformanceMonitoring() {
        // Skip monitoring in test environment
        if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
            return;
        }
        
        const monitor = () => {
            if (!this.config.enabled) {
                requestAnimationFrame(monitor);
                return;
            }
            
            this.updatePerformanceMetrics();
            this.evaluateQualityAdjustment();
            
            requestAnimationFrame(monitor);
        };
        
        requestAnimationFrame(monitor);
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics() {
        const now = performance.now();
        const deltaTime = now - this.lastTime;
        
        this.frameCount++;
        
        // Calculate FPS every second
        if (deltaTime >= 1000) {
            const fps = (this.frameCount * 1000) / deltaTime;
            
            // Add to performance history
            this.performanceHistory.push({
                fps,
                timestamp: now,
                quality: this.currentQuality
            });
            
            // Keep only last 30 seconds of data
            const cutoffTime = now - 30000;
            this.performanceHistory = this.performanceHistory.filter(
                entry => entry.timestamp > cutoffTime
            );
            
            this.frameCount = 0;
            this.lastTime = now;
        }
    }

    /**
     * Evaluate if quality adjustment is needed
     */
    evaluateQualityAdjustment() {
        if (this.performanceHistory.length < 3) return; // Need some history
        
        const recentPerformance = this.performanceHistory.slice(-3);
        const averageFPS = recentPerformance.reduce((sum, entry) => sum + entry.fps, 0) / recentPerformance.length;
        
        // Determine target quality based on performance
        let targetQuality = this.currentQuality;
        
        if (averageFPS < this.config.minFPS) {
            // Performance is poor, reduce quality
            targetQuality = this.getLowerQuality(this.currentQuality);
            this.stableFrameCount = 0;
        } else if (averageFPS > this.config.targetFPS * 1.2) {
            // Performance is good, potentially increase quality
            this.stableFrameCount++;
            
            // Only increase quality if performance has been stable
            if (this.stableFrameCount >= this.config.stabilityThreshold) {
                const higherQuality = this.getHigherQuality(this.currentQuality);
                if (higherQuality !== this.currentQuality && this.canIncreaseQuality(higherQuality)) {
                    targetQuality = higherQuality;
                    this.stableFrameCount = 0;
                }
            }
        } else {
            // Performance is acceptable, maintain current quality
            this.stableFrameCount++;
        }
        
        // Apply quality change if needed
        if (targetQuality !== this.currentQuality) {
            this.changeQuality(targetQuality);
        }
    }

    /**
     * Check if we can increase quality without exceeding base quality
     */
    canIncreaseQuality(targetQuality) {
        const qualityLevels = Object.keys(this.config.qualityLevels);
        const currentIndex = qualityLevels.indexOf(this.currentQuality);
        const targetIndex = qualityLevels.indexOf(targetQuality);
        const baseIndex = qualityLevels.indexOf(this.baseQuality);
        
        // Don't exceed user-set base quality
        return targetIndex <= baseIndex;
    }

    /**
     * Get lower quality level
     */
    getLowerQuality(currentQuality) {
        const qualityLevels = Object.keys(this.config.qualityLevels);
        const currentIndex = qualityLevels.indexOf(currentQuality);
        
        if (currentIndex < qualityLevels.length - 1) {
            return qualityLevels[currentIndex + 1];
        }
        
        return currentQuality; // Already at lowest quality
    }

    /**
     * Get higher quality level
     */
    getHigherQuality(currentQuality) {
        const qualityLevels = Object.keys(this.config.qualityLevels);
        const currentIndex = qualityLevels.indexOf(currentQuality);
        
        if (currentIndex > 0) {
            return qualityLevels[currentIndex - 1];
        }
        
        return currentQuality; // Already at highest quality
    }

    /**
     * Change quality level
     */
    changeQuality(newQuality) {
        if (newQuality === this.currentQuality) return;
        
        const now = performance.now();
        
        // Prevent too frequent quality changes
        if (now - this.lastQualityChange < 2000) return; // Wait at least 2 seconds
        
        console.log(`Adaptive quality change: ${this.currentQuality} -> ${newQuality}`);
        
        this.currentQuality = newQuality;
        this.lastQualityChange = now;
        
        this.applyQualitySettings(newQuality);
        
        this.core.emit('adaptive_quality:changed', {
            from: this.currentQuality,
            to: newQuality,
            reason: 'performance_adaptation'
        });
    }

    /**
     * Apply quality settings to renderer
     */
    applyQualitySettings(quality) {
        const settings = this.config.qualityLevels[quality];
        if (!settings) {
            console.warn(`Unknown quality level: ${quality}`);
            return;
        }
        
        // Apply pixel ratio
        if (this.renderer && typeof this.renderer.setPixelRatio === 'function') {
            this.renderer.setPixelRatio(Math.min(settings.pixelRatio, window.devicePixelRatio));
        }
        
        // Apply shadow map settings
        if (this.renderer.shadowMap) {
            this.renderer.shadowMap.enabled = settings.shadowMapSize > 0;
            if (settings.shadowMapSize > 0) {
                // Update shadow map size for all lights
                this.updateShadowMapSizes(settings.shadowMapSize);
            }
        }
        
        // Apply tone mapping
        this.renderer.toneMapping = settings.toneMapping;
        this.renderer.toneMappingExposure = settings.toneMappingExposure;
        
        // Apply post-processing settings
        this.updatePostProcessingSettings(settings.postProcessing);
        
        // Apply lighting limits
        this.updateLightingSettings(settings.maxLights);
        
        // Force re-render
        this.core.emit('rendering:quality_changed', { quality, settings });
    }

    /**
     * Update shadow map sizes for all lights
     */
    updateShadowMapSizes(size) {
        const scene = this.core.getModule('rendering')?.scene;
        if (!scene) return;
        
        scene.traverse((object) => {
            if (object.isLight && object.shadow) {
                object.shadow.mapSize.width = size;
                object.shadow.mapSize.height = size;
                object.shadow.map?.dispose();
                object.shadow.map = null;
            }
        });
    }

    /**
     * Update post-processing settings
     */
    updatePostProcessingSettings(enabled) {
        try {
            const postProcessingManager = this.core.getModule('postProcessing');
            if (postProcessingManager && typeof postProcessingManager.setEnabled === 'function') {
                postProcessingManager.setEnabled(enabled);
            } else if (postProcessingManager) {
                // Fallback: directly set the property if method doesn't exist
                postProcessingManager.postProcessingEnabled = enabled;
            }
        } catch (error) {
            console.warn('Failed to update post-processing settings:', error.message);
        }
    }

    /**
     * Update lighting settings
     */
    updateLightingSettings(maxLights) {
        const scene = this.core.getModule('rendering')?.scene;
        if (!scene) return;
        
        let lightCount = 0;
        scene.traverse((object) => {
            if (object.isLight && object.type !== 'AmbientLight') {
                lightCount++;
                object.visible = lightCount <= maxLights;
            }
        });
    }

    /**
     * Handle performance update
     */
    onPerformanceUpdate(stats) {
        // Additional performance-based adjustments can be made here
        if (stats.memoryUsage > 400) { // High memory usage
            this.reduceQuality();
        }
    }

    /**
     * Handle viewport resize
     */
    onViewportResize(width, height) {
        const pixelCount = width * height;
        
        // Adjust quality based on viewport size
        if (pixelCount > 2073600) { // 1920x1080
            // Large viewport, might need to reduce quality
            if (this.currentQuality === 'ultra') {
                this.changeQuality('high');
            }
        } else if (pixelCount < 921600) { // 1280x720
            // Small viewport, can potentially increase quality
            const higherQuality = this.getHigherQuality(this.currentQuality);
            if (this.canIncreaseQuality(higherQuality)) {
                this.changeQuality(higherQuality);
            }
        }
    }

    /**
     * Reduce quality (called by performance manager)
     */
    reduceQuality() {
        const lowerQuality = this.getLowerQuality(this.currentQuality);
        if (lowerQuality !== this.currentQuality) {
            this.changeQuality(lowerQuality);
        }
    }

    /**
     * Increase quality (called by performance manager)
     */
    increaseQuality() {
        const higherQuality = this.getHigherQuality(this.currentQuality);
        if (higherQuality !== this.currentQuality && this.canIncreaseQuality(higherQuality)) {
            this.changeQuality(higherQuality);
        }
    }

    /**
     * Set base quality level (user preference)
     */
    setBaseQuality(quality) {
        this.baseQuality = quality;
        
        // If current quality is higher than base, reduce it
        const qualityLevels = Object.keys(this.config.qualityLevels);
        const currentIndex = qualityLevels.indexOf(this.currentQuality);
        const baseIndex = qualityLevels.indexOf(this.baseQuality);
        
        if (currentIndex < baseIndex) {
            this.changeQuality(this.baseQuality);
        }
        
        console.log(`Base quality set to: ${quality}`);
    }

    /**
     * Get current quality level
     */
    getCurrentQuality() {
        return this.currentQuality;
    }

    /**
     * Get quality statistics
     */
    getStats() {
        const recentPerformance = this.performanceHistory.slice(-10);
        const averageFPS = recentPerformance.length > 0 
            ? recentPerformance.reduce((sum, entry) => sum + entry.fps, 0) / recentPerformance.length 
            : 0;
        
        return {
            currentQuality: this.currentQuality,
            baseQuality: this.baseQuality,
            averageFPS: averageFPS,
            performanceHistory: this.performanceHistory.length,
            stableFrameCount: this.stableFrameCount,
            lastQualityChange: this.lastQualityChange
        };
    }

    /**
     * Enable/disable adaptive quality
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
        
        if (!enabled) {
            // Reset to base quality
            this.changeQuality(this.baseQuality);
        }
        
        console.log(`Adaptive quality ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Set target FPS
     */
    setTargetFPS(fps) {
        this.config.targetFPS = Math.max(30, Math.min(120, fps));
        console.log(`Target FPS set to: ${this.config.targetFPS}`);
    }

    /**
     * Update the adaptive quality system
     */
    update(deltaTime) {
        if (!this.config.enabled || !this.initialized) return;
        
        // Update transition animations if needed
        if (this.isTransitioning) {
            this.updateTransition(deltaTime);
        }
    }

    /**
     * Update quality transition animation
     */
    updateTransition(deltaTime) {
        this.transitionProgress += deltaTime * 2; // 0.5 second transition
        
        if (this.transitionProgress >= 1.0) {
            this.transitionProgress = 1.0;
            this.isTransitioning = false;
        }
        
        // Apply interpolated settings during transition
        // This could be used for smooth quality transitions in the future
    }

    /**
     * Destroy adaptive quality manager
     */
    destroy() {
        this.performanceHistory = [];
        this.initialized = false;
        console.log('AdaptiveQualityManager destroyed');
    }
}