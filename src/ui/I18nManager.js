/**
 * I18nManager - Internationalization and localization manager
 * Handles multi-language support, RTL languages, and cultural adaptations
 */
export class I18nManager {
    constructor(coreEngine) {
        this.coreEngine = coreEngine;
        this.initialized = false;
        
        // Current language and locale settings
        this.currentLanguage = 'en';
        this.currentLocale = 'en-US';
        this.fallbackLanguage = 'en';
        
        // Translation storage
        this.translations = new Map();
        this.loadedLanguages = new Set();
        
        // Language configuration
        this.supportedLanguages = new Map([
            ['en', { name: 'English', nativeName: 'English', rtl: false, locale: 'en-US' }],
            ['es', { name: 'Spanish', nativeName: 'Español', rtl: false, locale: 'es-ES' }],
            ['fr', { name: 'French', nativeName: 'Français', rtl: false, locale: 'fr-FR' }],
            ['de', { name: 'German', nativeName: 'Deutsch', rtl: false, locale: 'de-DE' }],
            ['zh', { name: 'Chinese', nativeName: '中文', rtl: false, locale: 'zh-CN' }],
            ['ja', { name: 'Japanese', nativeName: '日本語', rtl: false, locale: 'ja-JP' }],
            ['ar', { name: 'Arabic', nativeName: 'العربية', rtl: true, locale: 'ar-SA' }],
            ['he', { name: 'Hebrew', nativeName: 'עברית', rtl: true, locale: 'he-IL' }],
            ['ru', { name: 'Russian', nativeName: 'Русский', rtl: false, locale: 'ru-RU' }],
            ['pt', { name: 'Portuguese', nativeName: 'Português', rtl: false, locale: 'pt-BR' }]
        ]);
        
        // Cultural adaptations
        this.culturalSettings = new Map();
        
        // Number and date formatters
        this.numberFormatter = null;
        this.dateFormatter = null;
        this.currencyFormatter = null;
    }

    /**
     * Initialize the I18n manager
     */
    async initialize() {
        if (this.initialized) {
            console.warn('I18nManager already initialized');
            return;
        }

        try {
            // Detect user's preferred language
            await this.detectUserLanguage();
            
            // Load default translations
            await this.loadLanguage(this.currentLanguage);
            
            // Setup formatters
            this.setupFormatters();
            
            // Apply initial language settings
            this.applyLanguageSettings();
            
            // Setup event listeners
            this.setupEventListeners();
            
            this.initialized = true;
            this.coreEngine.emit('i18n:initialized', {
                language: this.currentLanguage,
                locale: this.currentLocale
            });
        } catch (error) {
            console.error('Failed to initialize I18nManager:', error);
            this.coreEngine.emit('error', {
                type: 'I18nInitializationError',
                message: error.message,
                context: { module: 'I18nManager' }
            });
        }
    }

    /**
     * Detect user's preferred language from browser settings
     */
    async detectUserLanguage() {
        // Check saved preference first
        const savedLanguage = localStorage.getItem('preferred-language');
        if (savedLanguage && this.supportedLanguages.has(savedLanguage)) {
            this.currentLanguage = savedLanguage;
            this.currentLocale = this.supportedLanguages.get(savedLanguage).locale;
            return;
        }

        // Check browser languages
        const browserLanguages = navigator.languages || [navigator.language];
        
        for (const browserLang of browserLanguages) {
            // Try exact match first
            const langCode = browserLang.toLowerCase();
            if (this.supportedLanguages.has(langCode)) {
                this.currentLanguage = langCode;
                this.currentLocale = this.supportedLanguages.get(langCode).locale;
                return;
            }
            
            // Try language code without region
            const baseLang = langCode.split('-')[0];
            if (this.supportedLanguages.has(baseLang)) {
                this.currentLanguage = baseLang;
                this.currentLocale = this.supportedLanguages.get(baseLang).locale;
                return;
            }
        }
        
        // Fallback to English
        this.currentLanguage = this.fallbackLanguage;
        this.currentLocale = 'en-US';
    }

    /**
     * Load translations for a specific language
     */
    async loadLanguage(languageCode) {
        if (this.loadedLanguages.has(languageCode)) {
            return;
        }

        try {
            // Load translations from embedded data (for production)
            const translations = await this.getEmbeddedTranslations(languageCode);
            this.translations.set(languageCode, translations);
            this.loadedLanguages.add(languageCode);
            
            this.coreEngine.emit('i18n:language:loaded', { language: languageCode });
        } catch (error) {
            console.warn(`Failed to load translations for ${languageCode}:`, error);
            
            // Fallback to English if not already loaded
            if (languageCode !== this.fallbackLanguage && !this.loadedLanguages.has(this.fallbackLanguage)) {
                await this.loadLanguage(this.fallbackLanguage);
            }
        }
    }

    /**
     * Get embedded translations for a language
     */
    async getEmbeddedTranslations(languageCode) {
        const translations = {
            en: {
                // UI Elements
                'ui.controls': 'Controls',
                'ui.loadModel': 'Load Model',
                'ui.assetLibrary': 'Asset Library',
                'ui.environment': 'Environment',
                'ui.lighting': 'Lighting',
                'ui.effects': 'Effects',
                'ui.animation': 'Animation',
                'ui.superheroMode': 'Superhero Mode',
                'ui.camera': 'Camera',
                'ui.fileManager': 'File Manager',
                'ui.analysisTools': 'Analysis Tools',
                'ui.exportSystem': 'Export System',
                
                // Actions
                'action.load': 'Load',
                'action.search': 'Search',
                'action.play': 'Play',
                'action.pause': 'Pause',
                'action.reset': 'Reset',
                'action.export': 'Export',
                'action.save': 'Save',
                'action.cancel': 'Cancel',
                'action.close': 'Close',
                'action.browse': 'Browse',
                
                // File operations
                'file.dragDrop': 'Drag & Drop',
                'file.browse': 'browse',
                'file.formats': 'Supported formats',
                'file.loading': 'Loading...',
                'file.loaded': 'Model loaded successfully',
                'file.error': 'Failed to load file',
                
                // Settings
                'settings.theme': 'Theme',
                'settings.language': 'Language',
                'settings.quality': 'Quality',
                'settings.autoRotate': 'Auto Rotate',
                'settings.showGrid': 'Show Grid',
                'settings.bloom': 'Bloom',
                'settings.shadows': 'Shadows',
                
                // Accessibility
                'a11y.skipToContent': 'Skip to main content',
                'a11y.openMenu': 'Open menu',
                'a11y.closeMenu': 'Close menu',
                'a11y.toggleSidebar': 'Toggle sidebar',
                'a11y.modelViewer': '3D Model Viewer',
                'a11y.loadingModel': 'Loading 3D model',
                'a11y.modelLoaded': '3D model loaded and ready for interaction',
                
                // Keyboard shortcuts
                'shortcuts.space': 'Space - Play/Pause animation',
                'shortcuts.r': 'R - Reset camera',
                'shortcuts.f': 'F - Fit to view',
                'shortcuts.g': 'G - Toggle grid',
                'shortcuts.h': 'H - Toggle help',
                'shortcuts.escape': 'Escape - Close dialogs',
                
                // Help and tooltips
                'help.dragDrop': 'Drag and drop 3D model files here, or click to browse. Supported formats: GLB, GLTF, FBX, OBJ, and more.',
                'help.superheroMode': 'Create dramatic reveals of your 3D models with cinematic camera movements and lighting.',
                'help.assetLibrary': 'Browse and download 3D models from various online libraries.',
                'help.camera': 'Use mouse to orbit, zoom, and pan around your 3D model.',
                
                // Status messages
                'status.ready': 'Ready',
                'status.loading': 'Loading',
                'status.error': 'Error',
                'status.complete': 'Complete',
                'status.processing': 'Processing',
                
                // Numbers and units
                'units.vertices': 'vertices',
                'units.faces': 'faces',
                'units.materials': 'materials',
                'units.textures': 'textures',
                'units.mb': 'MB',
                'units.kb': 'KB',
                'units.fps': 'FPS'
            },
            
            es: {
                // UI Elements
                'ui.controls': 'Controles',
                'ui.loadModel': 'Cargar Modelo',
                'ui.assetLibrary': 'Biblioteca de Recursos',
                'ui.environment': 'Entorno',
                'ui.lighting': 'Iluminación',
                'ui.effects': 'Efectos',
                'ui.animation': 'Animación',
                'ui.superheroMode': 'Modo Superhéroe',
                'ui.camera': 'Cámara',
                'ui.fileManager': 'Gestor de Archivos',
                'ui.analysisTools': 'Herramientas de Análisis',
                'ui.exportSystem': 'Sistema de Exportación',
                
                // Actions
                'action.load': 'Cargar',
                'action.search': 'Buscar',
                'action.play': 'Reproducir',
                'action.pause': 'Pausar',
                'action.reset': 'Reiniciar',
                'action.export': 'Exportar',
                'action.save': 'Guardar',
                'action.cancel': 'Cancelar',
                'action.close': 'Cerrar',
                'action.browse': 'Explorar',
                
                // File operations
                'file.dragDrop': 'Arrastrar y Soltar',
                'file.browse': 'explorar',
                'file.formats': 'Formatos soportados',
                'file.loading': 'Cargando...',
                'file.loaded': 'Modelo cargado exitosamente',
                'file.error': 'Error al cargar archivo',
                
                // Accessibility
                'a11y.skipToContent': 'Saltar al contenido principal',
                'a11y.openMenu': 'Abrir menú',
                'a11y.closeMenu': 'Cerrar menú',
                'a11y.toggleSidebar': 'Alternar barra lateral',
                'a11y.modelViewer': 'Visor de Modelos 3D',
                'a11y.loadingModel': 'Cargando modelo 3D',
                'a11y.modelLoaded': 'Modelo 3D cargado y listo para interacción'
            },
            
            fr: {
                // UI Elements
                'ui.controls': 'Contrôles',
                'ui.loadModel': 'Charger Modèle',
                'ui.assetLibrary': 'Bibliothèque de Ressources',
                'ui.environment': 'Environnement',
                'ui.lighting': 'Éclairage',
                'ui.effects': 'Effets',
                'ui.animation': 'Animation',
                'ui.superheroMode': 'Mode Super-héros',
                'ui.camera': 'Caméra',
                'ui.fileManager': 'Gestionnaire de Fichiers',
                'ui.analysisTools': 'Outils d\'Analyse',
                'ui.exportSystem': 'Système d\'Exportation',
                
                // Actions
                'action.load': 'Charger',
                'action.search': 'Rechercher',
                'action.play': 'Lire',
                'action.pause': 'Pause',
                'action.reset': 'Réinitialiser',
                'action.export': 'Exporter',
                'action.save': 'Sauvegarder',
                'action.cancel': 'Annuler',
                'action.close': 'Fermer',
                'action.browse': 'Parcourir',
                
                // Accessibility
                'a11y.skipToContent': 'Aller au contenu principal',
                'a11y.openMenu': 'Ouvrir le menu',
                'a11y.closeMenu': 'Fermer le menu',
                'a11y.toggleSidebar': 'Basculer la barre latérale',
                'a11y.modelViewer': 'Visionneuse de Modèles 3D',
                'a11y.loadingModel': 'Chargement du modèle 3D',
                'a11y.modelLoaded': 'Modèle 3D chargé et prêt pour l\'interaction'
            },
            
            ar: {
                // UI Elements (RTL language)
                'ui.controls': 'التحكم',
                'ui.loadModel': 'تحميل النموذج',
                'ui.assetLibrary': 'مكتبة الأصول',
                'ui.environment': 'البيئة',
                'ui.lighting': 'الإضاءة',
                'ui.effects': 'التأثيرات',
                'ui.animation': 'الرسوم المتحركة',
                'ui.superheroMode': 'وضع البطل الخارق',
                'ui.camera': 'الكاميرا',
                'ui.fileManager': 'مدير الملفات',
                'ui.analysisTools': 'أدوات التحليل',
                'ui.exportSystem': 'نظام التصدير',
                
                // Actions
                'action.load': 'تحميل',
                'action.search': 'بحث',
                'action.play': 'تشغيل',
                'action.pause': 'إيقاف مؤقت',
                'action.reset': 'إعادة تعيين',
                'action.export': 'تصدير',
                'action.save': 'حفظ',
                'action.cancel': 'إلغاء',
                'action.close': 'إغلاق',
                'action.browse': 'تصفح',
                
                // Accessibility
                'a11y.skipToContent': 'انتقل إلى المحتوى الرئيسي',
                'a11y.openMenu': 'فتح القائمة',
                'a11y.closeMenu': 'إغلاق القائمة',
                'a11y.toggleSidebar': 'تبديل الشريط الجانبي',
                'a11y.modelViewer': 'عارض النماذج ثلاثية الأبعاد',
                'a11y.loadingModel': 'تحميل النموذج ثلاثي الأبعاد',
                'a11y.modelLoaded': 'تم تحميل النموذج ثلاثي الأبعاد وهو جاهز للتفاعل'
            }
        };
        
        return translations[languageCode] || translations[this.fallbackLanguage];
    }

    /**
     * Translate a key to the current language
     */
    t(key, params = {}) {
        const currentTranslations = this.translations.get(this.currentLanguage);
        const fallbackTranslations = this.translations.get(this.fallbackLanguage);
        
        let translation = currentTranslations?.[key] || fallbackTranslations?.[key] || key;
        
        // Replace parameters in translation
        Object.entries(params).forEach(([param, value]) => {
            translation = translation.replace(`{{${param}}}`, value);
        });
        
        return translation;
    }

    /**
     * Change the current language
     */
    async setLanguage(languageCode) {
        if (!this.supportedLanguages.has(languageCode)) {
            console.warn(`Unsupported language: ${languageCode}`);
            return false;
        }

        const oldLanguage = this.currentLanguage;
        this.currentLanguage = languageCode;
        this.currentLocale = this.supportedLanguages.get(languageCode).locale;
        
        // Load language if not already loaded
        if (!this.loadedLanguages.has(languageCode)) {
            await this.loadLanguage(languageCode);
        }
        
        // Update formatters
        this.setupFormatters();
        
        // Apply language settings
        this.applyLanguageSettings();
        
        // Save preference
        localStorage.setItem('preferred-language', languageCode);
        
        // Emit language change event
        this.coreEngine.emit('i18n:language:changed', {
            oldLanguage,
            newLanguage: languageCode,
            locale: this.currentLocale
        });
        
        return true;
    }

    /**
     * Apply language settings to the UI
     */
    applyLanguageSettings() {
        const langConfig = this.supportedLanguages.get(this.currentLanguage);
        
        // Set document language and direction
        document.documentElement.lang = this.currentLanguage;
        document.documentElement.dir = langConfig.rtl ? 'rtl' : 'ltr';
        
        // Add/remove RTL class
        document.body.classList.toggle('rtl', langConfig.rtl);
        document.body.classList.toggle('ltr', !langConfig.rtl);
        
        // Update all translatable elements
        this.updateTranslatableElements();
        
        // Apply cultural adaptations
        this.applyCulturalAdaptations();
    }

    /**
     * Update all elements with translation keys
     */
    updateTranslatableElements() {
        // Update elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (element.tagName === 'INPUT' && element.type === 'text') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        });
        
        // Update elements with data-i18n-title attribute
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });
        
        // Update elements with data-i18n-aria-label attribute
        document.querySelectorAll('[data-i18n-aria-label]').forEach(element => {
            const key = element.getAttribute('data-i18n-aria-label');
            element.setAttribute('aria-label', this.t(key));
        });
    }

    /**
     * Setup number, date, and currency formatters
     */
    setupFormatters() {
        try {
            this.numberFormatter = new Intl.NumberFormat(this.currentLocale);
            this.dateFormatter = new Intl.DateTimeFormat(this.currentLocale);
            this.currencyFormatter = new Intl.NumberFormat(this.currentLocale, {
                style: 'currency',
                currency: this.getCurrencyForLocale(this.currentLocale)
            });
        } catch (error) {
            console.warn('Failed to setup formatters:', error);
            // Fallback to basic formatters
            this.numberFormatter = { format: (num) => num.toString() };
            this.dateFormatter = { format: (date) => date.toString() };
            this.currencyFormatter = { format: (num) => `$${num}` };
        }
    }

    /**
     * Get currency code for locale
     */
    getCurrencyForLocale(locale) {
        const currencyMap = {
            'en-US': 'USD',
            'en-GB': 'GBP',
            'es-ES': 'EUR',
            'fr-FR': 'EUR',
            'de-DE': 'EUR',
            'zh-CN': 'CNY',
            'ja-JP': 'JPY',
            'ar-SA': 'SAR',
            'he-IL': 'ILS',
            'ru-RU': 'RUB',
            'pt-BR': 'BRL'
        };
        
        return currencyMap[locale] || 'USD';
    }

    /**
     * Apply cultural adaptations
     */
    applyCulturalAdaptations() {
        const langConfig = this.supportedLanguages.get(this.currentLanguage);
        
        // Apply RTL-specific styles
        if (langConfig.rtl) {
            document.body.classList.add('rtl-layout');
            
            // Adjust specific UI elements for RTL
            this.adjustRTLElements();
        } else {
            document.body.classList.remove('rtl-layout');
        }
        
        // Apply cultural color preferences
        this.applyCulturalColors();
    }

    /**
     * Adjust UI elements for RTL languages
     */
    adjustRTLElements() {
        // Reverse flex directions where appropriate
        document.querySelectorAll('.toolbar, .button-group').forEach(element => {
            element.style.flexDirection = 'row-reverse';
        });
        
        // Adjust icon positions
        document.querySelectorAll('.icon-left').forEach(element => {
            element.classList.remove('icon-left');
            element.classList.add('icon-right');
        });
    }

    /**
     * Apply cultural color preferences
     */
    applyCulturalColors() {
        // Different cultures have different color associations
        const culturalColors = {
            'zh': { primary: '#c41e3a', secondary: '#ffd700' }, // Red and gold for Chinese
            'ja': { primary: '#bc002d', secondary: '#ffffff' }, // Red and white for Japanese
            'ar': { primary: '#006c35', secondary: '#ffffff' }, // Green and white for Arabic
            'he': { primary: '#0038b8', secondary: '#ffffff' }  // Blue and white for Hebrew
        };
        
        const colors = culturalColors[this.currentLanguage];
        if (colors) {
            document.documentElement.style.setProperty('--cultural-primary', colors.primary);
            document.documentElement.style.setProperty('--cultural-secondary', colors.secondary);
        }
    }

    /**
     * Format number according to current locale
     */
    formatNumber(number, options = {}) {
        try {
            const formatter = new Intl.NumberFormat(this.currentLocale, options);
            return formatter.format(number);
        } catch (error) {
            return number.toString();
        }
    }

    /**
     * Format date according to current locale
     */
    formatDate(date, options = {}) {
        try {
            const formatter = new Intl.DateTimeFormat(this.currentLocale, options);
            return formatter.format(date);
        } catch (error) {
            return date.toString();
        }
    }

    /**
     * Format currency according to current locale
     */
    formatCurrency(amount, currency = null) {
        try {
            const currencyCode = currency || this.getCurrencyForLocale(this.currentLocale);
            const formatter = new Intl.NumberFormat(this.currentLocale, {
                style: 'currency',
                currency: currencyCode
            });
            return formatter.format(amount);
        } catch (error) {
            return `$${amount}`;
        }
    }

    /**
     * Get list of supported languages
     */
    getSupportedLanguages() {
        return Array.from(this.supportedLanguages.entries()).map(([code, config]) => ({
            code,
            ...config
        }));
    }

    /**
     * Check if current language is RTL
     */
    isRTL() {
        return this.supportedLanguages.get(this.currentLanguage)?.rtl || false;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for language change requests
        this.coreEngine.on('i18n:change:language', async (data) => {
            await this.setLanguage(data.language);
        });
        
        // Listen for translation requests
        this.coreEngine.on('i18n:translate', (data) => {
            const translation = this.t(data.key, data.params);
            this.coreEngine.emit('i18n:translation:result', {
                key: data.key,
                translation,
                requestId: data.requestId
            });
        });
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Remove event listeners
        this.coreEngine.off('i18n:change:language');
        this.coreEngine.off('i18n:translate');
        
        // Clear translations
        this.translations.clear();
        this.loadedLanguages.clear();
        this.culturalSettings.clear();
        
        // Reset formatters
        this.numberFormatter = null;
        this.dateFormatter = null;
        this.currencyFormatter = null;
        
        this.initialized = false;
    }
}