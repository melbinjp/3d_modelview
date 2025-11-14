/**
 * MobileGestureManager - Advanced touch gesture recognition and handling
 * Provides native app-like touch interactions with haptic feedback
 */
export class MobileGestureManager {
    constructor(coreEngine) {
        this.coreEngine = coreEngine;
        this.initialized = false;
        
        // Touch state
        this.touches = new Map();
        this.gestureState = {
            type: null,
            startTime: 0,
            startDistance: 0,
            startAngle: 0,
            lastScale: 1,
            lastRotation: 0,
            velocity: { x: 0, y: 0 }
        };
        
        // Gesture thresholds
        this.thresholds = {
            tap: 200, // ms
            longPress: 500, // ms
            swipe: 50, // px
            pinch: 10, // px
            rotate: 15 // degrees
        };
        
        // Haptic feedback support
        this.hapticSupported = 'vibrate' in navigator;
        
        // Gesture recognizers
        this.recognizers = {
            tap: this.recognizeTap.bind(this),
            doubleTap: this.recognizeDoubleTap.bind(this),
            longPress: this.recognizeLongPress.bind(this),
            swipe: this.recognizeSwipe.bind(this),
            pinch: this.recognizePinch.bind(this),
            rotate: this.recognizeRotate.bind(this),
            pan: this.recognizePan.bind(this)
        };
        
        // Last tap for double-tap detection
        this.lastTap = { time: 0, x: 0, y: 0 };
        
        // Long press timer
        this.longPressTimer = null;
    }

    /**
     * Initialize gesture manager
     */
    async initialize() {
        if (this.initialized) return;
        
        // Only initialize on touch devices
        if (!('ontouchstart' in window)) {
            console.log('Touch not supported, skipping gesture manager');
            return;
        }
        
        this.setupEventListeners();
        this.initialized = true;
        
        this.coreEngine.emit('gestures:initialized');
    }

    /**
     * Setup touch event listeners
     */
    setupEventListeners() {
        const canvas = document.querySelector('#viewerContainer canvas');
        if (!canvas) {
            console.warn('Canvas not found for gesture handling');
            return;
        }
        
        // Prevent default touch behaviors
        canvas.style.touchAction = 'none';
        
        // Touch events
        canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        canvas.addEventListener('touchcancel', this.handleTouchCancel.bind(this), { passive: false });
    }

    /**
     * Handle touch start
     */
    handleTouchStart(event) {
        event.preventDefault();
        
        // Store touch points
        for (let touch of event.changedTouches) {
            this.touches.set(touch.identifier, {
                id: touch.identifier,
                startX: touch.clientX,
                startY: touch.clientY,
                currentX: touch.clientX,
                currentY: touch.clientY,
                startTime: Date.now()
            });
        }
        
        // Determine gesture type
        const touchCount = this.touches.size;
        
        if (touchCount === 1) {
            // Single touch - could be tap, long press, or pan
            this.gestureState.type = 'single';
            this.startLongPressDetection();
        } else if (touchCount === 2) {
            // Two touches - could be pinch or rotate
            this.gestureState.type = 'multi';
            this.initializeMultiTouch();
        }
        
        this.coreEngine.emit('gesture:start', {
            type: this.gestureState.type,
            touchCount
        });
    }

    /**
     * Handle touch move
     */
    handleTouchMove(event) {
        event.preventDefault();
        
        // Update touch positions
        for (let touch of event.changedTouches) {
            const stored = this.touches.get(touch.identifier);
            if (stored) {
                stored.currentX = touch.clientX;
                stored.currentY = touch.clientY;
            }
        }
        
        // Cancel long press if moved too much
        if (this.longPressTimer && this.getTouchMovement() > 10) {
            this.cancelLongPress();
        }
        
        // Process gesture based on touch count
        const touchCount = this.touches.size;
        
        if (touchCount === 1) {
            this.recognizers.pan();
        } else if (touchCount === 2) {
            this.recognizers.pinch();
            this.recognizers.rotate();
        }
    }

    /**
     * Handle touch end
     */
    handleTouchEnd(event) {
        event.preventDefault();
        
        const touchCount = this.touches.size;
        
        // Process end gestures before removing touches
        if (touchCount === 1) {
            const touch = Array.from(this.touches.values())[0];
            const duration = Date.now() - touch.startTime;
            const movement = this.getTouchMovement();
            
            if (duration < this.thresholds.tap && movement < 10) {
                this.recognizers.tap(touch);
                this.recognizers.doubleTap(touch);
            } else if (movement > this.thresholds.swipe) {
                this.recognizers.swipe(touch);
            }
        }
        
        // Remove ended touches
        for (let touch of event.changedTouches) {
            this.touches.delete(touch.identifier);
        }
        
        // Cancel long press
        this.cancelLongPress();
        
        // Reset gesture state if no touches remain
        if (this.touches.size === 0) {
            this.gestureState.type = null;
            this.coreEngine.emit('gesture:end');
        }
    }

    /**
     * Handle touch cancel
     */
    handleTouchCancel(event) {
        this.handleTouchEnd(event);
    }

    /**
     * Recognize tap gesture
     */
    recognizeTap(touch) {
        this.hapticFeedback('light');
        
        this.coreEngine.emit('gesture:tap', {
            x: touch.currentX,
            y: touch.currentY
        });
    }

    /**
     * Recognize double-tap gesture
     */
    recognizeDoubleTap(touch) {
        const now = Date.now();
        const timeSinceLastTap = now - this.lastTap.time;
        const distance = Math.hypot(
            touch.currentX - this.lastTap.x,
            touch.currentY - this.lastTap.y
        );
        
        if (timeSinceLastTap < 300 && distance < 50) {
            this.hapticFeedback('medium');
            
            this.coreEngine.emit('gesture:doubleTap', {
                x: touch.currentX,
                y: touch.currentY
            });
            
            // Reset to prevent triple-tap
            this.lastTap.time = 0;
        } else {
            this.lastTap = {
                time: now,
                x: touch.currentX,
                y: touch.currentY
            };
        }
    }

    /**
     * Start long press detection
     */
    startLongPressDetection() {
        this.longPressTimer = setTimeout(() => {
            const touch = Array.from(this.touches.values())[0];
            if (touch) {
                this.hapticFeedback('heavy');
                
                this.coreEngine.emit('gesture:longPress', {
                    x: touch.currentX,
                    y: touch.currentY
                });
            }
        }, this.thresholds.longPress);
    }

    /**
     * Cancel long press detection
     */
    cancelLongPress() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
    }

    /**
     * Recognize swipe gesture
     */
    recognizeSwipe(touch) {
        const deltaX = touch.currentX - touch.startX;
        const deltaY = touch.currentY - touch.startY;
        const distance = Math.hypot(deltaX, deltaY);
        const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
        
        let direction;
        if (Math.abs(angle) < 45) direction = 'right';
        else if (Math.abs(angle) > 135) direction = 'left';
        else if (angle > 0) direction = 'down';
        else direction = 'up';
        
        this.hapticFeedback('light');
        
        this.coreEngine.emit('gesture:swipe', {
            direction,
            distance,
            velocity: this.calculateVelocity(touch)
        });
    }

    /**
     * Recognize pan gesture
     */
    recognizePan() {
        const touch = Array.from(this.touches.values())[0];
        if (!touch) return;
        
        const deltaX = touch.currentX - touch.startX;
        const deltaY = touch.currentY - touch.startY;
        
        this.coreEngine.emit('gesture:pan', {
            deltaX,
            deltaY,
            x: touch.currentX,
            y: touch.currentY
        });
    }

    /**
     * Initialize multi-touch tracking
     */
    initializeMultiTouch() {
        const touches = Array.from(this.touches.values());
        if (touches.length !== 2) return;
        
        const [touch1, touch2] = touches;
        
        // Calculate initial distance and angle
        this.gestureState.startDistance = Math.hypot(
            touch2.currentX - touch1.currentX,
            touch2.currentY - touch1.currentY
        );
        
        this.gestureState.startAngle = Math.atan2(
            touch2.currentY - touch1.currentY,
            touch2.currentX - touch1.currentX
        ) * 180 / Math.PI;
        
        this.gestureState.lastScale = 1;
        this.gestureState.lastRotation = 0;
    }

    /**
     * Recognize pinch gesture
     */
    recognizePinch() {
        const touches = Array.from(this.touches.values());
        if (touches.length !== 2) return;
        
        const [touch1, touch2] = touches;
        
        // Calculate current distance
        const currentDistance = Math.hypot(
            touch2.currentX - touch1.currentX,
            touch2.currentY - touch1.currentY
        );
        
        // Calculate scale
        const scale = currentDistance / this.gestureState.startDistance;
        const deltaScale = scale - this.gestureState.lastScale;
        
        // Only emit if significant change
        if (Math.abs(deltaScale) > 0.01) {
            this.gestureState.lastScale = scale;
            
            this.coreEngine.emit('gesture:pinch', {
                scale,
                deltaScale,
                center: {
                    x: (touch1.currentX + touch2.currentX) / 2,
                    y: (touch1.currentY + touch2.currentY) / 2
                }
            });
        }
    }

    /**
     * Recognize rotate gesture
     */
    recognizeRotate() {
        const touches = Array.from(this.touches.values());
        if (touches.length !== 2) return;
        
        const [touch1, touch2] = touches;
        
        // Calculate current angle
        const currentAngle = Math.atan2(
            touch2.currentY - touch1.currentY,
            touch2.currentX - touch1.currentX
        ) * 180 / Math.PI;
        
        // Calculate rotation
        let rotation = currentAngle - this.gestureState.startAngle;
        
        // Normalize to -180 to 180
        while (rotation > 180) rotation -= 360;
        while (rotation < -180) rotation += 360;
        
        const deltaRotation = rotation - this.gestureState.lastRotation;
        
        // Only emit if significant change
        if (Math.abs(deltaRotation) > 1) {
            this.gestureState.lastRotation = rotation;
            
            this.coreEngine.emit('gesture:rotate', {
                rotation,
                deltaRotation,
                center: {
                    x: (touch1.currentX + touch2.currentX) / 2,
                    y: (touch1.currentY + touch2.currentY) / 2
                }
            });
        }
    }

    /**
     * Calculate touch movement distance
     */
    getTouchMovement() {
        const touch = Array.from(this.touches.values())[0];
        if (!touch) return 0;
        
        return Math.hypot(
            touch.currentX - touch.startX,
            touch.currentY - touch.startY
        );
    }

    /**
     * Calculate velocity
     */
    calculateVelocity(touch) {
        const duration = Date.now() - touch.startTime;
        const deltaX = touch.currentX - touch.startX;
        const deltaY = touch.currentY - touch.startY;
        
        return {
            x: deltaX / duration,
            y: deltaY / duration
        };
    }

    /**
     * Trigger haptic feedback
     */
    hapticFeedback(intensity = 'light') {
        if (!this.hapticSupported) return;
        
        const patterns = {
            light: 10,
            medium: 20,
            heavy: 30
        };
        
        try {
            navigator.vibrate(patterns[intensity] || 10);
        } catch (error) {
            // Silently fail if vibration not supported
        }
    }

    /**
     * Enable/disable haptic feedback
     */
    setHapticEnabled(enabled) {
        this.hapticSupported = enabled && 'vibrate' in navigator;
    }

    /**
     * Cleanup
     */
    destroy() {
        this.cancelLongPress();
        this.touches.clear();
        this.initialized = false;
    }
}
