import { LODManager } from './LODManager.js';
import { CullingManager } from './CullingManager.js';
import { AdaptiveQualityManager } from './AdaptiveQualityManager.js';
import { MemoryManager } from './MemoryManager.js';
import { ViewportOptimizer } from './ViewportOptimizer.js';

/**
 * PerformanceManager - Central system for managing rendering performance optimizations
 * Coordinates LOD, culling, adaptive quality, memory management, and viewport optimizations
 */
export class PerformanceManager {
    constructor(core, renderer, scene, camera) {
        this.core = core;
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        // Performance monitoring
        this.performanceStats = {
            fps: 60,
            frameTime: 16.67,
            memoryUsage: 0,
            drawCalls: 0,
            triangles: 0,
            lastUpdateTime: 0
        };
        
        // Performance thresholds
        this.thresholds = {
            targetFPS: 60,
            minFPS: 30,
            maxFrameTime: 33.33, // 30 FPS
            maxMemoryMB: 512,
            maxDrawCalls: 1000
        };
        
        // Optimization systems
        this.lodManager = new LODManager(core, scene, camera);
        this.cullingManager = new CullingManager(core, scene, camera);
        this.adaptiveQualityManager = new AdaptiveQualityManager(core, renderer);
        this.memoryManager = new MemoryManager(core);
        this.viewportOptimizer = new ViewportOptimizer(core, renderer, camera);
        
        // Performance monitoring
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fpsHistory = [];
        this.frameTimeHistory = [];
        
        this.enabled = true;
        this.initialized = false;
    }

    /**
     * Initialize the performance management system
     */
    init() {
        if (this.initialized) {
            console.warn('PerformanceManager already initialized');
            return;
        }

        try {
            // Detect device capabilities and adjust thresholds
            this.detectDeviceCapabilities();
            
            // Initialize subsystems
            this.lodManager.init();
            this.cullingManager.init();
            this.adaptiveQualityManager.init();
            this.memoryManager.init();
            this.viewportOptimizer.init();
            
            this.setupEventListeners();
            this.startPerformanceMonitoring();
            
            this.initialized = true;
            this.core.emit('performance:initialized');
            
            // Silent initialization
        } catch (error) {
            console.error('Failed to initialize PerformanceManager:', error);
            throw error;
        }
    }

    /**
     * Detect device capabilities and adjust performance thresholds accordingly
     */
    detectDeviceCapabilities() {
        const deviceInfo = this.analyzeDeviceCapabilities();
        
        // Adjust thresholds based on device tier
        switch (deviceInfo.tier) {
            case 'high':
                this.thresholds = {
                    targetFPS: 60,
                    minFPS: 45,
                    maxFrameTime: 22.22, // 45 FPS
                    maxMemoryMB: 1024,
                    maxDrawCalls: 2000
                };
                break;
                
            case 'medium':
                this.thresholds = {
                    targetFPS: 45,
                    minFPS: 30,
                    maxFrameTime: 33.33, // 30 FPS
                    maxMemoryMB: 512,
                    maxDrawCalls: 1000
                };
                break;
                
            case 'low':
                this.thresholds = {
                    targetFPS: 30,
                    minFPS: 20,
                    maxFrameTime: 50.0, // 20 FPS
                    maxMemoryMB: 256,
                    maxDrawCalls: 500
                };
                break;
        }
        
        console.log(`Device tier: ${deviceInfo.tier}, Performance thresholds adjusted:`, this.thresholds);
        this.core.emit('performance:device_detected', { deviceInfo, thresholds: this.thresholds });
    }

    /**
     * Analyze device capabilities to determine performance tier
     */
    analyzeDeviceCapabilities() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!gl) {
            return { tier: 'low', reason: 'No WebGL support' };
        }
        
        const deviceInfo = {
            renderer: gl.getParameter(gl.RENDERER),
            vendor: gl.getParameter(gl.VENDOR),
            version: gl.getParameter(gl.VERSION),
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
            maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
            maxFragmentUniforms: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
            extensions: gl.getSupportedExtensions(),
            hardwareConcurrency: navigator.hardwareConcurrency || 4,
            deviceMemory: navigator.deviceMemory || 4,
            pixelRatio: window.devicePixelRatio || 1
        };
        
        // Calculate performance score
        let score = 0;
        
        // GPU-based scoring
        const renderer = deviceInfo.renderer.toLowerCase();
        if (renderer.includes('nvidia') || renderer.includes('amd') || renderer.includes('radeon')) {
            if (renderer.includes('rtx') || renderer.includes('rx 6') || renderer.includes('rx 7')) {
                score += 40; // High-end discrete GPU
            } else if (renderer.includes('gtx') || renderer.includes('rx 5')) {
                score += 30; // Mid-range discrete GPU
            } else {
                score += 20; // Entry-level discrete GPU
            }
        } else if (renderer.includes('intel')) {
            if (renderer.includes('iris') || renderer.includes('xe')) {
                score += 25; // Better integrated GPU
            } else {
                score += 15; // Basic integrated GPU
            }
        } else if (renderer.includes('apple') || renderer.includes('m1') || renderer.includes('m2')) {
            score += 35; // Apple Silicon
        } else {
            score += 10; // Unknown/basic GPU
        }
        
        // Memory-based scoring
        if (deviceInfo.deviceMemory >= 8) {
            score += 20;
        } else if (deviceInfo.deviceMemory >= 4) {
            score += 15;
        } else {
            score += 5;
        }
        
        // CPU-based scoring
        if (deviceInfo.hardwareConcurrency >= 8) {
            score += 15;
        } else if (deviceInfo.hardwareConcurrency >= 4) {
            score += 10;
        } else {
            score += 5;
        }
        
        // WebGL capabilities scoring
        if (deviceInfo.maxTextureSize >= 4096) score += 10;
        if (deviceInfo.extensions.includes('EXT_texture_filter_anisotropic')) score += 5;
        if (deviceInfo.extensions.includes('WEBGL_depth_texture')) score += 5;
        if (deviceInfo.extensions.includes('OES_texture_float')) score += 5;
        
        // Determine tier based on score
        let tier;
        if (score >= 70) {
            tier = 'high';
        } else if (score >= 40) {
            tier = 'medium';
        } else {
            tier = 'low';
        }
        
        return { ...deviceInfo, score, tier };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for model changes
        this.core.on('model:loaded', (data) => this.onModelLoaded(data));
        this.core.on('model:removed', () => this.onModelRemoved());
        
        // Listen for camera changes
        this.core.on('camera:moved', () => this.onCameraChanged());
        
        // Listen for viewport changes
        this.core.on('viewport:resized', (data) => this.onViewportResized(data));
        
        // Listen for quality changes
        this.core.on('quality:changed', (data) => this.onQualityChanged(data));
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
            if (!this.enabled) return;
            
            this.updatePerformanceStats();
            this.checkPerformanceThresholds();
            
            requestAnimationFrame(monitor);
        };
        
        requestAnimationFrame(monitor);
    }

    /**
     * Update performance statistics
     */
    updatePerformanceStats() {
        const now = performance.now();
        const deltaTime = now - this.lastTime;
        
        this.frameCount++;
        
        // Update FPS every second
        if (deltaTime >= 1000) {
            const fps = (this.frameCount * 1000) / deltaTime;
            const frameTime = deltaTime / this.frameCount;
            
            this.performanceStats.fps = fps;
            this.performanceStats.frameTime = frameTime;
            this.performanceStats.lastUpdateTime = now;
            
            // Update history
            this.fpsHistory.push(fps);
            this.frameTimeHistory.push(frameTime);
            
            // Keep only last 60 samples (1 minute at 1 sample per second)
            if (this.fpsHistory.length > 60) {
                this.fpsHistory.shift();
                this.frameTimeHistory.shift();
            }
            
            // Update memory usage
            if (performance.memory) {
                this.performanceStats.memoryUsage = performance.memory.usedJSHeapSize / (1024 * 1024);
            }
            
            // Update render stats
            this.performanceStats.drawCalls = this.renderer.info.render.calls;
            this.performanceStats.triangles = this.renderer.info.render.triangles;
            
            this.frameCount = 0;
            this.lastTime = now;
            
            // Emit performance update
            this.core.emit('performance:updated', this.performanceStats);
        }
    }

    /**
     * Check performance thresholds and trigger optimizations
     */
    checkPerformanceThresholds() {
        const stats = this.performanceStats;
        
        // Check FPS threshold
        if (stats.fps < this.thresholds.minFPS) {
            this.triggerPerformanceOptimization('low_fps', {
                currentFPS: stats.fps,
                targetFPS: this.thresholds.targetFPS
            });
        }
        
        // Check frame time threshold
        if (stats.frameTime > this.thresholds.maxFrameTime) {
            this.triggerPerformanceOptimization('high_frame_time', {
                currentFrameTime: stats.frameTime,
                maxFrameTime: this.thresholds.maxFrameTime
            });
        }
        
        // Check memory threshold
        if (stats.memoryUsage > this.thresholds.maxMemoryMB) {
            this.triggerPerformanceOptimization('high_memory', {
                currentMemory: stats.memoryUsage,
                maxMemory: this.thresholds.maxMemoryMB
            });
        }
        
        // Check draw calls threshold
        if (stats.drawCalls > this.thresholds.maxDrawCalls) {
            this.triggerPerformanceOptimization('high_draw_calls', {
                currentDrawCalls: stats.drawCalls,
                maxDrawCalls: this.thresholds.maxDrawCalls
            });
        }
    }

    /**
     * Trigger performance optimization based on issue type
     */
    triggerPerformanceOptimization(issueType, data) {
        console.log(`Performance optimization triggered: ${issueType}`, data);
        
        switch (issueType) {
            case 'low_fps':
            case 'high_frame_time':
                this.adaptiveQualityManager.reduceQuality();
                this.lodManager.increaseLODBias();
                break;
                
            case 'high_memory':
                this.memoryManager.freeUnusedResources();
                this.lodManager.reduceMemoryUsage();
                break;
                
            case 'high_draw_calls':
                this.cullingManager.increaseCullingAggressiveness();
                this.lodManager.reduceLODLevels();
                break;
        }
        
        this.core.emit('performance:optimization_triggered', { issueType, data });
    }

    /**
     * Update all performance systems
     */
    update(deltaTime) {
        if (!this.enabled || !this.initialized) return;
        
        // Update subsystems
        this.lodManager.update(deltaTime);
        this.cullingManager.update(deltaTime);
        this.adaptiveQualityManager.update(deltaTime);
        this.memoryManager.update(deltaTime);
        this.viewportOptimizer.update(deltaTime);
    }

    /**
     * Handle model loaded event
     */
    onModelLoaded(data) {
        const { model } = data;
        
        // Setup LOD for the model
        this.lodManager.setupModelLOD(model);
        
        // Setup culling for the model
        this.cullingManager.setupModelCulling(model);
        
        // Analyze model for memory optimization
        this.memoryManager.analyzeModel(model);
        
        // Optimize viewport for the model
        this.viewportOptimizer.optimizeForModel(model);
        
        console.log('Performance systems configured for loaded model');
    }

    /**
     * Handle model removed event
     */
    onModelRemoved() {
        // Clean up LOD
        this.lodManager.cleanup();
        
        // Clean up culling
        this.cullingManager.cleanup();
        
        // Free memory
        this.memoryManager.freeModelResources();
        
        console.log('Performance systems cleaned up after model removal');
    }

    /**
     * Handle camera changed event
     */
    onCameraChanged() {
        // Update LOD based on camera position
        this.lodManager.updateCameraPosition();
        
        // Update culling based on camera frustum
        this.cullingManager.updateCameraFrustum();
        
        // Update viewport optimization
        this.viewportOptimizer.updateCameraView();
    }

    /**
     * Handle viewport resized event
     */
    onViewportResized(data) {
        const { width, height } = data;
        
        // Update viewport optimizer
        this.viewportOptimizer.onResize(width, height);
        
        // Update adaptive quality based on new viewport size
        this.adaptiveQualityManager.onViewportResize(width, height);
    }

    /**
     * Handle quality changed event
     */
    onQualityChanged(data) {
        const { quality } = data;
        
        // Update all systems based on quality setting
        this.lodManager.setQualityLevel(quality);
        this.cullingManager.setQualityLevel(quality);
        this.adaptiveQualityManager.setBaseQuality(quality);
        this.memoryManager.setQualityLevel(quality);
        this.viewportOptimizer.setQualityLevel(quality);
    }

    /**
     * Get current performance statistics
     */
    getPerformanceStats() {
        return { ...this.performanceStats };
    }

    /**
     * Get performance history
     */
    getPerformanceHistory() {
        return {
            fps: [...this.fpsHistory],
            frameTime: [...this.frameTimeHistory]
        };
    }

    /**
     * Set performance thresholds
     */
    setThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };
        this.core.emit('performance:thresholds_changed', this.thresholds);
    }

    /**
     * Enable/disable performance management
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        
        // Enable/disable subsystems
        this.lodManager.setEnabled(enabled);
        this.cullingManager.setEnabled(enabled);
        this.adaptiveQualityManager.setEnabled(enabled);
        this.memoryManager.setEnabled(enabled);
        this.viewportOptimizer.setEnabled(enabled);
        
        this.core.emit('performance:enabled_changed', enabled);
    }

    /**
     * Get subsystem references
     */
    getLODManager() {
        return this.lodManager;
    }

    getCullingManager() {
        return this.cullingManager;
    }

    getAdaptiveQualityManager() {
        return this.adaptiveQualityManager;
    }

    getMemoryManager() {
        return this.memoryManager;
    }

    getViewportOptimizer() {
        return this.viewportOptimizer;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Destroy subsystems
        if (this.lodManager) {
            this.lodManager.destroy();
        }
        
        if (this.cullingManager) {
            this.cullingManager.destroy();
        }
        
        if (this.adaptiveQualityManager) {
            this.adaptiveQualityManager.destroy();
        }
        
        if (this.memoryManager) {
            this.memoryManager.destroy();
        }
        
        if (this.viewportOptimizer) {
            this.viewportOptimizer.destroy();
        }
        
        this.initialized = false;
        console.log('PerformanceManager destroyed');
    }

    /**
     * Update frame rate manually (for testing)
     */
    updateFrameRate(fps) {
        this.performanceStats.fps = fps;
        this.performanceStats.frameTime = 1000 / fps;
    }

    /**
     * Update memory usage manually (for testing)
     */
    updateMemoryUsage(percentage) {
        this.performanceStats.memoryUsage = percentage * 1024 * 1024; // Convert to bytes
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return {
            fps: this.performanceStats.fps,
            frameTime: this.performanceStats.frameTime,
            memoryUsage: this.performanceStats.memoryUsage,
            drawCalls: this.performanceStats.drawCalls,
            triangles: this.performanceStats.triangles
        };
    }

    /**
     * Detect performance issues
     */
    detectPerformanceIssues() {
        const issues = [];
        
        if (this.performanceStats.fps < this.thresholds.minFPS) {
            issues.push({
                type: 'low_fps',
                severity: this.performanceStats.fps < 10 ? 'high' : 'medium',
                value: this.performanceStats.fps,
                threshold: this.thresholds.minFPS
            });
        }

        if (this.performanceStats.frameTime > this.thresholds.maxFrameTime) {
            issues.push({
                type: 'high_frame_time',
                severity: 'medium',
                value: this.performanceStats.frameTime,
                threshold: this.thresholds.maxFrameTime
            });
        }

        if (this.performanceStats.memoryUsage > this.thresholds.maxMemoryMB * 1024 * 1024) {
            issues.push({
                type: 'high_memory_usage',
                severity: 'high',
                value: this.performanceStats.memoryUsage,
                threshold: this.thresholds.maxMemoryMB * 1024 * 1024
            });
        }

        return issues;
    }

    /**
     * Get recommended optimizations
     */
    getRecommendedOptimizations() {
        const optimizations = [];
        const issues = this.detectPerformanceIssues();

        issues.forEach(issue => {
            switch (issue.type) {
                case 'low_fps':
                case 'high_frame_time':
                    optimizations.push('reduce_quality', 'enable_culling', 'reduce_shadows');
                    break;
                case 'high_memory_usage':
                    optimizations.push('compress_textures', 'reduce_model_detail', 'cleanup_unused');
                    break;
            }
        });

        return [...new Set(optimizations)]; // Remove duplicates
    }

    /**
     * Apply performance optimization
     */
    applyOptimization(optimization) {
        console.log(`Applying optimization: ${optimization}`);
        
        switch (optimization) {
            case 'reduce_quality':
                if (this.adaptiveQualityManager) {
                    this.adaptiveQualityManager.reduceQuality();
                }
                break;
            case 'enable_culling':
                if (this.cullingManager) {
                    this.cullingManager.enableAggressiveCulling();
                }
                break;
            case 'reduce_shadows':
                this.core.emit('performance:reduce-shadows');
                break;
            case 'compress_textures':
                this.core.emit('performance:compress-textures');
                break;
            case 'reduce_model_detail':
                if (this.lodManager) {
                    this.lodManager.increaseLODLevel();
                }
                break;
            case 'cleanup_unused':
                if (this.memoryManager) {
                    this.memoryManager.cleanup();
                }
                break;
            default:
                console.warn(`Unknown optimization: ${optimization}`);
        }
    }
}