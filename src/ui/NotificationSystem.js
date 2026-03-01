/**
 * NotificationSystem - User-friendly notification display system
 */
export class NotificationSystem {
    constructor(core) {
        this.core = core;
        this.container = null;
        this.notifications = new Map();
        this.maxNotifications = 5;
        this.defaultDuration = 5000;
        
        this.setupEventListeners();
        this.createContainer();
    }

    /**
     * Initialize the notification system
     */
    init() {
        this.createContainer();
        this.setupStyles();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.core.on('error:user-notification', (notification) => {
            // Silent - no user-facing error notifications
            console.error('Error notification (silent):', notification);
        });

        this.core.on('error:notification-removed', (notification) => {
            this.removeNotification(notification.id);
        });
    }

    /**
     * Create notification container
     */
    createContainer() {
        if (this.container) {
            return;
        }

        this.container = document.createElement('div');
        this.container.className = 'notification-container';
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-label', 'Notifications');
        
        document.body.appendChild(this.container);
    }

    /**
     * Setup notification styles
     */
    setupStyles() {
        if (document.getElementById('notification-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
                max-width: 400px;
            }

            .notification {
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                margin-bottom: 12px;
                padding: 16px;
                pointer-events: auto;
                transform: translateX(100%);
                transition: all 0.3s ease-in-out;
                border-left: 4px solid #007bff;
                position: relative;
                max-width: 100%;
                word-wrap: break-word;
            }

            .notification.show {
                transform: translateX(0);
            }

            .notification.hide {
                transform: translateX(100%);
                opacity: 0;
            }

            .notification.info {
                border-left-color: #007bff;
            }

            .notification.success {
                border-left-color: #28a745;
            }

            .notification.warning {
                border-left-color: #ffc107;
                background: #fff8e1;
            }

            .notification.error {
                border-left-color: #dc3545;
                background: #ffebee;
            }

            .notification-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 8px;
            }

            .notification-title {
                font-weight: 600;
                font-size: 14px;
                color: #333;
                margin: 0;
            }

            .notification-close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                color: #666;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background-color 0.2s;
            }

            .notification-close:hover {
                background-color: rgba(0, 0, 0, 0.1);
            }

            .notification-message {
                font-size: 13px;
                color: #555;
                line-height: 1.4;
                margin: 0;
            }

            .notification-actions {
                margin-top: 12px;
                display: flex;
                gap: 8px;
            }

            .notification-action {
                background: #007bff;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: background-color 0.2s;
            }

            .notification-action:hover {
                background: #0056b3;
            }

            .notification-action.secondary {
                background: #6c757d;
            }

            .notification-action.secondary:hover {
                background: #545b62;
            }

            .notification-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 2px;
                background: rgba(0, 123, 255, 0.3);
                transition: width linear;
            }

            .notification.warning .notification-progress {
                background: rgba(255, 193, 7, 0.3);
            }

            .notification.error .notification-progress {
                background: rgba(220, 53, 69, 0.3);
            }

            .notification.success .notification-progress {
                background: rgba(40, 167, 69, 0.3);
            }

            @media (max-width: 480px) {
                .notification-container {
                    left: 20px;
                    right: 20px;
                    top: 20px;
                    max-width: none;
                }

                .notification {
                    transform: translateY(-100%);
                }

                .notification.show {
                    transform: translateY(0);
                }

                .notification.hide {
                    transform: translateY(-100%);
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Show a notification
     */
    showNotification(notification) {
        // Limit number of notifications
        if (this.notifications.size >= this.maxNotifications) {
            const oldestId = this.notifications.keys().next().value;
            this.removeNotification(oldestId);
        }

        const element = this.createNotificationElement(notification);
        this.container.appendChild(element);
        this.notifications.set(notification.id, {
            ...notification,
            element
        });

        // Trigger show animation
        requestAnimationFrame(() => {
            element.classList.add('show');
        });

        // Auto-remove if duration is set
        if (notification.duration > 0) {
            this.startProgressBar(element, notification.duration);
            setTimeout(() => {
                this.removeNotification(notification.id);
            }, notification.duration);
        }

        return notification.id;
    }

    /**
     * Create notification DOM element
     */
    createNotificationElement(notification) {
        const element = document.createElement('div');
        element.className = `notification ${notification.type}`;
        element.setAttribute('role', 'alert');
        element.setAttribute('aria-live', 'assertive');

        const title = this.getNotificationTitle(notification.type);
        
        element.innerHTML = `
            <div class="notification-header">
                <h4 class="notification-title">${title}</h4>
                <button class="notification-close" aria-label="Close notification">&times;</button>
            </div>
            <p class="notification-message">${notification.message}</p>
            ${notification.actions ? this.createActionsHTML(notification.actions) : ''}
            ${notification.duration > 0 ? '<div class="notification-progress"></div>' : ''}
        `;

        // Add close button functionality
        const closeButton = element.querySelector('.notification-close');
        closeButton.addEventListener('click', () => {
            this.removeNotification(notification.id);
        });

        // Add action button functionality
        if (notification.actions) {
            notification.actions.forEach((action, index) => {
                const button = element.querySelector(`.notification-action[data-index="${index}"]`);
                if (button && action.callback) {
                    button.addEventListener('click', () => {
                        action.callback();
                        if (action.closeOnClick !== false) {
                            this.removeNotification(notification.id);
                        }
                    });
                }
            });
        }

        return element;
    }

    /**
     * Create actions HTML
     */
    createActionsHTML(actions) {
        if (!actions || actions.length === 0) {
            return '';
        }

        const actionsHTML = actions.map((action, index) => {
            const className = action.type === 'secondary' ? 'notification-action secondary' : 'notification-action';
            return `<button class="${className}" data-index="${index}">${action.label}</button>`;
        }).join('');

        return `<div class="notification-actions">${actionsHTML}</div>`;
    }

    /**
     * Get notification title based on type
     */
    getNotificationTitle(type) {
        const titles = {
            info: 'Information',
            success: 'Success',
            warning: 'Warning',
            error: 'Error'
        };
        return titles[type] || 'Notification';
    }

    /**
     * Start progress bar animation
     */
    startProgressBar(element, duration) {
        const progressBar = element.querySelector('.notification-progress');
        if (!progressBar) {
            return;
        }

        progressBar.style.width = '100%';
        progressBar.style.transition = `width ${duration}ms linear`;
        
        requestAnimationFrame(() => {
            progressBar.style.width = '0%';
        });
    }

    /**
     * Remove a notification
     */
    removeNotification(id) {
        const notification = this.notifications.get(id);
        if (!notification) {
            return;
        }

        const element = notification.element;
        element.classList.add('hide');

        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
            this.notifications.delete(id);
        }, 300); // Match CSS transition duration
    }

    /**
     * Show error notification - DISABLED: No user-facing error messages
     * Errors are logged to console only for developers
     */
    showErrorNotification(errorInfo, userMessage) {
        // Silent - no user-facing error notifications
        // Errors are handled in console for developers only
        console.error('Error notification (silent):', errorInfo, userMessage);
        return null;
    }

    /**
     * Show success notification for recovery
     */
    showRecoveryNotification(errorType) {
        const messages = {
            webgl_context_lost: 'WebGL context has been successfully restored.',
            memory_error: 'Memory usage has been optimized.',
            performance_degradation: 'Performance has been improved by reducing quality settings.'
        };

        const message = messages[errorType] || 'Issue has been resolved.';

        return this.showNotification({
            id: `recovery_${Date.now()}`,
            type: 'success',
            message,
            duration: 3000
        });
    }

    /**
     * Check if an error type can be retried
     */
    canRetry(errorType) {
        const retryableErrors = [
            'asset_load_failed',
            'network_error',
            'texture_load_failed'
        ];
        return retryableErrors.includes(errorType);
    }

    /**
     * Retry last action
     */
    retryLastAction(errorInfo) {
        // Emit retry event that modules can listen to
        this.core.emit('error:retry-requested', {
            errorType: errorInfo.type,
            context: errorInfo.context,
            timestamp: Date.now()
        });
    }

    /**
     * Show help for specific error type
     */
    showHelp(errorType) {
        // Emit help requested event
        this.core.emit('help:requested', {
            topic: errorType,
            timestamp: Date.now()
        });

        // Could open a help modal or redirect to documentation
        console.info(`Help requested for: ${errorType}`);
    }

    /**
     * Clear all notifications
     */
    clearAll() {
        this.notifications.forEach((notification, id) => {
            this.removeNotification(id);
        });
    }

    /**
     * Get current notifications
     */
    getNotifications() {
        return Array.from(this.notifications.values()).map(n => ({
            id: n.id,
            type: n.type,
            message: n.message,
            timestamp: n.timestamp
        }));
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.clearAll();
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        const styles = document.getElementById('notification-styles');
        if (styles && styles.parentNode) {
            styles.parentNode.removeChild(styles);
        }
        
        this.container = null;
        this.notifications.clear();
    }
}