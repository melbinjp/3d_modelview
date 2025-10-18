/**
 * Test keyboard shortcuts UI behavior
 */

describe('Keyboard Shortcuts UI', () => {
    let container;
    let coreEngine;
    let keyboardShortcutManager;

    beforeEach(async () => {
        // Create test container
        container = document.createElement('div');
        container.id = 'test-container';
        document.body.appendChild(container);

        // Import required modules
        const { CoreEngine } = await import('../src/core/CoreEngine.js');
        const { KeyboardShortcutManager } = await import('../src/ui/KeyboardShortcutManager.js');

        // Initialize core engine
        coreEngine = new CoreEngine();
        await coreEngine.init();

        // Initialize keyboard shortcut manager
        keyboardShortcutManager = new KeyboardShortcutManager(coreEngine);
        await keyboardShortcutManager.initialize();
    });

    afterEach(() => {
        // Cleanup
        if (keyboardShortcutManager) {
            keyboardShortcutManager.destroy();
        }
        if (coreEngine) {
            coreEngine.destroy();
        }
        
        // Remove test container and any modals
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
        
        // Remove any shortcut help panels
        const helpPanel = document.getElementById('shortcutHelpPanel');
        if (helpPanel && helpPanel.parentNode) {
            helpPanel.parentNode.removeChild(helpPanel);
        }
    });

    describe('Help Panel Visibility', () => {
        it('should not show help panel on initialization', () => {
            const helpPanel = document.getElementById('shortcutHelpPanel');
            
            // Panel should exist but be hidden
            expect(helpPanel).toBeTruthy();
            expect(helpPanel.classList.contains('hidden')).toBe(true);
            expect(helpPanel.classList.contains('show')).toBe(false);
        });

        it('should show help panel when explicitly requested', () => {
            const helpPanel = document.getElementById('shortcutHelpPanel');
            
            // Show help panel
            keyboardShortcutManager.showShortcutHelp();
            
            // Panel should now be visible
            expect(helpPanel.classList.contains('hidden')).toBe(false);
            expect(helpPanel.classList.contains('show')).toBe(true);
        });

        it('should hide help panel when close button is clicked', () => {
            const helpPanel = document.getElementById('shortcutHelpPanel');
            
            // Show help panel first
            keyboardShortcutManager.showShortcutHelp();
            expect(helpPanel.classList.contains('show')).toBe(true);
            
            // Click close button
            const closeButton = helpPanel.querySelector('.modal-close');
            closeButton.click();
            
            // Panel should be hidden
            expect(helpPanel.classList.contains('hidden')).toBe(true);
            expect(helpPanel.classList.contains('show')).toBe(false);
        });

        it('should hide help panel when clicking outside modal content', () => {
            const helpPanel = document.getElementById('shortcutHelpPanel');
            
            // Show help panel first
            keyboardShortcutManager.showShortcutHelp();
            expect(helpPanel.classList.contains('show')).toBe(true);
            
            // Click on the modal backdrop (outside content)
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                target: helpPanel
            });
            Object.defineProperty(clickEvent, 'target', { value: helpPanel });
            helpPanel.dispatchEvent(clickEvent);
            
            // Panel should be hidden
            expect(helpPanel.classList.contains('hidden')).toBe(true);
            expect(helpPanel.classList.contains('show')).toBe(false);
        });

        it('should hide help panel when Escape key is pressed', () => {
            const helpPanel = document.getElementById('shortcutHelpPanel');
            
            // Show help panel first
            keyboardShortcutManager.showShortcutHelp();
            expect(helpPanel.classList.contains('show')).toBe(true);
            
            // Press Escape key
            const escapeEvent = new KeyboardEvent('keydown', {
                key: 'Escape',
                bubbles: true,
                cancelable: true
            });
            helpPanel.dispatchEvent(escapeEvent);
            
            // Panel should be hidden
            expect(helpPanel.classList.contains('hidden')).toBe(true);
            expect(helpPanel.classList.contains('show')).toBe(false);
        });
    });

    describe('Help Panel Content', () => {
        it('should populate shortcut categories when shown', () => {
            keyboardShortcutManager.showShortcutHelp();
            
            const categoriesContainer = document.getElementById('shortcutCategories');
            expect(categoriesContainer).toBeTruthy();
            
            // Should have some content after population
            expect(categoriesContainer.children.length).toBeGreaterThan(0);
        });

        it('should show keyboard shortcuts organized by category', () => {
            keyboardShortcutManager.showShortcutHelp();
            
            const categoriesContainer = document.getElementById('shortcutCategories');
            const categories = categoriesContainer.querySelectorAll('.shortcut-category');
            
            // Should have at least one category
            expect(categories.length).toBeGreaterThan(0);
            
            // Each category should have shortcuts
            categories.forEach(category => {
                const shortcuts = category.querySelectorAll('.shortcut-item');
                expect(shortcuts.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Event System Integration', () => {
        it('should show help panel when ui:show:help event is emitted', () => {
            const helpPanel = document.getElementById('shortcutHelpPanel');
            
            // Initially hidden
            expect(helpPanel.classList.contains('show')).toBe(false);
            
            // Emit help event
            coreEngine.emit('ui:show:help');
            
            // Panel should now be visible
            expect(helpPanel.classList.contains('show')).toBe(true);
        });

        it('should respond to H key shortcut to show help', () => {
            const helpPanel = document.getElementById('shortcutHelpPanel');
            
            // Initially hidden
            expect(helpPanel.classList.contains('show')).toBe(false);
            
            // Simulate H key press
            const keyEvent = new KeyboardEvent('keydown', {
                code: 'KeyH',
                key: 'h',
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(keyEvent);
            
            // Panel should now be visible
            expect(helpPanel.classList.contains('show')).toBe(true);
        });
    });
});