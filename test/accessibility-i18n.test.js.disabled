import { CoreEngine } from '../src/core/CoreEngine.js';
import { I18nManager } from '../src/ui/I18nManager.js';
import { AccessibilityManager } from '../src/ui/AccessibilityManager.js';
import { ThemeManager } from '../src/ui/ThemeManager.js';
import { KeyboardShortcutManager } from '../src/ui/KeyboardShortcutManager.js';

describe('Accessibility and Internationalization Features', () => {
    let coreEngine;
    let i18nManager;
    let accessibilityManager;
    let themeManager;
    let keyboardShortcutManager;

    beforeEach(async () => {
        // Create DOM elements needed for testing
        document.body.innerHTML = `
            <div id="app">
                <div id="sidebar" class="sidebar">
                    <div class="accordion">
                        <div class="accordion-item">
                            <h3 class="accordion-header">Test Header</h3>
                            <div class="accordion-content">Test Content</div>
                        </div>
                    </div>
                </div>
                <div id="viewer"></div>
                <button id="testButton">Test Button</button>
                <input type="text" id="testInput" placeholder="Test input">
                <input type="range" id="testSlider" min="0" max="100" value="50">
            </div>
        `;

        coreEngine = new CoreEngine();
        await coreEngine.init();

        i18nManager = new I18nManager(coreEngine);
        accessibilityManager = new AccessibilityManager(coreEngine);
        themeManager = new ThemeManager(coreEngine);
        keyboardShortcutManager = new KeyboardShortcutManager(coreEngine);
    });

    afterEach(() => {
        if (i18nManager) i18nManager.destroy();
        if (accessibilityManager) accessibilityManager.destroy();
        if (themeManager) themeManager.destroy();
        if (keyboardShortcutManager) keyboardShortcutManager.destroy();
        if (coreEngine) coreEngine.destroy();
        
        document.body.innerHTML = '';
    });

    describe('I18nManager', () => {
        it('should initialize with default language', async () => {
            await i18nManager.initialize();
            
            expect(i18nManager.initialized).toBe(true);
            expect(i18nManager.currentLanguage).toBe('en');
            expect(i18nManager.currentLocale).toBe('en-US');
        });

        it('should translate keys correctly', async () => {
            await i18nManager.initialize();
            
            const translation = i18nManager.t('ui.controls');
            expect(translation).toBe('Controls');
            
            const unknownKey = i18nManager.t('unknown.key');
            expect(unknownKey).toBe('unknown.key');
        });

        it('should change language successfully', async () => {
            await i18nManager.initialize();
            
            const success = await i18nManager.setLanguage('es');
            expect(success).toBe(true);
            expect(i18nManager.currentLanguage).toBe('es');
            
            const translation = i18nManager.t('ui.controls');
            expect(translation).toBe('Controles');
        });

        it('should handle RTL languages correctly', async () => {
            await i18nManager.initialize();
            
            await i18nManager.setLanguage('ar');
            expect(i18nManager.isRTL()).toBe(true);
            expect(document.documentElement.dir).toBe('rtl');
            expect(document.body.classList.contains('rtl')).toBe(true);
        });

        it('should format numbers according to locale', async () => {
            await i18nManager.initialize();
            
            const number = 1234.56;
            const formatted = i18nManager.formatNumber(number);
            expect(typeof formatted).toBe('string');
            expect(formatted).toContain('1');
        });

        it('should format dates according to locale', async () => {
            await i18nManager.initialize();
            
            const date = new Date('2023-12-25');
            const formatted = i18nManager.formatDate(date);
            expect(typeof formatted).toBe('string');
        });

        it('should get list of supported languages', async () => {
            await i18nManager.initialize();
            
            const languages = i18nManager.getSupportedLanguages();
            expect(Array.isArray(languages)).toBe(true);
            expect(languages.length).toBeGreaterThan(0);
            expect(languages[0]).toHaveProperty('code');
            expect(languages[0]).toHaveProperty('name');
        });
    });

    describe('AccessibilityManager', () => {
        it('should initialize with default settings', async () => {
            await accessibilityManager.initialize();
            
            expect(accessibilityManager.initialized).toBe(true);
            expect(accessibilityManager.keyboardNavigation.enabled).toBe(true);
        });

        it('should create ARIA live regions', async () => {
            await accessibilityManager.initialize();
            
            const liveRegion = document.getElementById('live-region');
            const statusRegion = document.getElementById('status-region');
            const alertRegion = document.getElementById('alert-region');
            
            expect(liveRegion).toBeTruthy();
            expect(statusRegion).toBeTruthy();
            expect(alertRegion).toBeTruthy();
            
            expect(liveRegion.getAttribute('aria-live')).toBe('polite');
            expect(statusRegion.getAttribute('role')).toBe('status');
            expect(alertRegion.getAttribute('role')).toBe('alert');
        });

        it('should add skip links', async () => {
            await accessibilityManager.initialize();
            
            const skipLinks = document.querySelector('.skip-links');
            expect(skipLinks).toBeTruthy();
            
            const skipLink = skipLinks.querySelector('.skip-link');
            expect(skipLink).toBeTruthy();
            expect(skipLink.textContent).toContain('Skip to');
        });

        it('should announce messages to screen readers', async () => {
            await accessibilityManager.initialize();
            
            const testMessage = 'Test announcement';
            accessibilityManager.announce(testMessage);
            
            // Check that message was added to announcements history
            expect(accessibilityManager.screenReader.announcements.length).toBeGreaterThan(0);
            expect(accessibilityManager.screenReader.announcements[0].message).toBe(testMessage);
        });

        it('should update status for screen readers', async () => {
            await accessibilityManager.initialize();
            
            const testStatus = 'Loading model';
            accessibilityManager.updateStatus(testStatus);
            
            const statusRegion = document.getElementById('status-region');
            expect(statusRegion.textContent).toBe(testStatus);
        });

        it('should show alerts to screen readers', async () => {
            await accessibilityManager.initialize();
            
            const testAlert = 'Error occurred';
            accessibilityManager.showAlert(testAlert);
            
            // Check that alert was added to announcements with assertive priority
            const alerts = accessibilityManager.screenReader.announcements.filter(a => a.priority === 'assertive');
            expect(alerts.length).toBeGreaterThan(0);
            expect(alerts[0].message).toBe(testAlert);
        });

        it('should enhance existing elements with accessibility attributes', async () => {
            await accessibilityManager.initialize();
            
            const accordionHeader = document.querySelector('.accordion-header');
            expect(accordionHeader.getAttribute('role')).toBe('button');
            expect(accordionHeader.getAttribute('aria-expanded')).toBe('false');
            expect(accordionHeader.getAttribute('tabindex')).toBe('0');
        });

        it('should handle keyboard navigation', async () => {
            await accessibilityManager.initialize();
            
            const testButton = document.getElementById('testButton');
            testButton.focus();
            
            // Simulate Tab key
            const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab' });
            document.dispatchEvent(tabEvent);
            
            expect(accessibilityManager.keyboardNavigation.currentFocus).toBeTruthy();
        });
    });

    describe('ThemeManager', () => {
        it('should initialize with default theme', async () => {
            await themeManager.initialize();
            
            expect(themeManager.initialized).toBe(true);
            expect(themeManager.currentTheme).toBe('light');
        });

        it('should apply theme correctly', async () => {
            await themeManager.initialize();
            
            const success = themeManager.setTheme('dark');
            expect(success).toBe(true);
            expect(themeManager.currentTheme).toBe('dark');
            expect(document.body.classList.contains('theme-dark')).toBe(true);
        });

        it('should toggle between themes', async () => {
            await themeManager.initialize();
            
            const initialTheme = themeManager.currentTheme;
            themeManager.toggleTheme();
            expect(themeManager.currentTheme).not.toBe(initialTheme);
        });

        it('should set high contrast mode', async () => {
            await themeManager.initialize();
            
            themeManager.setHighContrastMode(true);
            expect(themeManager.highContrastMode).toBe(true);
            expect(document.body.classList.contains('high-contrast')).toBe(true);
        });

        it('should apply font size scaling', async () => {
            await themeManager.initialize();
            
            const success = themeManager.setFontSize('large');
            expect(success).toBe(true);
            expect(themeManager.currentFontSize).toBe('large');
            expect(document.body.classList.contains('font-size-large')).toBe(true);
        });

        it('should increase and decrease font size', async () => {
            await themeManager.initialize();
            
            const initialSize = themeManager.currentFontSize;
            themeManager.increaseFontSize();
            expect(themeManager.currentFontSize).not.toBe(initialSize);
            
            themeManager.decreaseFontSize();
            expect(themeManager.currentFontSize).toBe(initialSize);
        });

        it('should set reduced motion mode', async () => {
            await themeManager.initialize();
            
            themeManager.setReducedMotion(true);
            expect(themeManager.reducedMotion).toBe(true);
            expect(document.body.classList.contains('reduced-motion')).toBe(true);
        });

        it('should get available themes', async () => {
            await themeManager.initialize();
            
            const themes = themeManager.getAvailableThemes();
            expect(Array.isArray(themes)).toBe(true);
            expect(themes.length).toBeGreaterThan(0);
            expect(themes[0]).toHaveProperty('id');
            expect(themes[0]).toHaveProperty('name');
        });

        it('should reset to defaults', async () => {
            await themeManager.initialize();
            
            // Change some settings
            themeManager.setTheme('dark');
            themeManager.setFontSize('large');
            themeManager.setHighContrastMode(true);
            
            // Reset
            themeManager.resetToDefaults();
            
            expect(themeManager.currentTheme).toBe('light');
            expect(themeManager.currentFontSize).toBe('normal');
            expect(themeManager.highContrastMode).toBe(false);
        });
    });

    describe('KeyboardShortcutManager', () => {
        it('should initialize with default shortcuts', async () => {
            await keyboardShortcutManager.initialize();
            
            expect(keyboardShortcutManager.initialized).toBe(true);
            expect(keyboardShortcutManager.shortcuts.size).toBeGreaterThan(0);
        });

        it('should register shortcuts correctly', async () => {
            await keyboardShortcutManager.initialize();
            
            const testShortcut = {
                keys: ['KeyT'],
                modifiers: ['ctrl'],
                action: 'testAction',
                description: 'Test shortcut',
                category: 'Test'
            };
            
            const success = keyboardShortcutManager.registerShortcut('test.shortcut', testShortcut);
            expect(success).toBe(true);
            expect(keyboardShortcutManager.hasShortcut('test.shortcut')).toBe(true);
        });

        it('should detect shortcut conflicts', async () => {
            await keyboardShortcutManager.initialize();
            
            const shortcut1 = {
                keys: ['KeyX'],
                modifiers: ['ctrl'],
                action: 'action1',
                description: 'First shortcut',
                category: 'Test'
            };
            
            const shortcut2 = {
                keys: ['KeyX'],
                modifiers: ['ctrl'],
                action: 'action2',
                description: 'Second shortcut',
                category: 'Test'
            };
            
            keyboardShortcutManager.registerShortcut('test.first', shortcut1);
            const success = keyboardShortcutManager.registerShortcut('test.second', shortcut2);
            
            expect(success).toBe(false); // Should fail due to conflict
        });

        it('should update shortcuts', async () => {
            await keyboardShortcutManager.initialize();
            
            const originalShortcut = keyboardShortcutManager.getShortcut('global.help');
            expect(originalShortcut).toBeTruthy();
            
            const newKeys = { keys: ['KeyY'] };
            const success = keyboardShortcutManager.updateShortcut('global.help', newKeys);
            expect(success).toBe(true);
            
            const updatedShortcut = keyboardShortcutManager.getShortcut('global.help');
            expect(updatedShortcut.keys).toEqual(['KeyY']);
        });

        it('should get shortcuts by category', async () => {
            await keyboardShortcutManager.initialize();
            
            const cameraShortcuts = keyboardShortcutManager.getShortcutsByCategory('Camera');
            expect(Array.isArray(cameraShortcuts)).toBe(true);
            expect(cameraShortcuts.length).toBeGreaterThan(0);
            expect(cameraShortcuts[0]).toHaveProperty('category', 'Camera');
        });

        it('should handle context changes', async () => {
            await keyboardShortcutManager.initialize();
            
            keyboardShortcutManager.setContext('viewer');
            expect(keyboardShortcutManager.getContext()).toBe('viewer');
            
            keyboardShortcutManager.setContext('sidebar');
            expect(keyboardShortcutManager.getContext()).toBe('sidebar');
        });

        it('should validate shortcut configurations', async () => {
            await keyboardShortcutManager.initialize();
            
            const validShortcut = {
                keys: ['KeyA'],
                modifiers: [],
                action: 'testAction',
                description: 'Valid shortcut'
            };
            
            const invalidShortcut = {
                keys: [],
                modifiers: [],
                action: '',
                description: 'Invalid shortcut'
            };
            
            expect(keyboardShortcutManager.validateShortcut(validShortcut)).toBe(true);
            expect(keyboardShortcutManager.validateShortcut(invalidShortcut)).toBe(false);
        });

        it('should reset shortcuts to defaults', async () => {
            await keyboardShortcutManager.initialize();
            
            // Modify a shortcut
            keyboardShortcutManager.updateShortcut('global.help', { keys: ['KeyZ'] });
            
            // Reset
            keyboardShortcutManager.resetShortcuts();
            
            // Check that shortcut is back to default
            const helpShortcut = keyboardShortcutManager.getShortcut('global.help');
            expect(helpShortcut.keys).toEqual(['KeyH']);
        });
    });

    describe('Integration Tests', () => {
        it('should work together for complete accessibility support', async () => {
            // Initialize all managers
            await i18nManager.initialize();
            await accessibilityManager.initialize();
            await themeManager.initialize();
            await keyboardShortcutManager.initialize();
            
            // Test language change affects accessibility announcements
            await i18nManager.setLanguage('es');
            const translation = i18nManager.t('ui.controls');
            expect(translation).toBe('Controles');
            
            // Test theme change with accessibility
            themeManager.setHighContrastMode(true);
            expect(document.body.classList.contains('high-contrast')).toBe(true);
            
            // Test keyboard shortcuts work with accessibility
            const shortcut = keyboardShortcutManager.getShortcut('global.help');
            expect(shortcut).toBeTruthy();
            
            // Test accessibility announcements work
            accessibilityManager.announce('Test message');
            expect(accessibilityManager.screenReader.announcements.length).toBeGreaterThan(0);
        });

        it('should handle system preferences correctly', async () => {
            // Mock system preferences
            Object.defineProperty(window, 'matchMedia', {
                writable: true,
                value: jest.fn().mockImplementation(query => ({
                    matches: query.includes('prefers-reduced-motion'),
                    media: query,
                    onchange: null,
                    addListener: jest.fn(),
                    removeListener: jest.fn(),
                    addEventListener: jest.fn(),
                    removeEventListener: jest.fn(),
                    dispatchEvent: jest.fn(),
                })),
            });
            
            await themeManager.initialize();
            
            // Should detect reduced motion preference
            expect(themeManager.reducedMotion).toBe(true);
        });

        it('should save and load preferences correctly', async () => {
            // Initialize managers
            await i18nManager.initialize();
            await themeManager.initialize();
            
            // Change settings
            await i18nManager.setLanguage('fr');
            themeManager.setFontSize('large');
            
            // Check localStorage
            expect(localStorage.getItem('preferred-language')).toBe('fr');
            expect(localStorage.getItem('font-size-preference')).toBe('large');
            
            // Create new instances to test loading
            const newI18nManager = new I18nManager(coreEngine);
            const newThemeManager = new ThemeManager(coreEngine);
            
            await newI18nManager.initialize();
            await newThemeManager.initialize();
            
            expect(newI18nManager.currentLanguage).toBe('fr');
            expect(newThemeManager.currentFontSize).toBe('large');
            
            // Cleanup
            newI18nManager.destroy();
            newThemeManager.destroy();
        });
    });
});