import * as THREE from 'three';

/**
 * ViewportOptimizer - Implements viewport-aware rendering optimizations
 * Adjusts rendering settings based on viewport size and camera view
 */
export class ViewportOptimizer {
    constructor(core, renderer, camera) {
        this.core = core;
        this.renderer = renderer;
        this.camera = camera;
        
        // Viewport configuration
        this.config = {
            enabled: true,
            adaptivePixelRatio: true,
            dynamicResolution: true,
            viewportCulling: true,
            distanceBasedLOD: true,
            adaptiveShadows: true,
            minPixelRatio: 0.5,
            maxPixelRatio: 2.0,
            resolutionSteps: [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
        };
        
        // Viewport state
        this.viewportSize = { width: 0, height: 0 };
        this.pixelRatio = 1.0;
        this.currentResolution = 1.0;
        this.lastCameraPosition = new THREE.Vector3();
        this.lastCameraTarget = new THREE.Vector3();
        
        // Performance tracking
        this.performanceHistory = [];
        this.frameTimeHistory = [];
        this.lastOptimization = 0;
        
        // Optimization thresholds
        this.thresholds = {
            targetFrameTime: 16.67, // 60 FPS
            maxFrameTime: 33.33,    // 30 FPS
            minFrameTime: 8.33,     // 120 FPS
            optimizationInterval: 1000 // 1 second
        };
        
        this.initialized = false;
    }

    /**
     * Initialize the viewport optimizer
     */
    init() {
        if (this.initialized) {
            console.warn('ViewportOptimizer already initialized');
            return;
        }

        this.setupEventListeners();
        this.updateViewportInfo();
        this.startPerformanceMonitoring();
        this.initialized = true;
        
        // Silent initialization
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for viewport changes
        this.core.on('viewport:resized', (data) => this.onResize(data.width, data.height));
        
        // Listen for camera changes
        this.core.on('camera:moved', () => this.onCameraChanged());
        
        // Listen for performance updates
        this.core.on('performance:updated', (stats) => this.onPerformanceUpdate(stats));
    }

    /**
     * Start performance monitoring for viewport optimization
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
            this.evaluateViewportOptimizations();
            
            requestAnimationFrame(monitor);
        };
        
        requestAnimationFrame(monitor);
    }

    /**
     * Update performance metrics
     */
    updatePerformanceMetrics() {
        const now = performance.now();
        
        // Track frame times
        if (this.frameTimeHistory.length > 0) {
            const lastFrameTime = this.frameTimeHistory[this.frameTimeHistory.length - 1];
            const frameTime = now - lastFrameTime;
            
            this.performanceHistory.push({
                frameTime,
                timestamp: now,
                resolution: this.currentResolution,
                pixelRatio: this.pixelRatio
            });
            
            // Keep only last 60 frames
            if (this.performanceHistory.length > 60) {
                this.performanceHistory.shift();
            }
        }
        
        this.frameTimeHistory.push(now);
        if (this.frameTimeHistory.length > 60) {
            this.frameTimeHistory.shift();
        }
    }

    /**
     * Evaluate viewport optimizations
     */
    evaluateViewportOptimizations() {
        const now = performance.now();
        
        // Only optimize periodically
        if (now - this.lastOptimization < this.thresholds.optimizationInterval) {
            return;
        }
        
        if (this.performanceHistory.length < 10) return;
        
        // Calculate average frame time
        const recentFrames = this.performanceHistory.slice(-10);
        const avgFrameTime = recentFrames.reduce((sum, frame) => sum + frame.frameTime, 0) / recentFrames.length;
        
        // Determine if optimization is needed
        if (avgFrameTime > this.thresholds.maxFrameTime) {
            this.reduceViewportQuality();
        } else if (avgFrameTime < this.thresholds.minFrameTime) {
            this.increaseViewportQuality();
        }
        
        this.lastOptimization = now;
    }

    /**
     * Reduce viewport quality for better performance
     */
    reduceViewportQuality() {
        let optimized = false;
        
        // Reduce resolution
        if (this.config.dynamicResolution) {
            const currentIndex = this.config.resolutionSteps.indexOf(this.currentResolution);
            if (currentIndex > 0) {
                this.currentResolution = this.config.resolutionSteps[currentIndex - 1];
                this.applyResolution();
                optimized = true;
            }
        }
        
        // Reduce pixel ratio
        if (!optimized && this.config.adaptivePixelRatio) {
            if (this.pixelRatio > this.config.minPixelRatio) {
                this.pixelRatio = Math.max(this.config.minPixelRatio, this.pixelRatio * 0.8);
                this.applyPixelRatio();
                optimized = true;
            }
        }
        
        if (optimized) {
            // Silent quality reduction
            this.core.emit('viewport:quality_reduced', {
                resolution: this.currentResolution,
                pixelRatio: this.pixelRatio
            });
        }
    }

    /**
     * Increase viewport quality for better visuals
     */
    increaseViewportQuality() {
        let optimized = false;
        
        // Increase resolution
        if (this.config.dynamicResolution) {
            const currentIndex = this.config.resolutionSteps.indexOf(this.currentResolution);
            if (currentIndex < this.config.resolutionSteps.length - 1) {
                this.currentResolution = this.config.resolutionSteps[currentIndex + 1];
                this.applyResolution();
                optimized = true;
            }
        }
        
        // Increase pixel ratio
        if (!optimized && this.config.adaptivePixelRatio) {
            const maxPixelRatio = Math.min(this.config.maxPixelRatio, window.devicePixelRatio);
            if (this.pixelRatio < maxPixelRatio) {
                this.pixelRatio = Math.min(maxPixelRatio, this.pixelRatio * 1.2);
                this.applyPixelRatio();
                optimized = true;
            }
        }
        
        if (optimized) {
            console.log(`Viewport quality increased: resolution=${this.currentResolution}, pixelRatio=${this.pixelRatio.toFixed(2)}`);
            this.core.emit('viewport:quality_increased', {
                resolution: this.currentResolution,
                pixelRatio: this.pixelRatio
            });
        }
    }

    /**
     * Apply resolution changes
     */
    applyResolution() {
        const width = Math.floor(this.viewportSize.width * this.currentResolution);
        const height = Math.floor(this.viewportSize.height * this.currentResolution);
        
        this.renderer.setSize(width, height, false);
        
        // Update camera aspect ratio
        if (this.camera.isPerspectiveCamera) {
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
        }
    }

    /**
     * Apply pixel ratio changes
     */
    applyPixelRatio() {
        this.renderer.setPixelRatio(this.pixelRatio);
    }

    /**
     * Update viewport information
     */
    updateViewportInfo() {
        const canvas = this.renderer.domElement;
        if (!canvas) {
            // Fallback for testing environment
            this.viewportSize.width = 800;
            this.viewportSize.height = 600;
            return;
        }
        this.viewportSize.width = canvas.clientWidth || 800;
        this.viewportSize.height = canvas.clientHeight || 600;
        
        // Calculate optimal pixel ratio based on viewport size
        const pixelCount = this.viewportSize.width * this.viewportSize.height;
        
        if (pixelCount > 2073600) { // > 1920x1080
            this.pixelRatio = Math.min(1.0, window.devicePixelRatio);
        } else if (pixelCount > 921600) { // > 1280x720
            this.pixelRatio = Math.min(1.5, window.devicePixelRatio);
        } else {
            this.pixelRatio = Math.min(2.0, window.devicePixelRatio);
        }
        
        this.applyPixelRatio();
    }

    /**
     * Optimize for a specific model
     */
    optimizeForModel(model) {
        if (!this.config.enabled) return;
        
        // Calculate model bounds
        const boundingBox = new THREE.Box3().setFromObject(model);
        const size = boundingBox.getSize(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z);
        
        // Adjust camera settings based on model size
        if (this.camera.isPerspectiveCamera) {
            // Adjust near/far planes for better depth precision
            const distance = this.camera.position.distanceTo(boundingBox.getCenter(new THREE.Vector3()));
            
            this.camera.near = Math.max(0.1, distance - maxDimension * 2);
            this.camera.far = distance + maxDimension * 2;
            this.camera.updateProjectionMatrix();
        }
        
        // Optimize shadow settings based on model size
        if (this.config.adaptiveShadows) {
            this.optimizeShadowsForModel(model, maxDimension);
        }
        
        console.log(`Viewport optimized for model (size: ${maxDimension.toFixed(2)})`);
    }

    /**
     * Optimize shadow settings for a model
     */
    optimizeShadowsForModel(model, modelSize) {
        const scene = this.core.getModule('rendering')?.scene;
        if (!scene) return;
        
        scene.traverse((object) => {
            if (object.isLight && object.shadow) {
                // Adjust shadow camera based on model size
                if (object.shadow.camera.isOrthographicCamera) {
                    const size = modelSize * 1.5;
                    object.shadow.camera.left = -size;
                    object.shadow.camera.right = size;
                    object.shadow.camera.top = size;
                    object.shadow.camera.bottom = -size;
                    object.shadow.camera.updateProjectionMatrix();
                }
                
                // Adjust shadow map size based on viewport
                const pixelCount = this.viewportSize.width * this.viewportSize.height;
                let shadowMapSize = 1024;
                
                if (pixelCount > 2073600) {
                    shadowMapSize = 2048;
                } else if (pixelCount < 921600) {
                    shadowMapSize = 512;
                }
                
                object.shadow.mapSize.width = shadowMapSize;
                object.shadow.mapSize.height = shadowMapSize;
                
                // Dispose old shadow map
                if (object.shadow.map) {
                    object.shadow.map.dispose();
                    object.shadow.map = null;
                }
            }
        });
    }

    /**
     * Handle viewport resize
     */
    onResize(width, height) {
        this.viewportSize.width = width;
        this.viewportSize.height = height;
        
        this.updateViewportInfo();
        this.applyResolution();
        
        console.log(`Viewport resized: ${width}x${height}`);
    }

    /**
     * Handle camera changes
     */
    onCameraChanged() {
        // Update camera-based optimizations
        this.updateCameraView();
    }

    /**
     * Update camera view optimizations
     */
    updateCameraView() {
        const currentPosition = this.camera.position.clone();
        const currentTarget = new THREE.Vector3();
        
        if (this.camera.getWorldDirection) {
            currentTarget.copy(currentPosition).add(this.camera.getWorldDirection(new THREE.Vector3()));
        }
        
        // Check if camera moved significantly
        const positionDelta = currentPosition.distanceTo(this.lastCameraPosition);
        const targetDelta = currentTarget.distanceTo(this.lastCameraTarget);
        
        if (positionDelta > 1.0 || targetDelta > 1.0) {
            // Camera moved significantly, update optimizations
            this.optimizeForCameraView();
            
            this.lastCameraPosition.copy(currentPosition);
            this.lastCameraTarget.copy(currentTarget);
        }
    }

    /**
     * Optimize for current camera view
     */
    optimizeForCameraView() {
        // Adjust LOD bias based on camera distance to objects
        const lodManager = this.core.getModule('performance')?.getLODManager();
        if (lodManager) {
            // This would be implemented based on camera distance to scene center
        }
        
        // Adjust culling aggressiveness based on camera movement speed
        const cullingManager = this.core.getModule('performance')?.getCullingManager();
        if (cullingManager) {
            // This would be implemented based on camera movement patterns
        }
    }

    /**
     * Handle performance updates
     */
    onPerformanceUpdate(stats) {
        // Additional viewport optimizations based on performance stats
        if (stats.fps < 30 && this.currentResolution > 0.5) {
            this.reduceViewportQuality();
        }
    }

    /**
     * Set quality level
     */
    setQualityLevel(quality) {
        switch (quality) {
            case 'low':
                this.currentResolution = 0.5;
                this.pixelRatio = 0.5;
                break;
            case 'medium':
                this.currentResolution = 0.75;
                this.pixelRatio = 1.0;
                break;
            case 'high':
                this.currentResolution = 1.0;
                this.pixelRatio = 1.5;
                break;
            case 'ultra':
                this.currentResolution = 1.0;
                this.pixelRatio = 2.0;
                break;
        }
        
        this.applyResolution();
        this.applyPixelRatio();
    }

    /**
     * Get viewport statistics
     */
    getStats() {
        const avgFrameTime = this.performanceHistory.length > 0
            ? this.performanceHistory.reduce((sum, frame) => sum + frame.frameTime, 0) / this.performanceHistory.length
            : 0;
        
        return {
            viewportSize: { ...this.viewportSize },
            currentResolution: this.currentResolution,
            pixelRatio: this.pixelRatio,
            averageFrameTime: avgFrameTime,
            performanceHistory: this.performanceHistory.length
        };
    }

    /**
     * Enable/disable viewport optimization
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
        
        if (!enabled) {
            // Reset to default settings
            this.currentResolution = 1.0;
            this.pixelRatio = window.devicePixelRatio;
            this.applyResolution();
            this.applyPixelRatio();
        }
    }

    /**
     * Update viewport optimizer
     */
    update(deltaTime) {
        if (!this.config.enabled || !this.initialized) return;
        
        // Update camera view optimizations
        this.updateCameraView();
    }

    /**
     * Destroy viewport optimizer
     */
    destroy() {
        this.performanceHistory = [];
        this.frameTimeHistory = [];
        this.initialized = false;
        console.log('ViewportOptimizer destroyed');
    }
}