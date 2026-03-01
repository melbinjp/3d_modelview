/**
 * PerformanceMonitor - Monitors application performance and triggers optimizations
 */
export class PerformanceMonitor {
    constructor(core) {
        this.core = core;
        this.isMonitoring = false;
        this.metrics = {
            fps: 60,
            frameTime: 16.67,
            memoryUsage: 0,
            gpuMemoryUsage: 0,
            renderCalls: 0,
            triangles: 0
        };

        this.thresholds = {
            minFPS: 10, // Very lenient for production
            maxFrameTime: 100, // 10 FPS threshold
            maxMemoryUsage: 1000 * 1024 * 1024, // 1GB
            maxGPUMemoryUsage: 500 * 1024 * 1024, // 500MB
            maxRenderCalls: 2000,
            maxTriangles: 2000000
        };

        this.performanceHistory = [];
        this.maxHistoryLength = 100;
        this.warningCooldown = 60000; // 60 seconds (much less aggressive)
        this.lastWarningTime = 0;

        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fpsUpdateInterval = 2000; // Update FPS every 2 seconds

        // Performance observer references for cleanup
        this.performanceObservers = [];
        this.memoryMonitorInterval = null;
    }

    /**
     * Initialize the performance monitor
     */
    init() {
        this.setupPerformanceObserver();
        this.startMonitoring();
        this.initialized = true;
        this.settings = {
            targetFPS: 60,
            memoryThreshold: 100 * 1024 * 1024, // 100MB
            enabled: true
        };
        console.log('PerformanceMonitor initialized');
    }

    /**
     * Start performance monitoring
     */
    startMonitoring() {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;
        this.lastTime = performance.now();
        this.frameCount = 0;

        // Start monitoring loop
        this.monitoringLoop();

        // Setup memory monitoring
        this.setupMemoryMonitoring();

        // Setup performance observer for long tasks
        this.setupPerformanceObserver();

        // Silent start for production
    }

    /**
     * Stop performance monitoring
     */
    stopMonitoring() {
        this.isMonitoring = false;

        // Clear memory monitoring interval
        if (this.memoryMonitorInterval) {
            clearInterval(this.memoryMonitorInterval);
            this.memoryMonitorInterval = null;
        }

        // Disconnect performance observers
        this.performanceObservers.forEach(observer => {
            try {
                observer.disconnect();
            } catch (error) {
                console.warn('PerformanceMonitor: Error disconnecting observer:', error);
            }
        });
        this.performanceObservers = [];
    }

    /**
     * Main monitoring loop
     */
    monitoringLoop() {
        if (!this.isMonitoring) {
            return;
        }

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;

        this.frameCount++;

        // Update FPS every second
        if (deltaTime >= this.fpsUpdateInterval) {
            this.metrics.fps = (this.frameCount * 1000) / deltaTime;
            this.metrics.frameTime = deltaTime / this.frameCount;

            this.frameCount = 0;
            this.lastTime = currentTime;

            // Update other metrics
            this.updateMetrics();

            // Check performance thresholds
            this.checkPerformanceThresholds();

            // Add to history
            this.addToHistory();
        }

        // Continue monitoring (less frequently to avoid performance impact)
        if (this.isMonitoring) {
            setTimeout(() => this.monitoringLoop(), 100); // Check every 100ms instead of every frame
        }
    }

    /**
     * Update performance metrics
     */
    updateMetrics() {
        try {
            // Get renderer info if available
            const renderingEngine = this.core.getModule('rendering');
            if (renderingEngine && renderingEngine.renderer && renderingEngine.renderer.info) {
                const info = renderingEngine.renderer.info;
                this.metrics.renderCalls = info.render?.calls || 0;
                this.metrics.triangles = info.render?.triangles || 0;
            }

            // Get memory usage
            if (performance.memory) {
                this.metrics.memoryUsage = performance.memory.usedJSHeapSize || 0;
            }

            // Estimate GPU memory usage (approximation)
            this.estimateGPUMemoryUsage();

        } catch (error) {
            console.warn('PerformanceMonitor: Error updating metrics:', error);
        }
    }

    /**
     * Estimate GPU memory usage
     */
    estimateGPUMemoryUsage() {
        try {
            const renderingEngine = this.core.getModule('rendering');
            if (!renderingEngine || !renderingEngine.renderer || !renderingEngine.renderer.info) {
                this.metrics.gpuMemoryUsage = 0;
                return;
            }

            const info = renderingEngine.renderer.info;
            const memory = info.memory || {};

            // Rough estimation based on textures and geometries
            const textureMemory = (memory.textures || 0) * 1024 * 1024; // Assume 1MB per texture
            const geometryMemory = (memory.geometries || 0) * 512 * 1024; // Assume 512KB per geometry

            this.metrics.gpuMemoryUsage = textureMemory + geometryMemory;

        } catch (error) {
            console.warn('PerformanceMonitor: Error estimating GPU memory:', error);
            this.metrics.gpuMemoryUsage = 0;
        }
    }

    /**
     * Check performance thresholds and trigger warnings
     */
    checkPerformanceThresholds() {
        const currentTime = Date.now();

        // Avoid spamming warnings
        if (currentTime - this.lastWarningTime < this.warningCooldown) {
            return;
        }

        let performanceIssues = [];
        let shouldTriggerRecovery = false;

        // Check FPS
        if (this.metrics.fps < this.thresholds.minFPS) {
            const severity = this.metrics.fps < 10 ? 'high' : 'medium';
            performanceIssues.push({
                type: 'low_fps',
                message: `Low FPS detected: ${this.metrics.fps.toFixed(1)}`,
                severity
            });
            if (severity === 'high') shouldTriggerRecovery = true;
        }

        // Check frame time
        if (this.metrics.frameTime > this.thresholds.maxFrameTime) {
            performanceIssues.push({
                type: 'high_frame_time',
                message: `High frame time: ${this.metrics.frameTime.toFixed(2)}ms`,
                severity: 'medium'
            });
        }

        // Check memory usage
        if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
            performanceIssues.push({
                type: 'high_memory_usage',
                message: `High memory usage: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`,
                severity: 'high'
            });
            shouldTriggerRecovery = true;
        }

        // Check GPU memory usage
        if (this.metrics.gpuMemoryUsage > this.thresholds.maxGPUMemoryUsage) {
            performanceIssues.push({
                type: 'high_gpu_memory',
                message: `High GPU memory usage: ${(this.metrics.gpuMemoryUsage / 1024 / 1024).toFixed(1)}MB`,
                severity: 'high'
            });
            shouldTriggerRecovery = true;
        }

        // Check render calls
        if (this.metrics.renderCalls > this.thresholds.maxRenderCalls) {
            performanceIssues.push({
                type: 'high_render_calls',
                message: `High render calls: ${this.metrics.renderCalls}`,
                severity: 'medium'
            });
        }

        // Check triangle count
        if (this.metrics.triangles > this.thresholds.maxTriangles) {
            performanceIssues.push({
                type: 'high_triangle_count',
                message: `High triangle count: ${this.metrics.triangles.toLocaleString()}`,
                severity: 'medium'
            });
        }

        // Emit performance warnings and trigger recovery if needed
        if (performanceIssues.length > 0) {
            this.lastWarningTime = currentTime;

            performanceIssues.forEach(issue => {
                this.core.emit('performance:warning', {
                    ...issue,
                    metrics: { ...this.metrics },
                    timestamp: currentTime
                });
            });

            // Emit general performance degradation event
            this.core.emit('performance:degradation', {
                issues: performanceIssues,
                metrics: { ...this.metrics },
                timestamp: currentTime,
                shouldTriggerRecovery
            });

            // Trigger automatic recovery for critical issues
            if (shouldTriggerRecovery) {
                this.triggerPerformanceRecovery(performanceIssues);
            }
        }
    }

    /**
     * Trigger automatic performance recovery
     */
    async triggerPerformanceRecovery(issues) {
        // Silent automatic recovery

        try {
            // Get performance manager for recovery actions
            const performanceManager = this.core.getModule('performance');

            for (const issue of issues) {
                switch (issue.type) {
                    case 'low_fps':
                    case 'high_frame_time':
                        if (performanceManager?.adaptiveQuality) {
                            await performanceManager.adaptiveQuality.reduceQuality();
                            this.core.emit('performance:quality-reduced', { reason: issue.type });
                        }
                        break;

                    case 'high_memory_usage':
                        if (performanceManager?.memoryManager) {
                            await performanceManager.memoryManager.cleanup();
                            this.core.emit('performance:memory-cleaned', { reason: issue.type });
                        }
                        break;

                    case 'high_gpu_memory':
                        // Reduce texture quality and clear unused resources
                        const renderingEngine = this.core.getModule('rendering');
                        if (renderingEngine) {
                            renderingEngine.onQualityReduced();
                        }
                        break;

                    case 'high_render_calls':
                        // Enable culling and LOD if available
                        if (performanceManager?.cullingManager) {
                            performanceManager.cullingManager.enableAggressiveCulling();
                        }
                        break;
                }
            }

            this.core.emit('performance:recovery-completed', {
                issues: issues.map(i => i.type),
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('PerformanceMonitor: Error during recovery:', error);
            this.core.emit('performance:recovery-failed', {
                error: error.message,
                issues: issues.map(i => i.type)
            });
        }
    }

    /**
     * Setup memory monitoring
     */
    setupMemoryMonitoring() {
        // Clear existing interval if any
        if (this.memoryMonitorInterval) {
            clearInterval(this.memoryMonitorInterval);
        }

        // Monitor memory usage periodically
        this.memoryMonitorInterval = setInterval(() => {
            if (!this.isMonitoring) {
                return;
            }

            if (performance.memory) {
                const memoryInfo = performance.memory;
                const usagePercent = (memoryInfo.usedJSHeapSize / memoryInfo.jsHeapSizeLimit) * 100;

                if (usagePercent > 80) {
                    this.core.emit('memory:warning', {
                        usagePercent,
                        usedMemory: memoryInfo.usedJSHeapSize,
                        totalMemory: memoryInfo.jsHeapSizeLimit,
                        timestamp: Date.now()
                    });
                }
            }
        }, 5000); // Check every 5 seconds
    }

    /**
     * Setup Performance Observer for long task detection
     */
    setupPerformanceObserver() {
        if (typeof PerformanceObserver === 'undefined') {
            console.warn('PerformanceMonitor: PerformanceObserver not supported');
            return;
        }

        try {
            // Observe long tasks that block the main thread
            const longTaskObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    if (entry.duration > 50) { // Tasks longer than 50ms
                        // Silent monitoring - no console output for production

                        this.core.emit('performance:long-task', {
                            duration: entry.duration,
                            startTime: entry.startTime,
                            name: entry.name || 'unknown',
                            timestamp: Date.now()
                        });

                        // If task is extremely long, trigger recovery
                        if (entry.duration > 100) {
                            this.triggerPerformanceRecovery([{
                                type: 'long_task',
                                message: `Long task: ${entry.duration.toFixed(2)}ms`,
                                severity: 'medium'
                            }]);
                        }
                    }
                });
            });

            longTaskObserver.observe({ entryTypes: ['longtask'] });
            this.performanceObservers.push(longTaskObserver);

        } catch (error) {
            console.warn('PerformanceMonitor: Error setting up PerformanceObserver:', error);
        }
    }

    /**
     * Add current metrics to history
     */
    addToHistory() {
        const historyEntry = {
            timestamp: Date.now(),
            metrics: { ...this.metrics }
        };

        this.performanceHistory.unshift(historyEntry);

        // Limit history size
        if (this.performanceHistory.length > this.maxHistoryLength) {
            this.performanceHistory = this.performanceHistory.slice(0, this.maxHistoryLength);
        }
    }

    /**
     * Get current performance metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }

    /**
     * Get performance history
     */
    getHistory() {
        return [...this.performanceHistory];
    }

    /**
     * Get performance statistics
     */
    getStatistics() {
        if (this.performanceHistory.length === 0) {
            return null;
        }

        const recentHistory = this.performanceHistory.slice(0, 30); // Last 30 entries

        const avgFPS = recentHistory.reduce((sum, entry) => sum + entry.metrics.fps, 0) / recentHistory.length;
        const minFPS = Math.min(...recentHistory.map(entry => entry.metrics.fps));
        const maxFPS = Math.max(...recentHistory.map(entry => entry.metrics.fps));

        const avgFrameTime = recentHistory.reduce((sum, entry) => sum + entry.metrics.frameTime, 0) / recentHistory.length;
        const maxFrameTime = Math.max(...recentHistory.map(entry => entry.metrics.frameTime));

        const avgMemory = recentHistory.reduce((sum, entry) => sum + entry.metrics.memoryUsage, 0) / recentHistory.length;
        const maxMemory = Math.max(...recentHistory.map(entry => entry.metrics.memoryUsage));

        return {
            fps: {
                current: this.metrics.fps,
                average: avgFPS,
                min: minFPS,
                max: maxFPS
            },
            frameTime: {
                current: this.metrics.frameTime,
                average: avgFrameTime,
                max: maxFrameTime
            },
            memory: {
                current: this.metrics.memoryUsage,
                average: avgMemory,
                max: maxMemory
            },
            renderCalls: this.metrics.renderCalls,
            triangles: this.metrics.triangles,
            sampleCount: recentHistory.length
        };
    }

    /**
     * Update performance thresholds
     */
    updateThresholds(newThresholds) {
        this.thresholds = { ...this.thresholds, ...newThresholds };

        // Emit event for other modules to react to threshold changes
        this.core.emit('performance:thresholds-updated', {
            oldThresholds: this.thresholds,
            newThresholds: { ...this.thresholds, ...newThresholds },
            timestamp: Date.now()
        });
    }

    /**
     * Reset performance history
     */
    resetHistory() {
        this.performanceHistory = [];

        // Emit event for analytics or debugging purposes
        this.core.emit('performance:history-reset', {
            timestamp: Date.now()
        });
    }

    /**
     * Get real-time performance status
     */
    getPerformanceStatus() {
        return {
            isMonitoring: this.isMonitoring,
            currentMetrics: { ...this.metrics },
            thresholds: { ...this.thresholds },
            lastWarning: this.lastWarningTime,
            historyLength: this.performanceHistory.length,
            grade: this.getPerformanceGrade()
        };
    }

    /**
     * Check if performance is currently acceptable
     */
    isPerformanceAcceptable() {
        return this.metrics.fps >= this.thresholds.minFPS &&
            this.metrics.frameTime <= this.thresholds.maxFrameTime &&
            this.metrics.memoryUsage <= this.thresholds.maxMemoryUsage;
    }

    /**
     * Get performance grade
     */
    getPerformanceGrade() {
        const stats = this.getStatistics();
        if (!stats) {
            return 'unknown';
        }

        let score = 100;

        // Deduct points for low FPS
        if (stats.fps.average < 60) {
            score -= (60 - stats.fps.average) * 2;
        }

        // Deduct points for high frame time
        if (stats.frameTime.average > 16.67) {
            score -= (stats.frameTime.average - 16.67) * 2;
        }

        // Deduct points for high memory usage
        const memoryUsagePercent = (stats.memory.average / this.thresholds.maxMemoryUsage) * 100;
        if (memoryUsagePercent > 50) {
            score -= (memoryUsagePercent - 50);
        }

        // Determine grade
        if (score >= 90) return 'excellent';
        if (score >= 80) return 'good';
        if (score >= 70) return 'fair';
        if (score >= 60) return 'poor';
        return 'critical';
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.stopMonitoring();

        // Clear memory monitoring interval
        if (this.memoryMonitorInterval) {
            clearInterval(this.memoryMonitorInterval);
            this.memoryMonitorInterval = null;
        }

        // Disconnect performance observers
        this.performanceObservers.forEach(observer => {
            try {
                observer.disconnect();
            } catch (error) {
                console.warn('PerformanceMonitor: Error disconnecting observer:', error);
            }
        });
        this.performanceObservers = [];

        this.performanceHistory = [];

        // Emit destruction event for cleanup coordination
        this.core.emit('performance:monitor-destroyed', {
            timestamp: Date.now()
        });
    }

    /**
     * Update frame rate manually (for testing)
     */
    updateFrameRate(fps) {
        this.metrics.fps = fps;
        this.metrics.frameTime = 1000 / fps;
    }

    /**
     * Update memory usage manually (for testing)
     */
    updateMemoryUsage(percentage) {
        if (performance.memory) {
            this.metrics.memoryUsage = (performance.memory.jsHeapSizeLimit * percentage) / 100;
        } else {
            this.metrics.memoryUsage = percentage * 1024 * 1024; // Convert to bytes
        }
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return {
            fps: this.metrics.fps,
            frameTime: this.metrics.frameTime,
            memoryUsage: this.metrics.memoryUsage,
            gpuMemoryUsage: this.metrics.gpuMemoryUsage,
            renderCalls: this.metrics.renderCalls,
            triangles: this.metrics.triangles
        };
    }

    /**
     * Detect performance issues
     */
    detectPerformanceIssues() {
        const issues = [];
        
        if (this.metrics.fps < this.thresholds.minFPS) {
            issues.push({
                type: 'low_fps',
                severity: this.metrics.fps < 10 ? 'high' : 'medium',
                value: this.metrics.fps,
                threshold: this.thresholds.minFPS
            });
        }

        if (this.metrics.frameTime > this.thresholds.maxFrameTime) {
            issues.push({
                type: 'high_frame_time',
                severity: 'medium',
                value: this.metrics.frameTime,
                threshold: this.thresholds.maxFrameTime
            });
        }

        if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
            issues.push({
                type: 'high_memory_usage',
                severity: 'high',
                value: this.metrics.memoryUsage,
                threshold: this.thresholds.maxMemoryUsage
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
                this.core.emit('performance:reduce-quality');
                break;
            case 'enable_culling':
                this.core.emit('performance:enable-culling');
                break;
            case 'reduce_shadows':
                this.core.emit('performance:reduce-shadows');
                break;
            case 'compress_textures':
                this.core.emit('performance:compress-textures');
                break;
            case 'reduce_model_detail':
                this.core.emit('performance:reduce-model-detail');
                break;
            case 'cleanup_unused':
                this.core.emit('performance:cleanup-unused');
                break;
            default:
                console.warn(`Unknown optimization: ${optimization}`);
        }
    }
}