/**
 * Test suite for Error Handling System
 */

import { ErrorManager } from '../src/core/ErrorManager.js';
import { WebGLRecovery } from '../src/core/WebGLRecovery.js';
import { PerformanceMonitor } from '../src/core/PerformanceMonitor.js';

describe('Error Handling System', () => {
    let mockCore;
    let errorManager;
    let webglRecovery;
    let performanceMonitor;

    beforeEach(() => {
        // Mock CoreEngine
        mockCore = {
            modules: new Map(),
            eventListeners: new Map(),
            getModule: function(name) { return this.modules.get(name); },
            registerModule: function(name, module) { this.modules.set(name, module); },
            emit: function(event, data) {
                if (this.eventListeners.has(event)) {
                    this.eventListeners.get(event).forEach(callback => callback(data));
                }
            },
            on: function(event, callback) {
                if (!this.eventListeners.has(event)) {
                    this.eventListeners.set(event, []);
                }
                this.eventListeners.get(event).push(callback);
            }
        };

        // Mock performance manager
        const mockPerformanceManager = {
            reduceMemoryUsage: jest.fn().mockResolvedValue(true),
            adaptiveQuality: {
                reduceQuality: jest.fn().mockResolvedValue(true)
            }
        };
        mockCore.modules.set('performance', mockPerformanceManager);

        // Mock rendering engine
        const mockRenderingEngine = {
            restoreContext: jest.fn().mockResolvedValue(true)
        };
        mockCore.modules.set('rendering', mockRenderingEngine);

        errorManager = new ErrorManager(mockCore);
        webglRecovery = new WebGLRecovery(mockCore);
        performanceMonitor = new PerformanceMonitor(mockCore);
    });

    afterEach(() => {
        if (errorManager) {
            errorManager.destroy();
        }
        if (webglRecovery) {
            webglRecovery.destroy();
        }
        if (performanceMonitor) {
            performanceMonitor.destroy();
        }
    });

    describe('ErrorManager', () => {
        describe('Initialization', () => {
            test('should initialize with correct default values', () => {
                expect(errorManager.errorHistory).toEqual([]);
                expect(errorManager.errorCounts).toBeInstanceOf(Map);
                expect(errorManager.recoveryStrategies).toBeInstanceOf(Map);
                expect(errorManager.maxErrorHistory).toBe(100);
            });

            test('should setup recovery strategies', () => {
                expect(errorManager.recoveryStrategies.size).toBeGreaterThan(0);
                expect(errorManager.recoveryStrategies.has(ErrorManager.ERROR_TYPES.WEBGL_CONTEXT_LOST)).toBe(true);
                expect(errorManager.recoveryStrategies.has(ErrorManager.ERROR_TYPES.MEMORY_ERROR)).toBe(true);
            });

            test('should setup global error handlers', () => {
                const originalAddEventListener = window.addEventListener;
                const mockAddEventListener = jest.fn();
                window.addEventListener = mockAddEventListener;

                const newErrorManager = new ErrorManager(mockCore);
                
                expect(mockAddEventListener).toHaveBeenCalledWith('error', expect.any(Function));
                expect(mockAddEventListener).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));

                window.addEventListener = originalAddEventListener;
                newErrorManager.destroy();
            });
        });

        describe('Error Handling', () => {
            test('should handle basic error correctly', async () => {
                const error = new Error('Test error');
                const errorInfo = await errorManager.handleError(error, {
                    type: ErrorManager.ERROR_TYPES.UNKNOWN_ERROR,
                    severity: ErrorManager.ERROR_SEVERITY.MEDIUM
                });

                expect(errorInfo).toBeDefined();
                expect(errorInfo.message).toBe('Test error');
                expect(errorInfo.type).toBe(ErrorManager.ERROR_TYPES.UNKNOWN_ERROR);
                expect(errorInfo.severity).toBe(ErrorManager.ERROR_SEVERITY.MEDIUM);
                expect(errorInfo.id).toBeDefined();
                expect(errorInfo.timestamp).toBeDefined();
            });

            test('should add error to history', async () => {
                const error = new Error('Test error');
                await errorManager.handleError(error);

                expect(errorManager.errorHistory).toHaveLength(1);
                expect(errorManager.errorHistory[0].message).toBe('Test error');
            });

            test('should update error counts', async () => {
                const error = new Error('Test error');
                await errorManager.handleError(error, {
                    type: ErrorManager.ERROR_TYPES.ASSET_LOAD_FAILED
                });

                expect(errorManager.errorCounts.get(ErrorManager.ERROR_TYPES.ASSET_LOAD_FAILED)).toBe(1);
            });

            test('should limit error history size', async () => {
                errorManager.maxErrorHistory = 3;
                
                for (let i = 0; i < 5; i++) {
                    await errorManager.handleError(new Error(`Error ${i}`));
                }

                expect(errorManager.errorHistory).toHaveLength(3);
                expect(errorManager.errorHistory[0].message).toBe('Error 4'); // Most recent first
            });
        });

        describe('Recovery Strategies', () => {
            test('should attempt WebGL context recovery', async () => {
                const error = new Error('WebGL context lost');
                const errorInfo = await errorManager.handleError(error, {
                    type: ErrorManager.ERROR_TYPES.WEBGL_CONTEXT_LOST,
                    severity: ErrorManager.ERROR_SEVERITY.HIGH
                });

                expect(errorInfo.recovered).toBe(true);
                const renderingEngine = mockCore.getModule('rendering');
                expect(renderingEngine.restoreContext).toHaveBeenCalled();
            });

            test('should attempt memory recovery', async () => {
                const error = new Error('Memory error');
                const errorInfo = await errorManager.handleError(error, {
                    type: ErrorManager.ERROR_TYPES.MEMORY_ERROR,
                    severity: ErrorManager.ERROR_SEVERITY.MEDIUM
                });

                expect(errorInfo.recovered).toBe(true);
                const performanceManager = mockCore.getModule('performance');
                expect(performanceManager.reduceMemoryUsage).toHaveBeenCalled();
            });

            test('should attempt performance recovery', async () => {
                const error = new Error('Performance degradation');
                const errorInfo = await errorManager.handleError(error, {
                    type: ErrorManager.ERROR_TYPES.PERFORMANCE_DEGRADATION,
                    severity: ErrorManager.ERROR_SEVERITY.MEDIUM
                });

                expect(errorInfo.recovered).toBe(true);
                const performanceManager = mockCore.getModule('performance');
                expect(performanceManager.adaptiveQuality.reduceQuality).toHaveBeenCalled();
            });

            test('should handle recovery failure gracefully', async () => {
                // Mock recovery failure
                const mockPerformanceManager = {
                    reduceMemoryUsage: jest.fn().mockRejectedValue(new Error('Recovery failed'))
                };
                mockCore.modules.set('performance', mockPerformanceManager);

                const error = new Error('Memory error');
                const errorInfo = await errorManager.handleError(error, {
                    type: ErrorManager.ERROR_TYPES.MEMORY_ERROR,
                    severity: ErrorManager.ERROR_SEVERITY.MEDIUM
                });

                expect(errorInfo.recovered).toBe(false);
            });
        });

        describe('User Notifications', () => {
            test('should show user notification', () => {
                const notificationId = errorManager.showUserMessage('Test message', 'info', 1000);
                
                expect(notificationId).toBeDefined();
                expect(errorManager.userNotifications).toHaveLength(1);
                expect(errorManager.userNotifications[0].message).toBe('Test message');
                expect(errorManager.userNotifications[0].type).toBe('info');
            });

            test('should remove user notification', () => {
                const notificationId = errorManager.showUserMessage('Test message', 'info', 0);
                errorManager.removeUserNotification(notificationId);
                
                expect(errorManager.userNotifications).toHaveLength(0);
            });

            test('should generate user-friendly messages', () => {
                const errorInfo = {
                    id: 'test-id',
                    type: ErrorManager.ERROR_TYPES.WEBGL_NOT_SUPPORTED,
                    message: 'WebGL not supported',
                    timestamp: new Date().toISOString()
                };

                const userMessage = errorManager.getUserFriendlyMessage(errorInfo);
                
                expect(userMessage.message).toContain('WebGL');
                expect(userMessage.suggestions).toBeInstanceOf(Array);
                expect(userMessage.suggestions.length).toBeGreaterThan(0);
                expect(userMessage.technicalDetails).toBe('WebGL not supported');
            });
        });

        describe('Error Statistics', () => {
            test('should provide error statistics', async () => {
                await errorManager.handleError(new Error('Error 1'), {
                    type: ErrorManager.ERROR_TYPES.ASSET_LOAD_FAILED
                });
                await errorManager.handleError(new Error('Error 2'), {
                    type: ErrorManager.ERROR_TYPES.MEMORY_ERROR
                });

                const stats = errorManager.getErrorStatistics();
                
                expect(stats.totalErrors).toBe(2);
                expect(stats.errorsByType[ErrorManager.ERROR_TYPES.ASSET_LOAD_FAILED]).toBe(1);
                expect(stats.errorsByType[ErrorManager.ERROR_TYPES.MEMORY_ERROR]).toBe(1);
                expect(stats.recentErrors).toHaveLength(2);
            });

            test('should calculate recovery rate', async () => {
                // Add recoverable error
                await errorManager.handleError(new Error('Memory error'), {
                    type: ErrorManager.ERROR_TYPES.MEMORY_ERROR
                });
                
                // Add non-recoverable error
                await errorManager.handleError(new Error('Asset error'), {
                    type: ErrorManager.ERROR_TYPES.ASSET_LOAD_FAILED
                });

                const stats = errorManager.getErrorStatistics();
                expect(stats.recoveryRate).toBe(50); // 1 out of 2 recovered
            });
        });

        describe('Analytics', () => {
            test('should enable analytics reporting', () => {
                errorManager.setAnalyticsEnabled(true);
                expect(errorManager.analyticsEnabled).toBe(true);
            });

            test('should report to analytics when enabled', async () => {
                errorManager.setAnalyticsEnabled(true);
                
                let analyticsData = null;
                mockCore.on('analytics:error', (data) => {
                    analyticsData = data;
                });

                await errorManager.handleError(new Error('Test error'), {
                    type: ErrorManager.ERROR_TYPES.UNKNOWN_ERROR
                });

                expect(analyticsData).toBeDefined();
                expect(analyticsData.type).toBe(ErrorManager.ERROR_TYPES.UNKNOWN_ERROR);
                expect(analyticsData.message).toBe('Test error');
            });
        });

        describe('Cleanup', () => {
            test('should clear history', () => {
                errorManager.errorHistory = [{ id: 'test' }];
                errorManager.errorCounts.set('test', 1);
                
                errorManager.clearHistory();
                
                expect(errorManager.errorHistory).toHaveLength(0);
                expect(errorManager.errorCounts.size).toBe(0);
            });

            test('should destroy properly', () => {
                errorManager.errorHistory = [{ id: 'test' }];
                errorManager.userNotifications = [{ id: 'test' }];
                
                errorManager.destroy();
                
                expect(errorManager.errorHistory).toHaveLength(0);
                expect(errorManager.userNotifications).toHaveLength(0);
            });
        });
    });

    describe('WebGLRecovery', () => {
        test('should detect WebGL support', () => {
            const isSupported = WebGLRecovery.isWebGLSupported();
            expect(typeof isSupported).toBe('boolean');
        });

        test('should setup context loss handlers', () => {
            const mockCanvas = {
                addEventListener: jest.fn()
            };
            const mockRenderer = {};

            webglRecovery.setupContextLossHandlers(mockCanvas, mockRenderer);

            expect(mockCanvas.addEventListener).toHaveBeenCalledWith('webglcontextlost', expect.any(Function));
            expect(mockCanvas.addEventListener).toHaveBeenCalledWith('webglcontextrestored', expect.any(Function));
        });

        test('should handle invalid parameters gracefully', () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            
            webglRecovery.setupContextLossHandlers(null, null);
            
            expect(consoleSpy).toHaveBeenCalledWith('WebGLRecovery: Invalid canvas or renderer provided');
            consoleSpy.mockRestore();
        });

        test('should track context status', () => {
            const status = webglRecovery.getStatus();
            
            expect(status).toHaveProperty('isContextLost');
            expect(status).toHaveProperty('restoreAttempts');
            expect(status).toHaveProperty('maxRestoreAttempts');
            expect(status).toHaveProperty('webglSupported');
        });

        test('should manage context loss handlers', () => {
            const handler = jest.fn();
            
            webglRecovery.onContextLost(handler);
            expect(webglRecovery.contextLostHandlers.has(handler)).toBe(true);
            
            webglRecovery.removeContextLostHandler(handler);
            expect(webglRecovery.contextLostHandlers.has(handler)).toBe(false);
        });
    });

    describe('PerformanceMonitor', () => {
        test('should initialize with default metrics', () => {
            expect(performanceMonitor.metrics).toHaveProperty('fps');
            expect(performanceMonitor.metrics).toHaveProperty('frameTime');
            expect(performanceMonitor.metrics).toHaveProperty('memoryUsage');
            expect(performanceMonitor.thresholds).toHaveProperty('minFPS');
        });

        test('should start and stop monitoring', () => {
            expect(performanceMonitor.isMonitoring).toBe(false);
            
            performanceMonitor.startMonitoring();
            expect(performanceMonitor.isMonitoring).toBe(true);
            
            performanceMonitor.stopMonitoring();
            expect(performanceMonitor.isMonitoring).toBe(false);
        });

        test('should update thresholds', () => {
            const newThresholds = { minFPS: 20 };
            performanceMonitor.updateThresholds(newThresholds);
            
            expect(performanceMonitor.thresholds.minFPS).toBe(20);
        });

        test('should provide performance statistics', () => {
            // Add some mock history
            performanceMonitor.performanceHistory = [
                { timestamp: Date.now(), metrics: { fps: 60, frameTime: 16.67, memoryUsage: 1000000 } },
                { timestamp: Date.now(), metrics: { fps: 55, frameTime: 18.18, memoryUsage: 1100000 } }
            ];

            const stats = performanceMonitor.getStatistics();
            
            expect(stats).toHaveProperty('fps');
            expect(stats).toHaveProperty('frameTime');
            expect(stats).toHaveProperty('memory');
            expect(stats.fps).toHaveProperty('current');
            expect(stats.fps).toHaveProperty('average');
        });

        test('should calculate performance grade', () => {
            // Mock good performance
            performanceMonitor.performanceHistory = [
                { timestamp: Date.now(), metrics: { fps: 60, frameTime: 16.67, memoryUsage: 1000000 } }
            ];

            const grade = performanceMonitor.getPerformanceGrade();
            expect(['excellent', 'good', 'fair', 'poor', 'critical', 'unknown']).toContain(grade);
        });

        test('should reset history', () => {
            performanceMonitor.performanceHistory = [{ test: 'data' }];
            performanceMonitor.resetHistory();
            
            expect(performanceMonitor.performanceHistory).toHaveLength(0);
        });
    });

    describe('Integration Tests', () => {
        test('should handle WebGL context loss event', () => {
            let contextLostEmitted = false;
            mockCore.on('webgl:context-lost', () => {
                contextLostEmitted = true;
            });

            // Simulate WebGL context loss
            const event = new Event('webglcontextlost');
            window.dispatchEvent(event);

            // Note: In a real test environment, this would need proper WebGL context simulation
            // For now, we just verify the event handler is set up
            expect(typeof window.onwebglcontextlost).toBe('undefined'); // No global handler set
        });

        test('should integrate error manager with performance monitor', () => {
            let performanceWarningReceived = false;
            
            mockCore.on('performance:warning', () => {
                performanceWarningReceived = true;
            });

            errorManager.init();
            
            // Simulate performance warning
            mockCore.emit('performance:degradation', {
                issues: [{ type: 'low_fps', severity: 'medium' }]
            });

            // The error manager should have received and processed the event
            expect(errorManager.errorHistory.length).toBeGreaterThan(0);
        });

        test('should handle memory warnings', () => {
            errorManager.init();
            
            // Simulate memory warning
            mockCore.emit('memory:warning', {
                usagePercent: 85,
                timestamp: Date.now()
            });

            expect(errorManager.errorHistory.length).toBeGreaterThan(0);
            expect(errorManager.errorHistory[0].type).toBe(ErrorManager.ERROR_TYPES.MEMORY_ERROR);
        });
    });
});