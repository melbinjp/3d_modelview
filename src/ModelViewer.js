import * as THREE from 'three';
import { CoreEngine } from './core/CoreEngine.js';
import { RenderingEngine } from './rendering/RenderingEngine.js';
import { AssetManager } from './assets/AssetManager.js';
import { UIManager } from './ui/UIManager.js';
import { PerformanceManager } from './performance/PerformanceManager.js';
import { ExportSystem } from './export/ExportSystem.js';
import { AnalysisManager } from './analysis/AnalysisManager.js';
import { ModelEditingManager } from './editing/ModelEditingManager.js';

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

        // Register modules with core
        this.core.registerModule('rendering', this.renderingEngine);
        this.core.registerModule('assets', this.assetManager);
        this.core.registerModule('ui', this.uiManager);

        this.exportSystem = new ExportSystem(this.core);
        this.analysisManager = new AnalysisManager(this.core);
        this.modelEditingManager = new ModelEditingManager(this.core);

        this.core.registerModule('export', this.exportSystem);
        this.core.registerModule('analysis', this.analysisManager);
        this.core.registerModule('editing', this.modelEditingManager);

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
        await this.renderingEngine.init(container);
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
        this.core.on('camera:reset', () => {
            const sel = document.getElementById('cameraSelect');
            if (sel) sel.value = 'free';
            this.renderingEngine.resetCamera();
        });

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
        // URL loading
        const loadUrlBtn = document.getElementById('loadUrlBtn');
        const modelUrl = document.getElementById('modelUrl');
        const loadUrlBtnSidebar = document.getElementById('loadUrlBtnSidebar');
        const modelUrlSidebar = document.getElementById('modelUrlSidebar');

        const handleUrlLoad = (inputEl) => {
            const url = inputEl?.value?.trim();
            if (!url) return;
            if (this.isValidModelUrl(url)) {
                this.loadModelFromUrl(url);
            } else {
                const msg = 'That doesn\'t look like a supported model URL. Supported: .glb, .gltf, .fbx, .obj, .dae, .stl, .ply, .3ds, .usdz, .amf';
                if (this.uiManager?.notificationSystem) {
                    this.uiManager.notificationSystem.showNotification({
                        id: `invalid-url-${Date.now()}`,
                        type: 'warning',
                        message: msg,
                        duration: 8000
                    });
                } else {
                    console.warn(msg, url);
                }
            }
        };

        if (loadUrlBtn) loadUrlBtn.addEventListener('click', () => handleUrlLoad(modelUrl));
        if (loadUrlBtnSidebar) loadUrlBtnSidebar.addEventListener('click', () => handleUrlLoad(modelUrlSidebar));

        if (modelUrl) modelUrl.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleUrlLoad(modelUrl); });
        if (modelUrlSidebar) modelUrlSidebar.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleUrlLoad(modelUrlSidebar); });

        // File drag & drop
        const fileDrop = document.getElementById('fileDrop');
        const fileInput = document.getElementById('fileInput');
        const uploadLocalBtnSidebar = document.getElementById('uploadLocalBtnSidebar');

        if (fileDrop && fileInput) {
            fileDrop.addEventListener('click', () => fileInput.click());
            
            if (uploadLocalBtnSidebar) {
                uploadLocalBtnSidebar.addEventListener('click', () => fileInput.click());
            }

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

        // Full-viewport drag & drop — let users drop a model anywhere on the page.
        this.setupGlobalDropZone();
    }

    /**
     * Enable drag & drop across the whole window with a visual overlay.
     */
    setupGlobalDropZone() {
        const overlay = document.getElementById('viewportDropOverlay');
        let dragDepth = 0;

        const hasFiles = (e) => {
            if (!e.dataTransfer) return false;
            return Array.from(e.dataTransfer.types || []).includes('Files');
        };

        window.addEventListener('dragenter', (e) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            dragDepth++;
            if (overlay) overlay.classList.add('active');
        });

        window.addEventListener('dragover', (e) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        window.addEventListener('dragleave', (e) => {
            if (!hasFiles(e)) return;
            dragDepth = Math.max(0, dragDepth - 1);
            if (dragDepth === 0 && overlay) overlay.classList.remove('active');
        });

        window.addEventListener('drop', (e) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            dragDepth = 0;
            if (overlay) overlay.classList.remove('active');
            if (e.dataTransfer.files.length > 0) {
                this.loadModelFromFile(e.dataTransfer.files[0]);
            }
        });
    }

    /**
     * Setup control event listeners
     */
    setupControls() {
        // Background controls
        const backgroundSelect = document.getElementById('backgroundSelect');
        const bgColor = document.getElementById('bgColor');
        const hdrPresetGroup = document.getElementById('hdrPresetGroup');
        const hdrPresetSelect = document.getElementById('hdrPresetSelect');

        if (backgroundSelect) {
            backgroundSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                this.updateBackground(val);
                if (hdrPresetGroup) {
                    hdrPresetGroup.style.display = val === 'hdri' ? 'block' : 'none';
                }
            });
        }

        if (hdrPresetSelect) {
            hdrPresetSelect.addEventListener('change', (e) => {
                this.renderingEngine.applyHDRPreset(e.target.value);
            });
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
     * Update scene background
     */
    updateBackground(type) {
        if (!this.renderingEngine) return;
        switch (type) {
            case 'gradient':
                this.renderingEngine.scene.background = null;
                this.renderingEngine.renderer.setClearColor(0x0f1729, 1);
                break;
            case 'solid':
                this.renderingEngine.scene.background = new THREE.Color(0x1a1a2e);
                break;
            case 'hdri': {
                const preset = document.getElementById('hdrPresetSelect')?.value || 'studio';
                this.renderingEngine.applyHDRPreset(preset);
                break;
            }
        }
    }
    /**
     * Setup lighting controls
     */
    setupLightingControls() {
        const ambient = document.getElementById('ambientIntensity');

        if (ambient) {
            ambient.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.renderingEngine.lights.ambient.intensity = val;
                const valEl = document.getElementById('ambientIntensityVal');
                if (valEl) valEl.textContent = val.toFixed(1);
            });
        }
    }

    /**
     * Setup environment controls
     */
    setupEnvironmentControls() {
        const envIntensity = document.getElementById('envIntensity');
        const hdrToggle = document.getElementById('hdrToggle');

        if (envIntensity) {
            envIntensity.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.renderingEngine.renderer.toneMappingExposure = val;
                const valEl = document.getElementById('envIntensityVal');
                if (valEl) valEl.textContent = val.toFixed(1);
            });
        }

        if (hdrToggle) {
            hdrToggle.addEventListener('change', (e) => {
                this.renderingEngine.toggleHDR(e.target.checked);
            });
        }

        // Custom HDRI / EXR loading (URL + file upload)
        const hdriUrl = document.getElementById('hdriUrl');
        const loadHdriUrlBtn = document.getElementById('loadHdriUrlBtn');
        const uploadHdriBtn = document.getElementById('uploadHdriBtn');
        const hdriFileInput = document.getElementById('hdriFileInput');

        const loadHdri = (source) => {
            this.renderingEngine.loadCustomHDRI(source).catch((err) => {
                const msg = `Failed to load HDRI: ${err?.message || 'unknown error'}`;
                if (this.uiManager?.notificationSystem) {
                    this.uiManager.notificationSystem.showNotification({
                        id: `hdri-error-${Date.now()}`, type: 'error', message: msg, duration: 8000
                    });
                } else {
                    console.error(msg);
                }
            });
        };

        if (loadHdriUrlBtn && hdriUrl) {
            loadHdriUrlBtn.addEventListener('click', () => {
                const url = hdriUrl.value.trim();
                if (url) loadHdri(url);
            });
            hdriUrl.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && hdriUrl.value.trim()) loadHdri(hdriUrl.value.trim());
            });
        }
        if (uploadHdriBtn && hdriFileInput) {
            uploadHdriBtn.addEventListener('click', () => hdriFileInput.click());
            hdriFileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) loadHdri(e.target.files[0]);
            });
        }
    }

    /**
     * Setup camera controls
     */
    setupCameraControls() {
        const autoRotate = document.getElementById('autoRotate');

        if (autoRotate) {
            autoRotate.addEventListener('change', (e) => {
                this.renderingEngine.controls.autoRotate = e.target.checked;
            });
        }

        // Active camera selector (free orbit vs. embedded model cameras)
        const cameraSelect = document.getElementById('cameraSelect');
        if (cameraSelect) {
            cameraSelect.addEventListener('change', (e) => {
                const re = this.renderingEngine;
                const val = e.target.value;
                if (val === 'free') {
                    re.setActiveCamera(re.freeCamera);
                } else {
                    const cam = re.modelCameras?.[parseInt(val, 10)];
                    if (cam) {
                        re.setActiveCamera(cam);
                    }
                }
                // Auto-orbit only applies to the free camera
                if (autoRotate) {
                    re.controls.autoRotate = (val === 'free') && autoRotate.checked;
                }
            });
        }

        // Reset Camera button
        const resetCameraBtn = document.getElementById('resetCamera');
        if (resetCameraBtn) {
            resetCameraBtn.addEventListener('click', () => {
                if (cameraSelect) cameraSelect.value = 'free';
                this.renderingEngine.resetCamera();
            });
        }

        // Fit Model to View button
        const fitToViewBtn = document.getElementById('fitToView');
        if (fitToViewBtn) {
            fitToViewBtn.addEventListener('click', () => {
                const re = this.renderingEngine;
                if (re.camera !== re.freeCamera) {
                    if (cameraSelect) cameraSelect.value = 'free';
                    re.setActiveCamera(re.freeCamera);
                }
                re.fitCameraToModel();
            });
        }

        // 3D printability check
        this.setupPrintabilityCheck();
    }

    /**
     * Wire the "Check Printability" button to the PrintabilityChecker.
     */
    setupPrintabilityCheck() {
        const btn = document.getElementById('checkPrintabilityBtn');
        const results = document.getElementById('printabilityResults');
        if (!btn || !results) return;

        btn.addEventListener('click', async () => {
            const model = this.core.getState().currentModel;
            if (!model) {
                results.innerHTML = 'Load a model first, then run the check.';
                return;
            }
            results.innerHTML = 'Analyzing model…';
            // Defer so the UI can paint the "Analyzing" state for big meshes
            await new Promise(r => setTimeout(r, 30));
            try {
                if (!this._printabilityChecker) {
                    const { PrintabilityChecker } = await import('./analysis/PrintabilityChecker.js');
                    this._printabilityChecker = new PrintabilityChecker(this.core);
                }
                const report = this._printabilityChecker.analyzeModel(model);
                results.innerHTML = this._printabilityChecker.renderReportHTML(report);
            } catch (err) {
                console.error('Printability check failed:', err);
                results.innerHTML = `Could not analyze this model: ${err?.message || 'unknown error'}`;
            }
        });
    }

    /**
     * Setup export controls
     */
    setupExportControls() {
        const screenshotBtn = document.getElementById('screenshotBtnSidebar') || document.getElementById('screenshotBtn');
        const exportBtn = document.getElementById('exportBtnSidebar') || document.getElementById('exportBtn');

        if (screenshotBtn) {
            screenshotBtn.addEventListener('click', () => {
                this.exportSystem.exportScreenshot();
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportSystem.exportModel('glb');
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
        const animSpeed = document.getElementById('animSpeed');
        const animClipSelect = document.getElementById('animClipSelect');

        if (playBtn) playBtn.addEventListener('click', () => {
            const re = this.renderingEngine;
            re.animationPaused = false;
            if (re.mixer) re.mixer.timeScale = parseFloat(animSpeed?.value || '1');
        });

        if (pauseBtn) pauseBtn.addEventListener('click', () => {
            this.renderingEngine.animationPaused = true;
        });

        if (resetBtn) resetBtn.addEventListener('click', () => {
            const re = this.renderingEngine;
            if (re.mixer) {
                re.mixer.setTime(0);
                re.animationActions?.forEach(a => a.reset().play());
                re.animationPaused = false;
            }
        });

        if (animClipSelect) {
            animClipSelect.addEventListener('change', (e) => {
                this.playAnimationClip(e.target.value);
            });
        }

        if (animSpeed) {
            animSpeed.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                if (this.renderingEngine.mixer) {
                    this.renderingEngine.mixer.timeScale = val;
                }
                const valEl = document.getElementById('animSpeedVal');
                if (valEl) valEl.textContent = `${val.toFixed(1)}x`;
            });
        }
    }

    /**
     * Setup visual controls
     */
    setupVisualControls() {
        const showGrid = document.getElementById('showGrid');
        if (showGrid) {
            showGrid.addEventListener('change', (e) => {
                this.renderingEngine.gridHelper.visible = e.target.checked;
            });
        }

        // Physics controls
        this.setupPhysicsControls();
        
        // Cinematic controls
        this.setupCinematicControls();
    }

    /**
     * Setup cinematic controls
     */
    setupCinematicControls() {
        const superheroBtn = document.getElementById('superheroBtn');
        if (superheroBtn) {
            superheroBtn.addEventListener('click', async () => {
                try {
                    const superhero = await this.core.loadModule('superhero');
                    if (!superhero.isActive) {
                        superhero.activate();
                    } else {
                        superhero.deactivate();
                    }
                } catch (e) {
                    console.warn('Cinematic module not available:', e);
                }
            });
        }
    }

    /**
     * Setup physics controls
     */
    setupPhysicsControls() {
        const enablePhysics = document.getElementById('enablePhysics');
        const debugPhysics = document.getElementById('debugPhysics');
        const resetPhysics = document.getElementById('resetPhysics');

        if (enablePhysics) {
            enablePhysics.addEventListener('change', async (e) => {
                const physics = await this.core.loadModule('physics');
                physics.enabled = e.target.checked;
            });
        }

        if (debugPhysics) {
            debugPhysics.addEventListener('change', async (e) => {
                const physics = await this.core.loadModule('physics');
                physics.debug = e.target.checked;
            });
        }

        if (resetPhysics) {
            resetPhysics.addEventListener('click', async () => {
                const physics = await this.core.loadModule('physics');
                physics.reset();
            });
        }
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
            const supportedExtensions = [
                '.glb', '.gltf', '.fbx', '.obj', '.dae',
                '.stl', '.ply', '.3ds', '.usdz', '.usd', '.amf'
            ];
            const pathname = urlObj.pathname.toLowerCase();
            const hasKnownExtension = supportedExtensions.some(ext => pathname.endsWith(ext));

            // Accept known extensions outright. For URLs without a recognizable
            // file extension (proxies, CDN endpoints, blob/data URLs) we still
            // allow the attempt — the loader will surface a clear error if the
            // format is unsupported, which is friendlier than silently refusing.
            const lastSegment = pathname.split('/').pop() || '';
            const looksLikeFile = lastSegment.includes('.');

            return hasKnownExtension || !looksLikeFile;
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
        if (!data.model) {
            console.error('No model in loaded data');
            return;
        }

        // Add model to scene through rendering engine
        this.renderingEngine.addModel(data.model);

        // Setup animations (works for GLTF, FBX, etc.) and the clip UI
        this.setupModelAnimations(data.model, data.animations);

        // Populate the camera selector with any embedded model cameras
        this.setupModelCameras(data.cameras);
    }

    /**
     * Setup the animation mixer and wire the clip selector / playback UI.
     * Works whether or not the model contains animations.
     */
    setupModelAnimations(model, animations) {
        const re = this.renderingEngine;

        // Clean up any previous mixer
        if (re.mixer) {
            re.mixer.stopAllAction();
            re.mixer = null;
        }
        re.animationActions = [];
        re.animationClips = animations || [];
        re.animationPaused = false;

        const clipSelect = document.getElementById('animClipSelect');
        const animControls = document.getElementById('animationControls');

        if (!animations || animations.length === 0) {
            if (animControls) animControls.style.display = 'none';
            if (clipSelect) clipSelect.innerHTML = '<option value="all">All Clips</option>';
            return;
        }

        re.mixer = new THREE.AnimationMixer(model);
        animations.forEach((clip) => {
            re.animationActions.push(re.mixer.clipAction(clip));
        });

        // Play everything by default
        re.animationActions.forEach(a => a.reset().play());

        // Honor the current speed slider
        const speed = parseFloat(document.getElementById('animSpeed')?.value || '1');
        re.mixer.timeScale = speed;

        if (clipSelect) {
            clipSelect.innerHTML = '<option value="all">All Clips</option>' +
                animations.map((c, i) =>
                    `<option value="${i}">${c.name || ('Clip ' + (i + 1))}</option>`
                ).join('');
            clipSelect.value = 'all';
        }
        if (animControls) animControls.style.display = '';
    }

    /**
     * Play a single animation clip by index, or all clips when index is null.
     */
    playAnimationClip(index) {
        const re = this.renderingEngine;
        if (!re.mixer || !re.animationActions?.length) return;

        re.animationPaused = false;
        re.mixer.timeScale = parseFloat(document.getElementById('animSpeed')?.value || '1');

        if (index === null || index === 'all') {
            re.animationActions.forEach(a => a.reset().play());
            return;
        }
        const i = parseInt(index, 10);
        re.animationActions.forEach((a, idx) => {
            if (idx === i) {
                a.reset().play();
            } else {
                a.stop();
            }
        });
    }

    /**
     * Populate the camera selector with embedded cameras and reset to free view.
     */
    setupModelCameras(cameras) {
        const re = this.renderingEngine;
        re.modelCameras = cameras || [];

        // Always view a freshly loaded model through the free orbit camera first
        if (re.freeCamera) {
            re.setActiveCamera(re.freeCamera);
        }

        const select = document.getElementById('cameraSelect');
        if (!select) return;

        let html = '<option value="free">Free Orbit Camera</option>';
        re.modelCameras.forEach((cam, i) => {
            html += `<option value="${i}">${cam.name || ('Model Camera ' + (i + 1))}</option>`;
        });
        select.innerHTML = html;
        select.value = 'free';
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

            // Add physics body to model
            if (this.physicsEngine) {
                this.physicsEngine.addRigidBody(data.model, { 
                    type: 'dynamic', 
                    shape: 'box', 
                    mass: 5 
                });
                this.physicsEngine.enable();
            }

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
    async updateModelStats(model) {
        try {
            const analysisManager = await this.core.loadModule('analysis');
            const stats = analysisManager.calculateModelStatistics(model);
            this.stats.vertices = stats.vertices;
            this.stats.faces = stats.faces;
        } catch (e) {
            console.warn('Could not update model stats:', e);
        }
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
        
        // Throttle DOM updates for FPS to prevent flickering
        const now = performance.now();
        if (!this.lastFpsUpdate || now - this.lastFpsUpdate > 500) {
            const fpsCounter = document.getElementById('fpsCounter');
            if (fpsCounter) {
                // Pad to 2 digits to prevent layout shift
                fpsCounter.textContent = this.stats.fps.toString().padStart(2, '0');
            }
            this.lastFpsUpdate = now;
        }

        // Update performance manager
        if (this.performanceManager) {
            this.performanceManager.update(delta);
        }

        // Always update rendering engine (pass delta to avoid double getDelta)
        this.renderingEngine.update(delta);

        // Update physics engine
        const physicsEngine = this.core.getModule('physics');
        if (physicsEngine) {
            physicsEngine.step(delta);
        }

        // Update superhero mode (legacy)
        const superhero = this.core.getModule('superhero');
        if (superhero) {
            superhero.update();
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