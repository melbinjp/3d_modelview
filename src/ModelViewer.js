import * as THREE from 'three';
import { CoreEngine } from './core/CoreEngine.js';
import { RenderingEngine } from './rendering/RenderingEngine.js';
import { AssetManager } from './assets/AssetManager.js';
import { UIManager } from './ui/UIManager.js';
import { ExportSystem } from './export/ExportSystem.js';
import { AnalysisManager } from './analysis/AnalysisManager.js';
import { PerformanceManager } from './performance/PerformanceManager.js';
import { ModelEditingManager } from './editing/ModelEditingManager.js';
import { SuperheroMode } from '../superhero-mode.js';

/**
 * @class ModelViewer
 * @description Main application class that orchestrates all modules.
 * This class is responsible for initializing the core engine and all associated managers,
 * handling user interactions, and managing the main animation loop.
 * It serves as the central hub of the 3D model viewer application.
 *
 * @property {CoreEngine} core - The core engine instance.
 * @property {RenderingEngine} renderingEngine - Manages all Three.js rendering.
 * @property {AssetManager} assetManager - Handles loading and managing assets.
 * @property {UIManager} uiManager - Manages the user interface.
 * @property {ExportSystem} exportSystem - Handles exporting models and screenshots.
 * @property {AnalysisManager} analysisManager - Provides analysis and measurement tools.
 * @property {ModelEditingManager} modelEditingManager - Manages model editing features.
 * @property {PerformanceManager} performanceManager - Manages performance monitoring and optimization.
 * @property {SuperheroMode} superhero - Legacy superhero mode instance.
 * @property {object} stats - Tracks basic model and performance statistics.
 * @property {boolean} initialized - Flag indicating if the viewer has been initialized.
 */
export class ModelViewer {
    constructor() {
        // Initialize core engine
        this.core = new CoreEngine();
        
        // Initialize modules
        this.renderingEngine = new RenderingEngine(this.core);
        this.assetManager = new AssetManager(this.core);
        this.uiManager = new UIManager(this.core);
        this.exportSystem = new ExportSystem(this.core);
        this.analysisManager = new AnalysisManager(this.core);
        this.modelEditingManager = new ModelEditingManager(this.core);
        this.performanceManager = null; // Will be initialized after rendering engine
        
        // Register modules with core
        this.core.registerModule('rendering', this.renderingEngine);
        this.core.registerModule('assets', this.assetManager);
        this.core.registerModule('ui', this.uiManager);
        this.core.registerModule('export', this.exportSystem);
        this.core.registerModule('analysis', this.analysisManager);
        this.core.registerModule('editing', this.modelEditingManager);
        
        // Legacy superhero mode (will be refactored in later tasks)
        this.superhero = null;
        
        // Stats tracking
        this.stats = { vertices: 0, faces: 0, fps: 60 };
        
        this.initialized = false;
    }

    /**
     * @method init
     * @description Initializes the ModelViewer application.
     * This method sets up the core engine, all managers, event listeners, and starts the animation loop.
     * It also handles the creation of a fallback container if the default is not found.
     * @async
     * @returns {Promise<void>} A promise that resolves when initialization is complete.
     * @throws {Error} If a critical error occurs during initialization.
     */
    async init() {
        if (this.initialized) {
            console.warn('ModelViewer already initialized');
            return;
        }

        try {
            await this.core.init();
            const container = this._getViewerContainer();
            await this._initializeModules(container);
            this._setupEventListeners();
            this._finalizeInitialization();
        } catch (error) {
            this._handleInitializationError(error);
        }
    }

    _getViewerContainer() {
        let container = document.getElementById('viewerContainer');
        if (!container) {
            container = document.getElementById('viewer') ||
                document.getElementById('canvas-container') ||
                document.querySelector('.viewer-container') ||
                document.querySelector('#app');

            if (!container) {
                container = document.createElement('div');
                container.id = 'viewerContainer';
                container.style.cssText = 'width: 100%; height: 100vh; position: relative;';
                document.body.appendChild(container);
                console.warn('Created fallback viewer container');
            }
        }
        return container;
    }

    async _initializeModules(container) {
        this.renderingEngine.init(container);
        this._initializePerformanceManager();
        await this.assetManager.init();
        await this.uiManager.init();
        this.exportSystem.init();
        this.analysisManager.init();
        await this.modelEditingManager.initialize();
    }

    _initializePerformanceManager() {
        try {
            this.performanceManager = new PerformanceManager(
                this.core,
                this.renderingEngine.renderer,
                this.renderingEngine.scene,
                this.renderingEngine.camera
            );
            this.core.registerModule('performance', this.performanceManager);
            this.performanceManager.init();
            console.log('PerformanceManager initialized successfully');
        } catch (perfError) {
            console.warn('PerformanceManager initialization failed:', perfError);
            this.performanceManager = null;
        }
    }

    _setupEventListeners() {
        // Initialize superhero mode with legacy interface
        this.superhero = new SuperheroMode(this);
        
        // Set initial sidebar state
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebarToggleBtn');
        if (sidebar && toggleBtn) {
            sidebar.classList.add('collapsed');
            toggleBtn.classList.remove('active');
        }
        this.setupEventListeners();
    }

    _finalizeInitialization() {
        this.animate();
        this.hideLoadingScreen();
        this.initialized = true;
    }

    _handleInitializationError(error) {
        if (this.uiManager && this.uiManager.notificationSystem) {
            this.uiManager.notificationSystem.showNotification({
                id: `init-error-${Date.now()}`,
                type: 'error',
                message: `Failed to initialize ModelViewer: ${error.message}`,
                duration: 0
            });
        } else {
            console.error('Failed to initialize ModelViewer:', error);
        }
        throw error;
    }


    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Core event listeners
        this.core.on('assets:model:loaded', (data) => this.onModelLoaded(data));
        this.core.on('rendering:model:added', (data) => this.onModelAddedToScene(data));
        this.core.on('assets:load:sample', (data) => this.handleLoadSample(data));
        
        // UI event listeners
        this.setupFileHandling();
        this.setupControls();
        this.setupSampleModels();
    }

    /**
     * Setup file handling (drag & drop, file input, URL loading)
     */
    setupFileHandling() {
        // URL loading
        const loadUrlBtn = document.getElementById('loadUrlBtn');
        const modelUrl = document.getElementById('modelUrl');
        
        if (loadUrlBtn) {
            loadUrlBtn.addEventListener('click', () => {
                const url = modelUrl?.value?.trim();
                if (url) {
                    if (this.isValidModelUrl(url)) {
                        this.loadModelFromUrl(url);
                    } else {
                        // Silent validation - no user message
                        console.warn('Invalid model URL provided:', url);
                    }
                }
            });
        }
        
        if (modelUrl) {
            modelUrl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const url = e.target.value.trim();
                    if (url) {
                        if (this.isValidModelUrl(url)) {
                            this.loadModelFromUrl(url);
                        } else {
                            // Silent validation - no user message
                            console.warn('Invalid model URL provided:', url);
                        }
                    }
                }
            });
        }

        // File drag & drop
        const fileDrop = document.getElementById('fileDrop');
        const fileInput = document.getElementById('fileInput');
        
        if (fileDrop && fileInput) {
            fileDrop.addEventListener('click', () => fileInput.click());
            
            fileDrop.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileDrop.classList.add('dragover');
            });
            
            fileDrop.addEventListener('dragleave', () => {
                fileDrop.classList.remove('dragover');
            });
            
            fileDrop.addEventListener('drop', (e) => {
                e.preventDefault();
                fileDrop.classList.remove('dragover');
                if (e.dataTransfer.files.length > 0) {
                    this.loadModelFromFile(e.dataTransfer.files[0]);
                }
            });
            
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.loadModelFromFile(e.target.files[0]);
                }
            });
        }
    }

    /**
     * Setup control event listeners
     */
    setupControls() {
        // Background controls
        const backgroundSelect = document.getElementById('backgroundSelect');
        const bgColor = document.getElementById('bgColor');
        
        if (backgroundSelect) {
            backgroundSelect.addEventListener('change', (e) => this.updateBackground(e.target.value));
        }
        
        if (bgColor) {
            bgColor.addEventListener('input', (e) => {
                this.renderingEngine.setBackground(new THREE.Color(e.target.value));
            });
        }

        // Lighting controls
        this.setupLightingControls();
        
        // Environment controls
        this.setupEnvironmentControls();
        
        // Camera controls
        this.setupCameraControls();
        
        // Export controls
        this.setupExportControls();
        
        // Animation controls
        this.setupAnimationControls();
        
        // Visual controls
        this.setupVisualControls();
    }

    /**
     * Setup lighting controls
     */
    setupLightingControls() {
        const ambientIntensity = document.getElementById('ambientIntensity');
        const directionalIntensity = document.getElementById('directionalIntensity');
        const lightPosX = document.getElementById('lightPosX');
        const lightPosY = document.getElementById('lightPosY');
        
        if (ambientIntensity) {
            ambientIntensity.addEventListener('input', (e) => {
                this.renderingEngine.lights.ambient.intensity = parseFloat(e.target.value);
                this.updateValueDisplay(e.target);
            });
        }
        
        if (directionalIntensity) {
            directionalIntensity.addEventListener('input', (e) => {
                this.renderingEngine.lights.directional.intensity = parseFloat(e.target.value);
                this.updateValueDisplay(e.target);
            });
        }
        
        if (lightPosX) {
            lightPosX.addEventListener('input', (e) => {
                this.renderingEngine.lights.directional.position.x = parseFloat(e.target.value);
                this.updateValueDisplay(e.target);
            });
        }
        
        if (lightPosY) {
            lightPosY.addEventListener('input', (e) => {
                this.renderingEngine.lights.directional.position.y = parseFloat(e.target.value);
                this.updateValueDisplay(e.target);
            });
        }
    }

    /**
     * Setup environment controls
     */
    setupEnvironmentControls() {
        const loadHdriBtn = document.getElementById('loadHdriBtn');
        const hdriUrl = document.getElementById('hdriUrl');
        const envIntensity = document.getElementById('envIntensity');
        
        if (loadHdriBtn && hdriUrl) {
            loadHdriBtn.addEventListener('click', () => {
                const url = hdriUrl.value.trim();
                if (url) this.loadEnvironment(url);
            });
        }
        
        if (envIntensity) {
            envIntensity.addEventListener('input', (e) => {
                this.renderingEngine.renderer.toneMappingExposure = parseFloat(e.target.value);
                this.updateValueDisplay(e.target);
            });
        }

        // Sample HDRI buttons
        document.querySelectorAll('.sample-hdri-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const url = btn.dataset.url;
                if (hdriUrl) hdriUrl.value = url;
                this.loadEnvironment(url);
            });
        });
    }

    /**
     * Setup camera controls
     */
    setupCameraControls() {
        const autoRotate = document.getElementById('autoRotate');
        const rotationSpeed = document.getElementById('rotationSpeed');
        const resetCamera = document.getElementById('resetCamera');
        const fitToView = document.getElementById('fitToView');
        
        if (autoRotate) {
            autoRotate.addEventListener('change', (e) => {
                this.renderingEngine.controls.autoRotate = e.target.checked;
            });
        }
        
        if (rotationSpeed) {
            rotationSpeed.addEventListener('input', (e) => {
                this.renderingEngine.controls.autoRotateSpeed = parseFloat(e.target.value);
                this.updateValueDisplay(e.target);
            });
        }
        
        if (resetCamera) {
            resetCamera.addEventListener('click', () => this.renderingEngine.resetCamera());
        }
        
        if (fitToView) {
            fitToView.addEventListener('click', () => this.renderingEngine.fitCameraToModel());
        }
    }

    /**
     * Setup export controls
     */
    setupExportControls() {
        const screenshotBtn = document.getElementById('screenshotBtn');
        const exportBtn = document.getElementById('exportBtn');
        
        if (screenshotBtn) {
            screenshotBtn.addEventListener('click', () => this.exportSystem.exportScreenshot());
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                // Show the comprehensive export panel
                if (this.uiManager && this.uiManager.exportPanel) {
                    this.uiManager.exportPanel.show();
                } else {
                    // Fallback to simple export
                    this.exportSystem.exportModel();
                }
            });
        }
    }

    /**
     * Setup animation controls
     */
    setupAnimationControls() {
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const resetBtn = document.getElementById('resetBtn');
        
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.renderingEngine.animationPaused = false;
                if (this.renderingEngine.mixer) {
                    this.renderingEngine.mixer.timeScale = 1;
                }
            });
        }
        
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                this.renderingEngine.animationPaused = true;
                if (this.renderingEngine.mixer) {
                    this.renderingEngine.mixer.timeScale = 0;
                }
            });
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.renderingEngine.animationPaused = false;
                if (this.renderingEngine.mixer) {
                    this.renderingEngine.mixer.setTime(0);
                }
            });
        }
    }

    /**
     * Setup visual controls
     */
    setupVisualControls() {
        const showGrid = document.getElementById('showGrid');
        const bloomEnabled = document.getElementById('bloomEnabled');
        const bloomStrength = document.getElementById('bloomStrength');
        
        if (showGrid) {
            showGrid.addEventListener('change', (e) => {
                this.renderingEngine.gridHelper.visible = e.target.checked;
            });
        }
        
        if (bloomEnabled) {
            bloomEnabled.addEventListener('change', (e) => {
                this.renderingEngine.bloomPass.enabled = e.target.checked;
            });
        }
        
        if (bloomStrength) {
            bloomStrength.addEventListener('input', (e) => {
                this.renderingEngine.bloomPass.strength = parseFloat(e.target.value);
                this.updateValueDisplay(e.target);
            });
        }

        // Initialize value displays
        document.querySelectorAll('.slider').forEach(slider => this.updateValueDisplay(slider));
    }

    /**
     * Setup measurement system
     */

    /**
     * Setup sample model buttons - now uses unified loading system
     */
    setupSampleModels() {
        setTimeout(() => {
            document.querySelectorAll('.sample-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const sampleId = btn.dataset.sampleId;
                    if (sampleId) {
                        // Load sample model through unified system
                        await this.loadSampleModel(sampleId);
                    }
                });
            });
        }, 100);
    }

    /**
     * Load a sample model by ID through the unified loading system
     */
    async loadSampleModel(sampleId) {
        try {
            // Get sample model info from OnlineLibraryManager
            const sampleModel = await this.assetManager.onlineLibraryManager.getSampleModel(sampleId);
            
            if (!sampleModel) {
                throw new Error(`Sample model '${sampleId}' not found`);
            }

            // Update URL input to show what's being loaded
            const modelUrl = document.getElementById('modelUrl');
            if (modelUrl) {
                modelUrl.value = sampleModel.downloadUrl;
            }

            // Use the unified model loading system
            await this.loadModel(sampleModel.downloadUrl, 'url');
            
            // Emit event for analytics/tracking
            this.core.emit('sampleModelLoaded', {
                id: sampleId,
                name: sampleModel.name,
                url: sampleModel.downloadUrl
            });

        } catch (error) {
            console.error(`Failed to load sample model '${sampleId}':`, error);
            this.core.emit('error', {
                type: 'SampleModelLoadError',
                message: `Failed to load sample model: ${error.message}`,
                context: { sampleId }
            });
        }
    }

    /**
     * Handle loading sample model from keyboard shortcut
     */
    async handleLoadSample(data) {
        const sampleIds = ['duck', 'avocado', 'damaged-helmet'];
        const sampleId = sampleIds[data.index];
        
        if (sampleId) {
            await this.loadSampleModel(sampleId);
        } else {
            console.warn(`No sample model defined for index ${data.index}`);
        }
    }

    /**
     * @method loadModel
     * @description Unified model loading method that handles all sources (URL, file, sample).
     * @param {string|File} source - The model source, either a URL string or a File object.
     * @param {string} [type='auto'] - The type of the source ('url', 'file', 'auto').
     * @returns {Promise<object>} A promise that resolves with the loaded model data.
     * @throws {Error} If the model source is invalid or loading fails.
     */
    async loadModel(source, type = 'auto') {
        try {
            // Show loading state
            this.core.setState({ isLoading: true });
            
            let result;
            
            // Determine source type and load accordingly
            if (typeof source === 'string') {
                // URL or sample model
                console.log(`Loading model from URL: ${source}`);
                result = await this.assetManager.loadModelFromUrl(source);
            } else if (source instanceof File) {
                // File upload
                console.log(`Loading model from file: ${source.name}`);
                result = await this.assetManager.loadModelFromFile(source);
            } else {
                throw new Error('Invalid model source provided');
            }
            
            // Clear loading state
            this.core.setState({ isLoading: false });
            
            console.log('Model loaded successfully:', result);
            return result;
            
        } catch (error) {
            this.core.setState({ isLoading: false, error: error.message });
            console.error('Error loading model:', error);
            
            // Show user-friendly error message
            this.showLoadingError(error, source);
            throw error;
        }
    }

    /**
     * @method isValidModelUrl
     * @description Validates if a given URL is a valid model URL based on its extension.
     * @param {string} url - The URL to validate.
     * @returns {boolean} True if the URL is valid, false otherwise.
     */
    isValidModelUrl(url) {
        try {
            const urlObj = new URL(url);
            const supportedExtensions = ['.glb', '.gltf', '.fbx', '.obj', '.dae', '.stl', '.ply'];
            const pathname = urlObj.pathname.toLowerCase();
            return supportedExtensions.some(ext => pathname.endsWith(ext));
        } catch (error) {
            return false;
        }
    }

    /**
     * @method loadModelFromUrl
     * @description Legacy wrapper for the unified model loading method.
     * @param {string} url - The URL of the model to load.
     * @returns {Promise<object>} A promise that resolves with the loaded model data.
     */
    async loadModelFromUrl(url) {
        return this.loadModel(url, 'url');
    }

    /**
     * @method loadModelFromFile
     * @description Legacy wrapper for the unified model loading method.
     * @param {File} file - The model file to load.
     * @returns {Promise<object>} A promise that resolves with the loaded model data.
     */
    async loadModelFromFile(file) {
        return this.loadModel(file, 'file');
    }

    /**
     * @method showLoadingError
     * @description Displays a user-friendly error message when model loading fails.
     * @param {Error} error - The error object.
     * @param {string|File} source - The source of the model that failed to load.
     */
    showLoadingError(error, source) {
        const sourceName = typeof source === 'string' ?
            source.split('/').pop() :
            source.name || 'Unknown';

        const errorMessage = `Failed to load "${sourceName}": ${error.message}`;

        if (this.uiManager && this.uiManager.notificationSystem) {
            this.uiManager.notificationSystem.showNotification({
                id: `loading-error-${Date.now()}`,
                type: 'error',
                message: errorMessage,
                duration: 10000 // 10 seconds
            });
        } else {
            console.error(errorMessage);
        }
    }

    /**
     * @method loadEnvironment
     * @description Loads an environment map (HDRI) from a URL and applies it to the scene.
     * @param {string} url - The URL of the HDRI file.
     * @async
     * @returns {Promise<void>} A promise that resolves when the environment is loaded and applied.
     */
    async loadEnvironment(url) {
        try {
            console.log('Loading environment from:', url);
            const texture = await this.assetManager.loadEnvironmentFromUrl(url);
            this.renderingEngine.setBackground(texture);
            this.renderingEngine.setEnvironment(texture);
            
            // Update ground plane material for shadow catching
            const shadowCatcherMaterial = new THREE.ShadowMaterial({ opacity: 0.5 });
            this.renderingEngine.groundPlane.material = shadowCatcherMaterial;
            
            console.log('Environment loaded successfully');
        } catch (error) {
            if (this.uiManager && this.uiManager.notificationSystem) {
                this.uiManager.notificationSystem.showNotification({
                    id: `env-error-${Date.now()}`,
                    type: 'error',
                    message: `Failed to load environment: ${error.message}`,
                    duration: 10000
                });
            } else {
                console.error('Error loading environment:', error);
            }
            
            // Fallback to default environment
            try {
                this.renderingEngine.setBackground(null);
                this.renderingEngine.setEnvironment(null);
            } catch (fallbackError) {
                console.error('Failed to reset environment:', fallbackError);
            }
        }
    }

    /**
     * Handle model loaded event
     */
    onModelLoaded(data) {
        // Silent model loading
        
        if (!data.model) {
            console.error('No model in loaded data');
            return;
        }
        
        // Add model to scene through rendering engine
        this.renderingEngine.addModel(data.model);
        
        // Handle animations
        if (data.animations && data.animations.length > 0) {
            // Silent animation setup
            this.renderingEngine.mixer = new THREE.AnimationMixer(data.model);
            data.animations.forEach(clip => {
                this.renderingEngine.mixer.clipAction(clip).play();
            });
        } else {
            // Silent - no animations
        }
    }

    /**
     * Handle model added to scene event
     */
    onModelAddedToScene(data) {
        try {
            if (!data?.model) {
                console.warn('ModelViewer: No model provided to onModelAddedToScene');
                return;
            }

            // Fit camera to model
            this.renderingEngine.fitCameraToModel();
            
            // Force complete refresh to ensure visibility
            this.renderingEngine.forceRefresh();
            
            // Additional refresh after a short delay
            setTimeout(() => {
                this.renderingEngine.forceRefresh();
            }, 100);
            
            // Update stats
            this.updateModelStats(data.model);
            
            // Emit event for other modules to react to model being added
            this.core.emit('model:scene-ready', { 
                model: data.model, 
                stats: this.stats,
                timestamp: Date.now()
            });
            
        } catch (error) {
            if (this.uiManager && this.uiManager.notificationSystem) {
                this.uiManager.notificationSystem.showNotification({
                    id: `model-add-error-${Date.now()}`,
                    type: 'error',
                    message: `Error processing model: ${error.message}`,
                    duration: 10000
                });
            } else {
                console.error('ModelViewer: Error in onModelAddedToScene:', error);
            }
            
            // Use error manager if available
            if (this.core?.getErrorManager) {
                this.core.getErrorManager().handleError(error, {
                    type: 'model_scene_integration_error',
                    severity: 'medium',
                    context: { hasModel: !!data?.model, modelType: data?.model?.type }
                });
            }
        }
    }

    /**
     * Update model statistics
     */
    updateModelStats(model) {
        const stats = this.analysisManager.calculateModelStatistics(model);
        this.stats.vertices = stats.vertices;
        this.stats.faces = stats.faces;
    }

    /**
     * Update background
     */
    updateBackground(type) {
        switch (type) {
            case 'gradient':
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 512;
                const ctx = canvas.getContext('2d');
                const gradient = ctx.createLinearGradient(0, 0, 0, 512);
                gradient.addColorStop(0, '#667eea');
                gradient.addColorStop(1, '#764ba2');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 512, 512);
                const texture = new THREE.CanvasTexture(canvas);
                this.renderingEngine.setBackground(texture);
                break;
            case 'solid':
                const color = document.getElementById('bgColor')?.value || '#f0f0f0';
                this.renderingEngine.setBackground(new THREE.Color(color));
                break;
            case 'hdri':
                // Create simple sky gradient
                const hdriCanvas = document.createElement('canvas');
                hdriCanvas.width = 1024;
                hdriCanvas.height = 512;
                const hdriCtx = hdriCanvas.getContext('2d');
                
                const skyGradient = hdriCtx.createLinearGradient(0, 0, 0, 512);
                skyGradient.addColorStop(0, '#87CEEB');
                skyGradient.addColorStop(0.7, '#98D8E8');
                skyGradient.addColorStop(1, '#F0F8FF');
                hdriCtx.fillStyle = skyGradient;
                hdriCtx.fillRect(0, 0, 1024, 512);
                
                // Add sun
                hdriCtx.beginPath();
                hdriCtx.arc(800, 100, 50, 0, Math.PI * 2);
                hdriCtx.fillStyle = '#FFF8DC';
                hdriCtx.fill();
                
                const hdriTexture = new THREE.CanvasTexture(hdriCanvas);
                hdriTexture.mapping = THREE.EquirectangularReflectionMapping;
                this.renderingEngine.setBackground(hdriTexture);
                this.renderingEngine.setEnvironment(hdriTexture);
                break;
        }
    }

    /**
     * Update value display for sliders
     */
    updateValueDisplay(slider) {
        const valueDisplay = slider.parentElement.querySelector('.value-display');
        if (valueDisplay) {
            valueDisplay.textContent = parseFloat(slider.value).toFixed(1);
        }
    }

    /**
     * Toggle measurement mode
     */

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const mainContainer = document.getElementById('mainContainer');
        
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
        
        if (mainContainer) {
            mainContainer.classList.remove('hidden');
        }
    }

    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update FPS counter
        const delta = this.renderingEngine.clock.getDelta();
        this.stats.fps = Math.round(1 / delta);
        const fpsCounter = document.getElementById('fpsCounter');
        if (fpsCounter) {
            fpsCounter.textContent = this.stats.fps;
        }

        // Update performance manager
        if (this.performanceManager) {
            this.performanceManager.update(delta);
        }

        // Always update rendering engine
        this.renderingEngine.update();
        
        // Update superhero mode (legacy)
        if (this.superhero) {
            this.superhero.update();
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        try {
            // Cleanup modules in reverse order of initialization
            if (this.superhero) {
                if (typeof this.superhero.destroy === 'function') {
                    this.superhero.destroy();
                }
                this.superhero = null;
            }
            
            if (this.performanceManager) {
                this.performanceManager.destroy();
                this.performanceManager = null;
            }
            
            // Cleanup other managers
            [this.analysisManager, this.exportSystem, this.uiManager, 
             this.assetManager, this.renderingEngine].forEach(manager => {
                if (manager && typeof manager.destroy === 'function') {
                    try {
                        manager.destroy();
                    } catch (error) {
                        console.warn('Error destroying manager:', error);
                    }
                }
            });
            
            // Cleanup core engine last
            if (this.core) {
                this.core.destroy();
                this.core = null;
            }
            
            // Clear references
            this.stats = null;
            this.raycaster = null;
            
            this.initialized = false;
            
        } catch (error) {
            console.error('Error during ModelViewer cleanup:', error);
        }
    }
}