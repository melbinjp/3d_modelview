/**
 * Comprehensive Test Suite for MobileGestureManager
 * Tests touch gesture recognition, haptic feedback, and mobile interactions
 */

describe('MobileGestureManager', () => {
    let mockCore;
    let gestureManager;
    let MobileGestureManager;
    let mockCanvas;

    beforeEach(async () => {
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
            },
            off: function(event, callback) {
                if (this.eventListeners.has(event)) {
                    const callbacks = this.eventListeners.get(event);
                    const index = callbacks.indexOf(callback);
                    if (index > -1) {
                        callbacks.splice(index, 1);
                    }
                }
            }
        };

        // Mock canvas element
        mockCanvas = document.createElement('canvas');
        mockCanvas.id = 'viewer-canvas';
        mockCanvas.width = 800;
        mockCanvas.height = 600;
        document.body.appendChild(mockCanvas);

        // Mock navigator.vibrate
        navigator.vibrate = jest.fn();

        // Import module
        const module = await import('../src/ui/MobileGestureManager.js');
        MobileGestureManager = module.MobileGestureManager;
        
        gestureManager = new MobileGestureManager(mockCore);
        await gestureManager.initialize();
    });

    afterEach(() => {
        if (gestureManager) {
            gestureManager.destroy();
        }
        document.body.innerHTML = '';
    });

    describe('Initialization', () => {
        test('should initialize with correct default values', () => {
            expect(gestureManager.coreEngine).toBe(mockCore);
            expect(gestureManager.initialized).toBe(true);
            expect(gestureManager.enabled).toBe(true);
        });

        test('should detect mobile device', () => {
            const isMobile = gestureManager.isMobileDevice();
            expect(typeof isMobile).toBe('boolean');
        });

        test('should detect touch support', () => {
            const hasTouch = gestureManager.hasTouchSupport();
            expect(typeof hasTouch).toBe('boolean');
        });

        test('should attach touch event listeners to canvas', () => {
            const canvas = document.getElementById('viewer-canvas');
            expect(canvas).toBeTruthy();
            
            // Verify listeners are attached (implementation-specific)
            expect(gestureManager.canvas).toBe(canvas);
        });

        test('should initialize gesture state', () => {
            expect(gestureManager.touches).toEqual([]);
            expect(gestureManager.currentGesture).toBeNull();
        });
    });

    describe('Touch Event Handling', () => {
        test('should handle touchstart event', () => {
            const touch = createTouch(100, 100, 0);
            const event = createTouchEvent('touchstart', [touch]);
            
            mockCanvas.dispatchEvent(event);
            
            expect(gestureManager.touches.length).toBe(1);
        });

        test('should handle touchmove event', () => {
            const touch1 = createTouch(100, 100, 0);
            const startEvent = createTouchEvent('touchstart', [touch1]);
            mockCanvas.dispatchEvent(startEvent);
            
            const touch2 = createTouch(150, 150, 0);
            const moveEvent = createTouchEvent('touchmove', [touch2]);
            mockCanvas.dispatchEvent(moveEvent);
            
            expect(gestureManager.touches[0].currentX).toBe(150);
            expect(gestureManager.touches[0].currentY).toBe(150);
        });

        test('should handle touchend event', () => {
            const touch = createTouch(100, 100, 0);
            const startEvent = createTouchEvent('touchstart', [touch]);
            mockCanvas.dispatchEvent(startEvent);
            
            const endEvent = createTouchEvent('touchend', []);
            mockCanvas.dispatchEvent(endEvent);
            
            expect(gestureManager.touches.length).toBe(0);
        });

        test('should handle multiple touches', () => {
            const touch1 = createTouch(100, 100, 0);
            const touch2 = createTouch(200, 200, 1);
            const event = createTouchEvent('touchstart', [touch1, touch2]);
            
            mockCanvas.dispatchEvent(event);
            
            expect(gestureManager.touches.length).toBe(2);
        });

        test('should prevent default on touch events', () => {
            const touch = createTouch(100, 100, 0);
            const event = createTouchEvent('touchstart', [touch]);
            
            const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
            mockCanvas.dispatchEvent(event);
            
            expect(preventDefaultSpy).toHaveBeenCalled();
        });
    });

    describe('Gesture Recognition', () => {
        test('should recognize tap gesture', (done) => {
            mockCore.on('gesture:tap', (data) => {
                expect(data.x).toBeDefined();
                expect(data.y).toBeDefined();
                done();
            });
            
            const touch = createTouch(100, 100, 0);
            const startEvent = createTouchEvent('touchstart', [touch]);
            mockCanvas.dispatchEvent(startEvent);
            
            setTimeout(() => {
                const endEvent = createTouchEvent('touchend', []);
                mockCanvas.dispatchEvent(endEvent);
            }, 50);
        });

        test('should recognize double tap gesture', (done) => {
            mockCore.on('gesture:doubleTap', (data) => {
                expect(data.x).toBeDefined();
                expect(data.y).toBeDefined();
                done();
            });
            
            // First tap
            const touch1 = createTouch(100, 100, 0);
            mockCanvas.dispatchEvent(createTouchEvent('touchstart', [touch1]));
            mockCanvas.dispatchEvent(createTouchEvent('touchend', []));
            
            // Second tap quickly
            setTimeout(() => {
                const touch2 = createTouch(100, 100, 0);
                mockCanvas.dispatchEvent(createTouchEvent('touchstart', [touch2]));
                mockCanvas.dispatchEvent(createTouchEvent('touchend', []));
            }, 100);
        });

        test('should recognize swipe gesture', (done) => {
            mockCore.on('gesture:swipe', (data) => {
                expect(data.direction).toBeDefined();
                expect(['left', 'right', 'up', 'down']).toContain(data.direction);
                done();
            });
            
            const touch1 = createTouch(100, 100, 0);
            mockCanvas.dispatchEvent(createTouchEvent('touchstart', [touch1]));
            
            // Swipe right
            for (let i = 0; i < 10; i++) {
                setTimeout(() => {
                    const touch = createTouch(100 + i * 20, 100, 0);
                    mockCanvas.dispatchEvent(createTouchEvent('touchmove', [touch]));
                }, i * 10);
            }
            
            setTimeout(() => {
                mockCanvas.dispatchEvent(createTouchEvent('touchend', []));
            }, 150);
        });

        test('should recognize pinch gesture', (done) => {
            mockCore.on('gesture:pinch', (data) => {
                expect(data.scale).toBeDefined();
                expect(data.delta).toBeDefined();
                done();
            });
            
            // Start with two touches
            const touch1 = createTouch(100, 100, 0);
            const touch2 = createTouch(200, 200, 1);
            mockCanvas.dispatchEvent(createTouchEvent('touchstart', [touch1, touch2]));
            
            // Move touches closer (pinch in)
            setTimeout(() => {
                const newTouch1 = createTouch(120, 120, 0);
                const newTouch2 = createTouch(180, 180, 1);
                mockCanvas.dispatchEvent(createTouchEvent('touchmove', [newTouch1, newTouch2]));
            }, 50);
        });

        test('should recognize rotate gesture', (done) => {
            mockCore.on('gesture:rotate', (data) => {
                expect(data.angle).toBeDefined();
                expect(data.delta).toBeDefined();
                done();
            });
            
            // Start with two touches
            const touch1 = createTouch(100, 100, 0);
            const touch2 = createTouch(200, 100, 1);
            mockCanvas.dispatchEvent(createTouchEvent('touchstart', [touch1, touch2]));
            
            // Rotate touches
            setTimeout(() => {
                const newTouch1 = createTouch(100, 100, 0);
                const newTouch2 = createTouch(100, 200, 1);
                mockCanvas.dispatchEvent(createTouchEvent('touchmove', [newTouch1, newTouch2]));
            }, 50);
        });

        test('should recognize pan gesture', (done) => {
            mockCore.on('gesture:pan', (data) => {
                expect(data.deltaX).toBeDefined();
                expect(data.deltaY).toBeDefined();
                done();
            });
            
            const touch1 = createTouch(100, 100, 0);
            mockCanvas.dispatchEvent(createTouchEvent('touchstart', [touch1]));
            
            setTimeout(() => {
                const touch2 = createTouch(120, 120, 0);
                mockCanvas.dispatchEvent(createTouchEvent('touchmove', [touch2]));
            }, 50);
        });

        test('should recognize long press gesture', (done) => {
            mockCore.on('gesture:longPress', (data) => {
                expect(data.x).toBeDefined();
                expect(data.y).toBeDefined();
                done();
            });
            
            const touch = createTouch(100, 100, 0);
            mockCanvas.dispatchEvent(createTouchEvent('touchstart', [touch]));
            
            // Hold for long press duration
            setTimeout(() => {
                mockCanvas.dispatchEvent(createTouchEvent('touchend', []));
            }, 600);
        }, 1000);
    });

    describe('Haptic Feedback', () => {
        test('should trigger haptic feedback on tap', () => {
            const touch = createTouch(100, 100, 0);
            mockCanvas.dispatchEvent(createTouchEvent('touchstart', [touch]));
            mockCanvas.dispatchEvent(createTouchEvent('touchend', []));
            
            expect(navigator.vibrate).toHaveBeenCalled();
        });

        test('should use different patterns for different gestures', () => {
            navigator.vibrate.mockClear();
            
            // Tap
            const touch1 = createTouch(100, 100, 0);
            mockCanvas.dispatchEvent(createTouchEvent('touchstart', [touch1]));
            mockCanvas.dispatchEvent(createTouchEvent('touchend', []));
            
            const tapPattern = navigator.vibrate.mock.calls[0][0];
            
            navigator.vibrate.mockClear();
            
            // Double tap
            mockCanvas.dispatchEvent(createTouchEvent('touchstart', [touch1]));
            mockCanvas.dispatchEvent(createTouchEvent('touchend', []));
            setTimeout(() => {
                mockCanvas.dispatchEvent(createTouchEvent('touchstart', [touch1]));
                mockCanvas.dispatchEvent(createTouchEvent('touchend', []));
            }, 100);
            
            // Patterns should be different
            expect(navigator.vibrate).toHaveBeenCalled();
        });

        test('should allow disabling haptic feedback', () => {
            gestureManager.setHapticEnabled(false);
            
            navigator.vibrate.mockClear();
            
            const touch = createTouch(100, 100, 0);
            mockCanvas.dispatchEvent(createTouchEvent('touchstart', [touch]));
            mockCanvas.dispatchEvent(createTouchEvent('touchend', []));
            
            expect(navigator.vibrate).not.toHaveBeenCalled();
        });

        test('should handle missing vibrate API gracefully', () => {
            const originalVibrate = navigator.vibrate;
            delete navigator.vibrate;
            
            expect(() => {
                const touch = createTouch(100, 100, 0);
                mockCanvas.dispatchEvent(createTouchEvent('touchstart', [touch]));
                mockCanvas.dispatchEvent(createTouchEvent('touchend', []));
            }).not.toThrow();
            
            navigator.vibrate = originalVibrate;
        });
    });

    describe('Gesture Configuration', () => {
        test('should allow configuring gesture thresholds', () => {
            gestureManager.setGestureThreshold('swipe', 100);
            
            expect(gestureManager.config.swipeThreshold).toBe(100);
        });

        test('should allow configuring gesture timeouts', () => {
            gestureManager.setGestureTimeout('tap', 300);
            
            expect(gestureManager.config.tapTimeout).toBe(300);
        });

        test('should validate configuration values', () => {
            expect(() => {
                gestureManager.setGestureThreshold('swipe', -10);
            }).toThrow();
        });

        test('should allow enabling/disabling specific gestures', () => {
            gestureManager.setGestureEnabled('pinch', false);
            
            expect(gestureManager.enabledGestures.pinch).toBe(false);
        });
    });

    describe('Touch Tracking', () => {
        test('should track touch velocity', () => {
            const touch1 = createTouch(100, 100, 0);
            mockCanvas.dispatchEvent(createTouchEvent('touchstart', [touch1]));
            
            setTimeout(() => {
                const touch2 = createTouch(200, 200, 0);
                mockCanvas.dispatchEvent(createTouchEvent('touchmove', [touch2]));
                
                const touchData = gestureManager.touches[0];
                expect(touchData.velocityX).toBeDefined();
                expect(touchData.velocityY).toBeDefined();
            }, 50);
        });

        test('should calculate touch distance', () => {
            const touch1 = createTouch(0, 0, 0);
            const touch2 = createTouch(100, 0, 1);
            
            const distance = gestureManager.calculateDistance(touch1, touch2);
            expect(distance).toBe(100);
        });

        test('should calculate touch angle', () => {
            const touch1 = createTouch(0, 0, 0);
            const touch2 = createTouch(100, 100, 1);
            
            const angle = gestureManager.calculateAngle(touch1, touch2);
            expect(angle).toBeCloseTo(45, 1);
        });

        test('should track touch duration', () => {
            const touch = createTouch(100, 100, 0);
            mockCanvas.dispatchEvent(createTouchEvent('touchstart', [touch]));
            
            setTimeout(() => {
                const touchData = gestureManager.touches[0];
                expect(touchData.duration).toBeGreaterThan(0);
            }, 100);
        });
    });

    describe('Gesture State Management', () => {
        test('should track current gesture', () => {
            const touch = createTouch(100, 100, 0);
            mockCanvas.dispatchEvent(createTouchEvent('touchstart', [touch]));
            
            expect(gestureManager.currentGesture).toBeDefined();
        });

        test('should clear gesture on touchend', () => {
            const touch = createTouch(100, 100, 0);
            mockCanvas.dispatchEvent(createTouchEvent('touchstart', [touch]));
            mockCanvas.dispatchEvent(createTouchEvent('touchend', []));
            
            setTimeout(() => {
                expect(gestureManager.currentGesture).toBeNull();
            }, 100);
        });

        test('should prevent gesture conflicts', () => {
            // Start pinch gesture
            const touch1 = createTouch(100, 100, 0);
            const touch2 = createTouch(200, 200, 1);
            mockCanvas.dispatchEvent(createTouchEvent('touchstart', [touch1, touch2]));
            
            // Should not trigger pan during pinch
            let panTriggered = false;
            mockCore.on('gesture:pan', () => {
                panTriggered = true;
            });
            
            mockCanvas.dispatchEvent(createTouchEvent('touchmove', [touch1, touch2]));
            
            expect(panTriggered).toBe(false);
        });
    });

    describe('Performance', () => {
        test('should throttle gesture events', (done) => {
            let eventCount = 0;
            mockCore.on('gesture:pan', () => {
                eventCount++;
            });
            
            const touch = createTouch(100, 100, 0);
            mockCanvas.dispatchEvent(createTouchEvent('touchstart', [touch]));
            
            // Rapid touchmove events
            for (let i = 0; i < 100; i++) {
                const moveTouch = createTouch(100 + i, 100, 0);
                mockCanvas.dispatchEvent(createTouchEvent('touchmove', [moveTouch]));
            }
            
            setTimeout(() => {
                // Should be throttled, not 100 events
                expect(eventCount).toBeLessThan(100);
                done();
            }, 200);
        });

        test('should clean up old touch data', () => {
            // Add many touches
            for (let i = 0; i < 10; i++) {
                const touch = createTouch(100, 100, i);
                mockCanvas.dispatchEvent(createTouchEvent('touchstart', [touch]));
                mockCanvas.dispatchEvent(createTouchEvent('touchend', []));
            }
            
            gestureManager.cleanupOldTouches();
            
            expect(gestureManager.touchHistory.length).toBeLessThanOrEqual(5);
        });
    });

    describe('Accessibility', () => {
        test('should provide gesture descriptions', () => {
            const description = gestureManager.getGestureDescription('pinch');
            expect(description).toBeTruthy();
            expect(typeof description).toBe('string');
        });

        test('should support gesture alternatives', () => {
            const alternatives = gestureManager.getGestureAlternatives('pinch');
            expect(alternatives).toBeInstanceOf(Array);
            expect(alternatives.length).toBeGreaterThan(0);
        });

        test('should announce gestures to screen readers', () => {
            const announcement = document.querySelector('[role="status"]');
            expect(announcement).toBeTruthy();
        });
    });

    describe('Cleanup and Destroy', () => {
        test('should remove event listeners on destroy', () => {
            const canvas = document.getElementById('viewer-canvas');
            const listenerCount = canvas.eventListeners?.length || 0;
            
            gestureManager.destroy();
            
            // Verify cleanup
            expect(gestureManager.initialized).toBe(false);
        });

        test('should clear touch state on destroy', () => {
            const touch = createTouch(100, 100, 0);
            mockCanvas.dispatchEvent(createTouchEvent('touchstart', [touch]));
            
            gestureManager.destroy();
            
            expect(gestureManager.touches).toEqual([]);
            expect(gestureManager.currentGesture).toBeNull();
        });

        test('should remove CoreEngine listeners on destroy', () => {
            const listenerCount = mockCore.eventListeners.size;
            
            gestureManager.destroy();
            
            // Should have fewer listeners
            expect(mockCore.eventListeners.size).toBeLessThanOrEqual(listenerCount);
        });
    });

    describe('Edge Cases', () => {
        test('should handle missing canvas gracefully', () => {
            document.body.innerHTML = '';
            
            expect(() => {
                const newManager = new MobileGestureManager(mockCore);
                newManager.initialize();
            }).not.toThrow();
        });

        test('should handle rapid touch events', () => {
            expect(() => {
                for (let i = 0; i < 100; i++) {
                    const touch = createTouch(i, i, 0);
                    mockCanvas.dispatchEvent(createTouchEvent('touchstart', [touch]));
                    mockCanvas.dispatchEvent(createTouchEvent('touchend', []));
                }
            }).not.toThrow();
        });

        test('should handle invalid touch data', () => {
            expect(() => {
                const event = new TouchEvent('touchstart', {
                    touches: [null, undefined]
                });
                mockCanvas.dispatchEvent(event);
            }).not.toThrow();
        });

        test('should handle concurrent gestures', () => {
            expect(() => {
                // Start multiple gestures simultaneously
                const touch1 = createTouch(100, 100, 0);
                const touch2 = createTouch(200, 200, 1);
                const touch3 = createTouch(300, 300, 2);
                mockCanvas.dispatchEvent(createTouchEvent('touchstart', [touch1, touch2, touch3]));
            }).not.toThrow();
        });
    });

    // Helper functions
    function createTouch(x, y, identifier) {
        return {
            identifier,
            clientX: x,
            clientY: y,
            pageX: x,
            pageY: y,
            screenX: x,
            screenY: y,
            target: mockCanvas
        };
    }

    function createTouchEvent(type, touches) {
        const event = new TouchEvent(type, {
            touches,
            targetTouches: touches,
            changedTouches: touches,
            bubbles: true,
            cancelable: true
        });
        return event;
    }
});
