/**
 * ErrorManager - Comprehensive error handling and recovery system
 * Provides error classification, graceful degradation, and user-friendly error reporting
 */
export class ErrorManager {
    static ERROR_TYPES = {
        // WebGL and rendering errors
        WEBGL_CONTEXT_LOST: 'webgl_context_lost',
        WEBGL_NOT_SUPPORTED: 'webgl_not_supported',
        WEBGL_CONTEXT_CREATION_FAILED: 'webgl_context_creation_failed',
        SHADER_COMPILATION_FAILED: 'shader_compilation_failed',
        TEXTURE_LOAD_FAILED: 'texture_load_failed',
        
        // Asset loading errors
        ASSET_LOAD_FAILED: 'asset_load_failed',
        UNSUPPORTED_FORMAT: 'unsupported_format',
        CORRUPTED_FILE: 'corrupted_file',
        FILE_TOO_LARGE: 'file_too_large',
        NETWORK_ERROR: 'network_error',
        
        // Memory and performance errors
        MEMORY_ERROR: 'memory_error',
        OUT_OF_MEMORY: 'out_of_memory',
        PERFORMANCE_DEGRADATION: 'performance_degradation',
        GPU_MEMORY_EXHAUSTED: 'gpu_memory_exhausted',
        
        // Export and system errors
        EXPORT_ERROR: 'export_error',
        FILESYSTEM_ERROR: 'filesystem_error',
        PERMISSION_DENIED: 'permission_denied',
        
        // Audio and cinematic errors
        AUDIO_CONTEXT_ERROR: 'audio_context_error',
        AUDIO_DECODE_ERROR: 'audio_decode_error',
        CINEMATIC_SEQUENCE_ERROR: 'cinematic_sequence_error',
        
        // Generic errors
        UNKNOWN_ERROR: 'unknown_error',
        INITIALIZATION_ERROR: 'initialization_error',
        MODULE_ERROR: 'module_error'
    };

    static ERROR_SEVERITY = {
        LOW: 'low',           // Minor issues, app continues normally
        MEDIUM: 'medium',     // Some features may be disabled
        HIGH: 'high',         // Major functionality affected
        CRITICAL: 'critical'  // App may not function properly
    };

    constructor(core) {
        this.core = core;
        this.errorHistory = [];
        this.errorCounts = new Map();
        this.recoveryStrategies = new Map();
        this.userNotifications = [];
        this.analyticsEnabled = false;
        this.maxErrorHistory = 100;
        
        this.setupRecoveryStrategies();
        this.setupGlobalErrorHandlers();
    }

    /**
     * Initialize error manager
     */
    init() {
        this.initialized = true;
        this.core.on('webgl:context-lost', (data) => {
            this.handleError(new Error('WebGL context lost'), {
                type: ErrorManager.ERROR_TYPES.WEBGL_CONTEXT_LOST,
                severity: ErrorManager.ERROR_SEVERITY.HIGH,
                context: data
            });
        });

        this.core.on('performance:degradation', (data) => {
            this.handleError(new Error('Performance degradation detected'), {
                type: ErrorManager.ERROR_TYPES.PERFORMANCE_DEGRADATION,
                severity: ErrorManager.ERROR_SEVERITY.MEDIUM,
                context: data
            });
        });

        this.core.on('memory:warning', (data) => {
            this.handleError(new Error('Memory usage warning'), {
                type: ErrorManager.ERROR_TYPES.MEMORY_ERROR,
                severity: ErrorManager.ERROR_SEVERITY.MEDIUM,
                context: data
            });
        });
    }

    /**
     * Setup global error handlers
     */
    setupGlobalErrorHandlers() {
        // Handle unhandled JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError(event.error || new Error(event.message), {
                type: ErrorManager.ERROR_TYPES.UNKNOWN_ERROR,
                severity: ErrorManager.ERROR_SEVERITY.MEDIUM,
                context: {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                }
            });
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, {
                type: ErrorManager.ERROR_TYPES.UNKNOWN_ERROR,
                severity: ErrorManager.ERROR_SEVERITY.MEDIUM,
                context: { promise: true }
            });
        });

        // Handle WebGL context loss
        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener('webglcontextlost', (event) => {
                event.preventDefault();
                this.handleError(new Error('WebGL context lost'), {
                    type: ErrorManager.ERROR_TYPES.WEBGL_CONTEXT_LOST,
                    severity: ErrorManager.ERROR_SEVERITY.HIGH
                });
            });
        }
    }

    /**
     * Setup recovery strategies for different error types
     */
    setupRecoveryStrategies() {
        // WebGL recovery strategies
        this.recoveryStrategies.set(ErrorManager.ERROR_TYPES.WEBGL_CONTEXT_LOST, {
            autoRecover: true,
            strategy: async (error, context) => {
                const renderingEngine = this.core.getModule('rendering');
                if (renderingEngine && renderingEngine.restoreContext) {
                    return await renderingEngine.restoreContext();
                }
                return false;
            },
            fallback: () => {
                this.showUserMessage('WebGL context was lost. Attempting to restore...', 'warning');
                this.core.emit('error:webgl-fallback');
            }
        });

        this.recoveryStrategies.set(ErrorManager.ERROR_TYPES.WEBGL_NOT_SUPPORTED, {
            autoRecover: false,
            strategy: null,
            fallback: () => {
                this.showUserMessage(
                    'WebGL is not supported in your browser. Please use a modern browser with WebGL support.',
                    'error'
                );
                this.core.emit('error:webgl-not-supported');
            }
        });

        // Memory recovery strategies
        this.recoveryStrategies.set(ErrorManager.ERROR_TYPES.MEMORY_ERROR, {
            autoRecover: true,
            strategy: async (error, context) => {
                const performanceManager = this.core.getModule('performance');
                if (performanceManager) {
                    await performanceManager.reduceMemoryUsage();
                    return true;
                }
                return false;
            },
            fallback: () => {
                this.showUserMessage('Memory usage is high. Reducing quality to maintain performance.', 'warning');
            }
        });

        // Performance recovery strategies
        this.recoveryStrategies.set(ErrorManager.ERROR_TYPES.PERFORMANCE_DEGRADATION, {
            autoRecover: true,
            strategy: async (error, context) => {
                const performanceManager = this.core.getModule('performance');
                if (performanceManager && performanceManager.adaptiveQuality) {
                    await performanceManager.adaptiveQuality.reduceQuality();
                    return true;
                }
                return false;
            },
            fallback: () => {
                this.showUserMessage('Performance issues detected. Automatically reducing quality.', 'info');
            }
        });

        // Asset loading recovery strategies
        this.recoveryStrategies.set(ErrorManager.ERROR_TYPES.ASSET_LOAD_FAILED, {
            autoRecover: false,
            strategy: null,
            fallback: (error, context) => {
                const filename = context?.filename || 'Unknown file';
                this.showUserMessage(
                    `Failed to load ${filename}. Please check the file format and try again.`,
                    'error'
                );
            }
        });

        this.recoveryStrategies.set(ErrorManager.ERROR_TYPES.UNSUPPORTED_FORMAT, {
            autoRecover: false,
            strategy: null,
            fallback: (error, context) => {
                const format = context?.format || 'unknown';
                const supportedFormats = 'GLB, GLTF, FBX, OBJ, DAE, STL, PLY';
                this.showUserMessage(
                    `Format "${format}" is not supported. Supported formats: ${supportedFormats}`,
                    'error'
                );
            }
        });
    }

    /**
     * Main error handling method
     */
    async handleError(error, options = {}) {
        const errorInfo = {
            id: this.generateErrorId(),
            timestamp: new Date().toISOString(),
            message: error.message || 'Unknown error',
            stack: error.stack,
            type: options.type || ErrorManager.ERROR_TYPES.UNKNOWN_ERROR,
            severity: options.severity || ErrorManager.ERROR_SEVERITY.MEDIUM,
            context: options.context || {},
            recovered: false,
            userNotified: false
        };

        // Add to error history
        this.addToHistory(errorInfo);

        // Update error counts
        this.updateErrorCounts(errorInfo.type);

        // Log error
        this.logError(errorInfo);

        // Attempt recovery
        const recovered = await this.attemptRecovery(errorInfo);
        errorInfo.recovered = recovered;

        // Notify user if not recovered or if critical
        if (!recovered || errorInfo.severity === ErrorManager.ERROR_SEVERITY.CRITICAL) {
            this.notifyUser(errorInfo);
            errorInfo.userNotified = true;
        }

        // Report to analytics if enabled
        if (this.analyticsEnabled) {
            this.reportToAnalytics(errorInfo);
        }

        // Emit error event
        this.core.emit('error:handled', errorInfo);

        return errorInfo;
    }

    /**
     * Attempt to recover from an error
     */
    async attemptRecovery(errorInfo) {
        const strategy = this.recoveryStrategies.get(errorInfo.type);
        
        if (!strategy) {
            return false;
        }

        try {
            if (strategy.autoRecover && strategy.strategy) {
                const recovered = await strategy.strategy(errorInfo, errorInfo.context);
                if (recovered) {
                    this.logRecovery(errorInfo);
                    return true;
                }
            }

            // Execute fallback strategy
            if (strategy.fallback) {
                strategy.fallback(errorInfo, errorInfo.context);
            }

            return false;
        } catch (recoveryError) {
            console.error('Error during recovery attempt:', recoveryError);
            return false;
        }
    }

    /**
     * Show user-friendly error message
     */
    showUserMessage(message, type = 'info', duration = 5000) {
        const notification = {
            id: this.generateErrorId(),
            message,
            type, // 'info', 'warning', 'error', 'success'
            timestamp: Date.now(),
            duration
        };

        this.userNotifications.push(notification);
        this.core.emit('error:user-notification', notification);

        // Auto-remove notification after duration
        if (duration > 0) {
            setTimeout(() => {
                this.removeUserNotification(notification.id);
            }, duration);
        }

        return notification.id;
    }

    /**
     * Remove user notification
     */
    removeUserNotification(id) {
        const index = this.userNotifications.findIndex(n => n.id === id);
        if (index > -1) {
            const notification = this.userNotifications.splice(index, 1)[0];
            this.core.emit('error:notification-removed', notification);
        }
    }

    /**
     * Get user-friendly error message with recovery suggestions
     */
    getUserFriendlyMessage(errorInfo) {
        const messages = {
            [ErrorManager.ERROR_TYPES.WEBGL_CONTEXT_LOST]: {
                message: 'Graphics context was lost. This can happen when switching between applications or due to driver issues.',
                suggestions: [
                    'The application will attempt to restore automatically',
                    'If problems persist, try refreshing the page',
                    'Update your graphics drivers if the issue continues'
                ]
            },
            [ErrorManager.ERROR_TYPES.WEBGL_NOT_SUPPORTED]: {
                message: 'Your browser does not support WebGL, which is required for 3D graphics.',
                suggestions: [
                    'Use a modern browser like Chrome, Firefox, Safari, or Edge',
                    'Enable hardware acceleration in your browser settings',
                    'Update your browser to the latest version'
                ]
            },
            [ErrorManager.ERROR_TYPES.MEMORY_ERROR]: {
                message: 'The application is using too much memory.',
                suggestions: [
                    'Quality has been automatically reduced to free up memory',
                    'Try loading smaller models or fewer models at once',
                    'Close other browser tabs to free up system memory'
                ]
            },
            [ErrorManager.ERROR_TYPES.ASSET_LOAD_FAILED]: {
                message: 'Failed to load the 3D model or asset.',
                suggestions: [
                    'Check that the file is not corrupted',
                    'Ensure you have a stable internet connection',
                    'Try loading the file again',
                    'Verify the file format is supported'
                ]
            },
            [ErrorManager.ERROR_TYPES.UNSUPPORTED_FORMAT]: {
                message: 'The file format is not supported.',
                suggestions: [
                    'Supported formats: GLB, GLTF, FBX, OBJ, DAE, STL, PLY, 3DS, X3D, USD',
                    'Convert your file to a supported format',
                    'Check that the file extension matches the actual format'
                ]
            },
            [ErrorManager.ERROR_TYPES.PERFORMANCE_DEGRADATION]: {
                message: 'Performance issues detected.',
                suggestions: [
                    'Quality has been automatically reduced',
                    'Try loading smaller or simpler models',
                    'Close other applications to free up system resources',
                    'Consider using a device with better graphics capabilities'
                ]
            }
        };

        const errorMessage = messages[errorInfo.type] || {
            message: 'An unexpected error occurred.',
            suggestions: [
                'Try refreshing the page',
                'Check your internet connection',
                'Contact support if the problem persists'
            ]
        };

        return {
            ...errorMessage,
            technicalDetails: errorInfo.message,
            errorId: errorInfo.id,
            timestamp: errorInfo.timestamp
        };
    }

    /**
     * Add error to history
     */
    addToHistory(errorInfo) {
        this.errorHistory.unshift(errorInfo);
        
        // Limit history size
        if (this.errorHistory.length > this.maxErrorHistory) {
            this.errorHistory = this.errorHistory.slice(0, this.maxErrorHistory);
        }
    }

    /**
     * Update error counts for analytics
     */
    updateErrorCounts(errorType) {
        const count = this.errorCounts.get(errorType) || 0;
        this.errorCounts.set(errorType, count + 1);
    }

    /**
     * Log error to console with appropriate level
     */
    logError(errorInfo) {
        // Skip console logging for performance-related warnings in production
        if (errorInfo.type === 'performance_degradation' || 
            errorInfo.type === 'memory_error' ||
            errorInfo.severity === ErrorManager.ERROR_SEVERITY.LOW) {
            return; // Silent for production
        }
        
        const logMessage = `[${errorInfo.severity.toUpperCase()}] ${errorInfo.type}: ${errorInfo.message}`;
        
        switch (errorInfo.severity) {
            case ErrorManager.ERROR_SEVERITY.MEDIUM:
                // Only log medium errors that are not performance-related
                if (!errorInfo.type.includes('performance')) {
                    console.warn(logMessage, errorInfo);
                }
                break;
            case ErrorManager.ERROR_SEVERITY.HIGH:
            case ErrorManager.ERROR_SEVERITY.CRITICAL:
                console.error(logMessage, errorInfo);
                break;
            default:
                // Silent for other cases
                break;
        }
    }

    /**
     * Log successful recovery
     */
    logRecovery(errorInfo) {
        console.info(`[RECOVERY] Successfully recovered from ${errorInfo.type}`, errorInfo);
    }

    /**
     * Notify user about error
     */
    notifyUser(errorInfo) {
        const userMessage = this.getUserFriendlyMessage(errorInfo);
        const messageType = this.getSeverityMessageType(errorInfo.severity);
        
        this.showUserMessage(userMessage.message, messageType);
    }

    /**
     * Convert error severity to message type
     */
    getSeverityMessageType(severity) {
        switch (severity) {
            case ErrorManager.ERROR_SEVERITY.LOW:
                return 'info';
            case ErrorManager.ERROR_SEVERITY.MEDIUM:
                return 'warning';
            case ErrorManager.ERROR_SEVERITY.HIGH:
            case ErrorManager.ERROR_SEVERITY.CRITICAL:
                return 'error';
            default:
                return 'info';
        }
    }

    /**
     * Report error to analytics system
     */
    reportToAnalytics(errorInfo) {
        if (!this.analyticsEnabled) {
            return;
        }

        // This would integrate with your analytics service
        // For now, we'll just emit an event that can be caught by analytics modules
        this.core.emit('analytics:error', {
            type: errorInfo.type,
            severity: errorInfo.severity,
            message: errorInfo.message,
            context: errorInfo.context,
            recovered: errorInfo.recovered,
            timestamp: errorInfo.timestamp,
            userAgent: navigator.userAgent,
            url: window.location.href
        });
    }

    /**
     * Generate unique error ID
     */
    generateErrorId() {
        return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get error statistics
     */
    getErrorStatistics() {
        const totalErrors = this.errorHistory.length;
        const errorsByType = Object.fromEntries(this.errorCounts);
        const errorsBySeverity = {};
        const recentErrors = this.errorHistory.slice(0, 10);

        // Count errors by severity
        this.errorHistory.forEach(error => {
            errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
        });

        return {
            totalErrors,
            errorsByType,
            errorsBySeverity,
            recentErrors,
            recoveryRate: this.calculateRecoveryRate()
        };
    }

    /**
     * Calculate recovery rate
     */
    calculateRecoveryRate() {
        if (this.errorHistory.length === 0) {
            return 0;
        }

        const recoveredErrors = this.errorHistory.filter(error => error.recovered).length;
        return (recoveredErrors / this.errorHistory.length) * 100;
    }

    /**
     * Enable or disable analytics reporting
     */
    setAnalyticsEnabled(enabled) {
        this.analyticsEnabled = enabled;
    }

    /**
     * Clear error history
     */
    clearHistory() {
        this.errorHistory = [];
        this.errorCounts.clear();
        this.core.emit('error:history-cleared');
    }

    /**
     * Get current user notifications
     */
    getUserNotifications() {
        return [...this.userNotifications];
    }

    /**
     * Classify error based on type and context
     */
    classifyError(error, context = {}) {
        if (!error) return { type: ErrorManager.ERROR_TYPES.UNKNOWN_ERROR, severity: ErrorManager.ERROR_SEVERITY.LOW };

        const message = error.message || error.toString();
        
        // WebGL errors
        if (message.includes('WebGL') || message.includes('webgl')) {
            if (message.includes('context lost')) {
                return { type: ErrorManager.ERROR_TYPES.WEBGL_CONTEXT_LOST, severity: ErrorManager.ERROR_SEVERITY.HIGH };
            }
            if (message.includes('not supported')) {
                return { type: ErrorManager.ERROR_TYPES.WEBGL_NOT_SUPPORTED, severity: ErrorManager.ERROR_SEVERITY.CRITICAL };
            }
            return { type: ErrorManager.ERROR_TYPES.WEBGL_CONTEXT_CREATION_FAILED, severity: ErrorManager.ERROR_SEVERITY.HIGH };
        }

        // Memory errors
        if (message.includes('memory') || message.includes('Memory')) {
            return { type: ErrorManager.ERROR_TYPES.MEMORY_ERROR, severity: ErrorManager.ERROR_SEVERITY.HIGH };
        }

        // Network errors
        if (message.includes('network') || message.includes('fetch') || message.includes('NetworkError')) {
            return { type: ErrorManager.ERROR_TYPES.NETWORK_ERROR, severity: ErrorManager.ERROR_SEVERITY.MEDIUM };
        }

        // File errors
        if (message.includes('file') || message.includes('File')) {
            if (message.includes('too large')) {
                return { type: ErrorManager.ERROR_TYPES.FILE_TOO_LARGE, severity: ErrorManager.ERROR_SEVERITY.HIGH };
            }
            if (message.includes('format') || message.includes('unsupported')) {
                return { type: ErrorManager.ERROR_TYPES.UNSUPPORTED_FORMAT, severity: ErrorManager.ERROR_SEVERITY.MEDIUM };
            }
            return { type: ErrorManager.ERROR_TYPES.ASSET_LOAD_FAILED, severity: ErrorManager.ERROR_SEVERITY.MEDIUM };
        }

        // Default classification
        return { type: ErrorManager.ERROR_TYPES.UNKNOWN_ERROR, severity: ErrorManager.ERROR_SEVERITY.MEDIUM };
    }

    /**
     * Get recovery suggestions for an error
     */
    getRecoverySuggestions(error, context = {}) {
        const classification = this.classifyError(error, context);
        const suggestions = [];

        switch (classification.type) {
            case ErrorManager.ERROR_TYPES.WEBGL_CONTEXT_LOST:
                suggestions.push('Refresh the page to restore WebGL context');
                suggestions.push('Close other browser tabs to free up GPU memory');
                suggestions.push('Update your graphics drivers');
                break;

            case ErrorManager.ERROR_TYPES.WEBGL_NOT_SUPPORTED:
                suggestions.push('Use a modern browser with WebGL support');
                suggestions.push('Enable hardware acceleration in browser settings');
                suggestions.push('Update your browser to the latest version');
                break;

            case ErrorManager.ERROR_TYPES.MEMORY_ERROR:
                suggestions.push('Close other applications to free up memory');
                suggestions.push('Try loading a smaller model');
                suggestions.push('Reduce rendering quality in settings');
                break;

            case ErrorManager.ERROR_TYPES.NETWORK_ERROR:
                suggestions.push('Check your internet connection');
                suggestions.push('Try again in a few moments');
                suggestions.push('Use a different network if available');
                break;

            case ErrorManager.ERROR_TYPES.FILE_TOO_LARGE:
                suggestions.push('Try a smaller file (under 100MB)');
                suggestions.push('Compress the model before uploading');
                suggestions.push('Use a more efficient file format like GLB');
                break;

            case ErrorManager.ERROR_TYPES.UNSUPPORTED_FORMAT:
                suggestions.push('Use a supported format: GLB, GLTF, FBX, OBJ');
                suggestions.push('Convert your model to GLB format');
                suggestions.push('Check the file extension is correct');
                break;

            case ErrorManager.ERROR_TYPES.ASSET_LOAD_FAILED:
                suggestions.push('Check that the file is not corrupted');
                suggestions.push('Try uploading the file again');
                suggestions.push('Ensure the file URL is accessible');
                break;

            default:
                suggestions.push('Refresh the page and try again');
                suggestions.push('Check the browser console for more details');
                suggestions.push('Contact support if the problem persists');
                break;
        }

        return suggestions;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.errorHistory = [];
        this.errorCounts.clear();
        this.recoveryStrategies.clear();
        this.userNotifications = [];
    }
}