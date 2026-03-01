import * as THREE from 'three';

/**
 * ModelEditingManager - Client-side model editing and modification features
 * Provides transformation tools, material editing, texture swapping, and annotation system
 */
export class ModelEditingManager {
    constructor(coreEngine) {
        this.coreEngine = coreEngine;
        this.renderingEngine = null;
        
        // Editing state
        this.editingMode = 'none'; // 'transform', 'material', 'texture', 'geometry', 'annotate'
        this.selectedObject = null;
        this.transformControls = null;
        this.originalTransforms = new Map();
        
        // Material editing
        this.materialEditor = null;
        this.originalMaterials = new Map();
        this.materialPreview = true;
        
        // Texture management
        this.textureLibrary = new Map();
        this.textureSwapper = null;
        
        // Geometry editing
        this.geometryEditor = null;
        this.geometryHistory = [];
        
        // Annotation system
        this.annotations = new Map();
        this.annotationMarkers = [];
        this.annotationMode = false;
        
        // Screenshot system
        this.screenshotManager = null;
        
        // Undo/Redo system
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = 50;
        
        this.initialized = false;
    }

    /**
     * Initialize the model editing manager
     */
    async initialize() {
        if (this.initialized) {
            console.warn('ModelEditingManager already initialized');
            return;
        }

        this.renderingEngine = this.coreEngine.getModule('rendering');
        if (!this.renderingEngine) {
            throw new Error('RenderingEngine not found');
        }

        this.setupEventListeners();
        this.initializeTransformControls();
        this.initializeMaterialEditor();
        this.initializeTextureSwapper();
        this.initializeGeometryEditor();
        this.initializeAnnotationSystem();
        this.initializeScreenshotManager();
        this.setupUI();
        this.loadAnnotationsFromStorage();
        
        this.initialized = true;
        this.coreEngine.emit('editing:initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for model loading events
        this.coreEngine.on('assets:model:loaded', (data) => this.onModelLoaded(data));
        this.coreEngine.on('rendering:model:added', (data) => this.onModelAddedToScene(data));
        
        // Listen for object selection
        const viewerContainer = document.getElementById('viewerContainer');
        if (viewerContainer) {
            viewerContainer.addEventListener('click', (e) => this.onViewportClick(e));
            viewerContainer.addEventListener('dblclick', (e) => this.onViewportDoubleClick(e));
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    /**
     * Initialize transform controls
     */
    initializeTransformControls() {
        // Import TransformControls dynamically to avoid loading issues
        import('three/examples/jsm/controls/TransformControls.js').then(({ TransformControls }) => {
            this.transformControls = new TransformControls(
                this.renderingEngine.camera,
                this.renderingEngine.renderer.domElement
            );
            
            this.transformControls.addEventListener('change', () => {
                this.renderingEngine.renderer.render(
                    this.renderingEngine.scene,
                    this.renderingEngine.camera
                );
            });
            
            this.transformControls.addEventListener('dragging-changed', (event) => {
                this.renderingEngine.controls.enabled = !event.value;
            });
            
            this.transformControls.addEventListener('objectChange', () => {
                this.onTransformChange();
            });
            
            this.renderingEngine.scene.add(this.transformControls);
        }).catch(error => {
            console.error('Failed to load TransformControls:', error);
        });
    }

    /**
     * Initialize material editor
     */
    initializeMaterialEditor() {
        this.materialEditor = {
            currentMaterial: null,
            properties: new Map(),
            previewEnabled: true
        };
    }

    /**
     * Initialize texture swapper
     */
    initializeTextureSwapper() {
        this.textureSwapper = {
            currentTexture: null,
            textureSlot: null,
            previewTexture: null
        };
        
        // Load default texture library
        this.loadDefaultTextures();
    }

    /**
     * Initialize geometry editor
     */
    initializeGeometryEditor() {
        this.geometryEditor = {
            currentGeometry: null,
            editingVertices: false,
            selectedVertices: new Set(),
            vertexHelpers: []
        };
    }

    /**
     * Initialize annotation system
     */
    initializeAnnotationSystem() {
        this.annotations = new Map();
        this.annotationMarkers = [];
        this.annotationCounter = 0;
    }

    /**
     * Initialize screenshot manager
     */
    initializeScreenshotManager() {
        this.screenshotManager = {
            resolutions: [
                { name: '1920x1080', width: 1920, height: 1080 },
                { name: '1280x720', width: 1280, height: 720 },
                { name: '3840x2160', width: 3840, height: 2160 },
                { name: '2560x1440', width: 2560, height: 1440 },
                { name: 'Custom', width: 1920, height: 1080 }
            ],
            currentResolution: 0,
            transparentBackground: false,
            customWidth: 1920,
            customHeight: 1080
        };
    }

    /**
     * Setup editing UI
     */
    setupUI() {
        this.createEditingPanel();
        this.createTransformControls();
        this.createMaterialEditor();
        this.createTextureSwapper();
        this.createGeometryEditor();
        this.createAnnotationTools();
        this.createScreenshotTools();
    }

    /**
     * Create main editing panel
     */
    createEditingPanel() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        const editingPanel = document.createElement('div');
        editingPanel.className = 'accordion-item';
        editingPanel.innerHTML = `
            <div class="accordion-header">
                <h3>Model Editing</h3>
                <svg class="accordion-icon" viewBox="0 0 24 24">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            </div>
            <div class="accordion-content">
                <div class="editing-modes">
                    <div class="mode-buttons">
                        <button id="transformMode" class="mode-btn" data-mode="transform">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            Transform
                        </button>
                        <button id="materialMode" class="mode-btn" data-mode="material">
                            <svg viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M12 6v6l4 2"/>
                            </svg>
                            Material
                        </button>
                        <button id="textureMode" class="mode-btn" data-mode="texture">
                            <svg viewBox="0 0 24 24">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                                <path d="M9 9h6v6H9z"/>
                            </svg>
                            Texture
                        </button>
                        <button id="geometryMode" class="mode-btn" data-mode="geometry">
                            <svg viewBox="0 0 24 24">
                                <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5"/>
                            </svg>
                            Geometry
                        </button>
                        <button id="annotateMode" class="mode-btn" data-mode="annotate">
                            <svg viewBox="0 0 24 24">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                            Annotate
                        </button>
                    </div>
                    
                    <div class="editing-info">
                        <div id="selectionInfo" class="selection-info">
                            No object selected. Click on a model to start editing.
                        </div>
                    </div>
                </div>
                
                <div class="editing-actions">
                    <button id="undoEdit" class="action-btn" disabled>
                        <svg viewBox="0 0 24 24">
                            <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
                        </svg>
                        Undo
                    </button>
                    <button id="redoEdit" class="action-btn" disabled>
                        <svg viewBox="0 0 24 24">
                            <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/>
                        </svg>
                        Redo
                    </button>
                    <button id="resetEdits" class="action-btn secondary">
                        <svg viewBox="0 0 24 24">
                            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                        </svg>
                        Reset
                    </button>
                </div>
            </div>
        `;

        sidebar.appendChild(editingPanel);
        this.setupEditingEventListeners();
    }

    /**
     * Create transform controls UI
     */
    createTransformControls() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        const transformPanel = document.createElement('div');
        transformPanel.className = 'accordion-item editing-panel';
        transformPanel.id = 'transformPanel';
        transformPanel.style.display = 'none';
        transformPanel.innerHTML = `
            <div class="accordion-header">
                <h3>Transform Tools</h3>
                <svg class="accordion-icon" viewBox="0 0 24 24">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            </div>
            <div class="accordion-content">
                <div class="transform-tools">
                    <div class="transform-modes">
                        <button id="translateMode" class="transform-btn active" data-mode="translate">
                            <svg viewBox="0 0 24 24">
                                <path d="M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7z"/>
                            </svg>
                            Move
                        </button>
                        <button id="rotateMode" class="transform-btn" data-mode="rotate">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                            Rotate
                        </button>
                        <button id="scaleMode" class="transform-btn" data-mode="scale">
                            <svg viewBox="0 0 24 24">
                                <path d="M15 3l2.3 2.3-2.89 2.87 1.42 1.42L18.7 6.7 21 9V3h-6zM3 9l2.3-2.3 2.87 2.89 1.42-1.42L6.7 5.3 9 3H3v6zm6 12l-2.3-2.3 2.89-2.87-1.42-1.42L5.3 17.3 3 15v6h6zm12-6l-2.3 2.3-2.87-2.89-1.42 1.42 2.89 2.87L15 21h6v-6z"/>
                            </svg>
                            Scale
                        </button>
                    </div>
                    
                    <div class="transform-values">
                        <div class="value-group">
                            <label>Position</label>
                            <div class="xyz-inputs">
                                <input type="number" id="posX" placeholder="X" step="0.1">
                                <input type="number" id="posY" placeholder="Y" step="0.1">
                                <input type="number" id="posZ" placeholder="Z" step="0.1">
                            </div>
                        </div>
                        
                        <div class="value-group">
                            <label>Rotation (degrees)</label>
                            <div class="xyz-inputs">
                                <input type="number" id="rotX" placeholder="X" step="1">
                                <input type="number" id="rotY" placeholder="Y" step="1">
                                <input type="number" id="rotZ" placeholder="Z" step="1">
                            </div>
                        </div>
                        
                        <div class="value-group">
                            <label>Scale</label>
                            <div class="xyz-inputs">
                                <input type="number" id="scaleX" placeholder="X" step="0.1" min="0.1">
                                <input type="number" id="scaleY" placeholder="Y" step="0.1" min="0.1">
                                <input type="number" id="scaleZ" placeholder="Z" step="0.1" min="0.1">
                            </div>
                            <label class="uniform-scale">
                                <input type="checkbox" id="uniformScale" checked>
                                Uniform Scale
                            </label>
                        </div>
                    </div>
                    
                    <div class="transform-presets">
                        <button class="preset-btn" data-preset="center">Center</button>
                        <button class="preset-btn" data-preset="ground">Ground</button>
                        <button class="preset-btn" data-preset="reset">Reset</button>
                    </div>
                </div>
            </div>
        `;

        sidebar.appendChild(transformPanel);
        this.setupTransformEventListeners();
    }

    /**
     * Create material editor UI
     */
    createMaterialEditor() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        const materialPanel = document.createElement('div');
        materialPanel.className = 'accordion-item editing-panel';
        materialPanel.id = 'materialPanel';
        materialPanel.style.display = 'none';
        materialPanel.innerHTML = `
            <div class="accordion-header">
                <h3>Material Editor</h3>
                <svg class="accordion-icon" viewBox="0 0 24 24">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            </div>
            <div class="accordion-content">
                <div class="material-editor">
                    <div class="material-selection">
                        <label>Material:</label>
                        <select id="materialSelect">
                            <option value="">Select material...</option>
                        </select>
                    </div>
                    
                    <div id="materialProperties" class="material-properties">
                        <div class="property-group">
                            <label>Base Color</label>
                            <div class="color-input">
                                <input type="color" id="materialColor" value="#ffffff">
                                <input type="range" id="materialOpacity" min="0" max="1" step="0.01" value="1">
                                <span class="value-display">1.0</span>
                            </div>
                        </div>
                        
                        <div class="property-group">
                            <label>Metalness</label>
                            <input type="range" id="materialMetalness" min="0" max="1" step="0.01" value="0">
                            <span class="value-display">0.0</span>
                        </div>
                        
                        <div class="property-group">
                            <label>Roughness</label>
                            <input type="range" id="materialRoughness" min="0" max="1" step="0.01" value="0.5">
                            <span class="value-display">0.5</span>
                        </div>
                        
                        <div class="property-group">
                            <label>Emissive</label>
                            <div class="color-input">
                                <input type="color" id="materialEmissive" value="#000000">
                                <input type="range" id="materialEmissiveIntensity" min="0" max="2" step="0.1" value="0">
                                <span class="value-display">0.0</span>
                            </div>
                        </div>
                        
                        <div class="property-group">
                            <label>Normal Scale</label>
                            <input type="range" id="materialNormalScale" min="0" max="2" step="0.1" value="1">
                            <span class="value-display">1.0</span>
                        </div>
                    </div>
                    
                    <div class="material-actions">
                        <label class="preview-toggle">
                            <input type="checkbox" id="materialPreview" checked>
                            Real-time Preview
                        </label>
                        <button id="applyMaterial" class="btn primary">Apply Changes</button>
                        <button id="resetMaterial" class="btn secondary">Reset Material</button>
                    </div>
                </div>
            </div>
        `;

        sidebar.appendChild(materialPanel);
        this.setupMaterialEventListeners();
    }

    /**
     * Create texture swapper UI
     */
    createTextureSwapper() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        const texturePanel = document.createElement('div');
        texturePanel.className = 'accordion-item editing-panel';
        texturePanel.id = 'texturePanel';
        texturePanel.style.display = 'none';
        texturePanel.innerHTML = `
            <div class="accordion-header">
                <h3>Texture Swapper</h3>
                <svg class="accordion-icon" viewBox="0 0 24 24">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            </div>
            <div class="accordion-content">
                <div class="texture-swapper">
                    <div class="texture-slot-selection">
                        <label>Texture Slot:</label>
                        <select id="textureSlotSelect">
                            <option value="map">Diffuse/Base Color</option>
                            <option value="normalMap">Normal Map</option>
                            <option value="roughnessMap">Roughness Map</option>
                            <option value="metalnessMap">Metalness Map</option>
                            <option value="emissiveMap">Emissive Map</option>
                            <option value="bumpMap">Bump Map</option>
                            <option value="displacementMap">Displacement Map</option>
                            <option value="alphaMap">Alpha Map</option>
                            <option value="aoMap">AO Map</option>
                        </select>
                    </div>
                    
                    <div class="current-texture">
                        <label>Current Texture:</label>
                        <div id="currentTexturePreview" class="texture-preview">
                            <div class="no-texture">No texture assigned</div>
                        </div>
                    </div>
                    
                    <div class="texture-upload">
                        <label>Upload New Texture:</label>
                        <input type="file" id="textureUpload" accept="image/*" multiple>
                        <div class="upload-info">
                            Supported formats: JPG, PNG, WebP, HDR, EXR
                        </div>
                    </div>
                    
                    <div class="texture-library">
                        <label>Texture Library:</label>
                        <div id="textureLibraryGrid" class="texture-grid">
                            <!-- Textures will be populated here -->
                        </div>
                    </div>
                    
                    <div class="texture-settings">
                        <div class="setting-group">
                            <label>Repeat:</label>
                            <div class="xy-inputs">
                                <input type="number" id="textureRepeatX" value="1" step="0.1" min="0.1">
                                <input type="number" id="textureRepeatY" value="1" step="0.1" min="0.1">
                            </div>
                        </div>
                        
                        <div class="setting-group">
                            <label>Offset:</label>
                            <div class="xy-inputs">
                                <input type="number" id="textureOffsetX" value="0" step="0.1">
                                <input type="number" id="textureOffsetY" value="0" step="0.1">
                            </div>
                        </div>
                        
                        <div class="setting-group">
                            <label>Rotation:</label>
                            <input type="number" id="textureRotation" value="0" step="1" min="0" max="360">
                            <span>degrees</span>
                        </div>
                    </div>
                    
                    <div class="texture-actions">
                        <button id="applyTexture" class="btn primary">Apply Texture</button>
                        <button id="removeTexture" class="btn secondary">Remove Texture</button>
                    </div>
                </div>
            </div>
        `;

        sidebar.appendChild(texturePanel);
        this.setupTextureEventListeners();
    }

    /**
     * Create geometry editor UI
     */
    createGeometryEditor() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        const geometryPanel = document.createElement('div');
        geometryPanel.className = 'accordion-item editing-panel';
        geometryPanel.id = 'geometryPanel';
        geometryPanel.style.display = 'none';
        geometryPanel.innerHTML = `
            <div class="accordion-header">
                <h3>Geometry Editor</h3>
                <svg class="accordion-icon" viewBox="0 0 24 24">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            </div>
            <div class="accordion-content">
                <div class="geometry-editor">
                    <div class="geometry-info">
                        <div class="info-item">
                            <span>Vertices:</span>
                            <span id="geometryVertices">-</span>
                        </div>
                        <div class="info-item">
                            <span>Faces:</span>
                            <span id="geometryFaces">-</span>
                        </div>
                    </div>
                    
                    <div class="geometry-tools">
                        <button id="subdivideGeometry" class="tool-btn">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            Subdivide
                        </button>
                        <button id="simplifyGeometry" class="tool-btn">
                            <svg viewBox="0 0 24 24">
                                <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5"/>
                            </svg>
                            Simplify
                        </button>
                        <button id="smoothGeometry" class="tool-btn">
                            <svg viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10"/>
                            </svg>
                            Smooth
                        </button>
                    </div>
                    
                    <div class="geometry-settings">
                        <div class="setting-group">
                            <label>Subdivision Level:</label>
                            <input type="range" id="subdivisionLevel" min="1" max="3" value="1">
                            <span class="value-display">1</span>
                        </div>
                        
                        <div class="setting-group">
                            <label>Simplification Ratio:</label>
                            <input type="range" id="simplificationRatio" min="0.1" max="0.9" step="0.1" value="0.5">
                            <span class="value-display">0.5</span>
                        </div>
                        
                        <div class="setting-group">
                            <label>Smoothing Factor:</label>
                            <input type="range" id="smoothingFactor" min="0.1" max="2" step="0.1" value="1">
                            <span class="value-display">1.0</span>
                        </div>
                    </div>
                    
                    <div class="geometry-actions">
                        <button id="applyGeometryChanges" class="btn primary">Apply Changes</button>
                        <button id="resetGeometry" class="btn secondary">Reset Geometry</button>
                    </div>
                </div>
            </div>
        `;

        sidebar.appendChild(geometryPanel);
        this.setupGeometryEventListeners();
    }

    /**
     * Create annotation tools UI
     */
    createAnnotationTools() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        const annotationPanel = document.createElement('div');
        annotationPanel.className = 'accordion-item editing-panel';
        annotationPanel.id = 'annotationPanel';
        annotationPanel.style.display = 'none';
        annotationPanel.innerHTML = `
            <div class="accordion-header">
                <h3>Annotations</h3>
                <svg class="accordion-icon" viewBox="0 0 24 24">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            </div>
            <div class="accordion-content">
                <div class="annotation-tools">
                    <div class="annotation-controls">
                        <button id="addAnnotation" class="btn primary">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            Add Annotation
                        </button>
                        <button id="toggleAnnotations" class="btn secondary">
                            <svg viewBox="0 0 24 24">
                                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                            </svg>
                            Toggle Visibility
                        </button>
                        <button id="clearAnnotations" class="btn secondary">
                            <svg viewBox="0 0 24 24">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                            Clear All
                        </button>
                    </div>
                    
                    <div class="annotation-list">
                        <h4>Annotations</h4>
                        <div id="annotationsList" class="annotations-list">
                            <div class="no-annotations">No annotations yet. Click "Add Annotation" and then click on the model.</div>
                        </div>
                    </div>
                    
                    <div class="annotation-settings">
                        <div class="setting-group">
                            <label>Marker Size:</label>
                            <input type="range" id="annotationSize" min="0.5" max="3" step="0.1" value="1">
                            <span class="value-display">1.0</span>
                        </div>
                        
                        <div class="setting-group">
                            <label>Marker Color:</label>
                            <input type="color" id="annotationColor" value="#ff4444">
                        </div>
                        
                        <div class="setting-group">
                            <label>Text Size:</label>
                            <input type="range" id="annotationTextSize" min="12" max="24" value="16">
                            <span class="value-display">16px</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        sidebar.appendChild(annotationPanel);
        this.setupAnnotationEventListeners();
    }

    /**
     * Create screenshot tools UI
     */
    createScreenshotTools() {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        const screenshotPanel = document.createElement('div');
        screenshotPanel.className = 'accordion-item editing-panel';
        screenshotPanel.id = 'screenshotPanel';
        screenshotPanel.style.display = 'none';
        screenshotPanel.innerHTML = `
            <div class="accordion-header">
                <h3>Screenshot & Capture</h3>
                <svg class="accordion-icon" viewBox="0 0 24 24">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            </div>
            <div class="accordion-content">
                <div class="screenshot-tools">
                    <div class="resolution-settings">
                        <label>Resolution:</label>
                        <select id="screenshotResolution">
                            <option value="0">1920x1080 (Full HD)</option>
                            <option value="1">1280x720 (HD)</option>
                            <option value="2">3840x2160 (4K)</option>
                            <option value="3">2560x1440 (QHD)</option>
                            <option value="4">Custom</option>
                        </select>
                        
                        <div id="customResolution" class="custom-resolution" style="display: none;">
                            <div class="resolution-inputs">
                                <input type="number" id="customWidth" placeholder="Width" value="1920" min="100">
                                <span>×</span>
                                <input type="number" id="customHeight" placeholder="Height" value="1080" min="100">
                            </div>
                        </div>
                    </div>
                    
                    <div class="screenshot-options">
                        <label class="option-toggle">
                            <input type="checkbox" id="transparentBackground">
                            Transparent Background
                        </label>
                        <label class="option-toggle">
                            <input type="checkbox" id="hideUI" checked>
                            Hide UI Elements
                        </label>
                        <label class="option-toggle">
                            <input type="checkbox" id="highQuality" checked>
                            High Quality Rendering
                        </label>
                    </div>
                    
                    <div class="screenshot-actions">
                        <button id="takeScreenshot" class="btn primary">
                            <svg viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="3.2"/>
                                <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
                            </svg>
                            Take Screenshot
                        </button>
                        <button id="captureViewport" class="btn secondary">
                            <svg viewBox="0 0 24 24">
                                <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
                            </svg>
                            Capture Viewport
                        </button>
                    </div>
                    
                    <div class="capture-history">
                        <h4>Recent Captures</h4>
                        <div id="captureHistory" class="capture-history-list">
                            <div class="no-captures">No captures yet.</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        sidebar.appendChild(screenshotPanel);
        this.setupScreenshotEventListeners();
    }

    /**
     * Setup main editing event listeners
     */
    setupEditingEventListeners() {
        // Mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.setEditingMode(mode);
            });
        });

        // Action buttons
        const undoBtn = document.getElementById('undoEdit');
        const redoBtn = document.getElementById('redoEdit');
        const resetBtn = document.getElementById('resetEdits');

        if (undoBtn) {
            undoBtn.addEventListener('click', () => this.undo());
        }

        if (redoBtn) {
            redoBtn.addEventListener('click', () => this.redo());
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetAllEdits());
        }
    }

    /**
     * Setup transform event listeners
     */
    setupTransformEventListeners() {
        // Transform mode buttons
        document.querySelectorAll('.transform-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.setTransformMode(mode);
            });
        });

        // Transform value inputs
        const inputs = ['posX', 'posY', 'posZ', 'rotX', 'rotY', 'rotZ', 'scaleX', 'scaleY', 'scaleZ'];
        inputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('change', () => this.updateTransformFromInputs());
            }
        });

        // Uniform scale checkbox
        const uniformScale = document.getElementById('uniformScale');
        if (uniformScale) {
            uniformScale.addEventListener('change', (e) => {
                this.uniformScale = e.target.checked;
            });
        }

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                this.applyTransformPreset(preset);
            });
        });
    }

    /**
     * Setup material event listeners
     */
    setupMaterialEventListeners() {
        // Material selection
        const materialSelect = document.getElementById('materialSelect');
        if (materialSelect) {
            materialSelect.addEventListener('change', (e) => {
                this.selectMaterial(e.target.value);
            });
        }

        // Material property inputs
        const properties = [
            'materialColor', 'materialOpacity', 'materialMetalness', 
            'materialRoughness', 'materialEmissive', 'materialEmissiveIntensity',
            'materialNormalScale'
        ];

        properties.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => {
                    if (this.materialEditor.previewEnabled) {
                        this.updateMaterialPreview();
                    }
                    this.updateValueDisplay(input);
                });
            }
        });

        // Preview toggle
        const previewToggle = document.getElementById('materialPreview');
        if (previewToggle) {
            previewToggle.addEventListener('change', (e) => {
                this.materialEditor.previewEnabled = e.target.checked;
            });
        }

        // Action buttons
        const applyBtn = document.getElementById('applyMaterial');
        const resetBtn = document.getElementById('resetMaterial');

        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applyMaterialChanges());
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetMaterial());
        }
    }

    /**
     * Setup texture event listeners
     */
    setupTextureEventListeners() {
        // Texture slot selection
        const slotSelect = document.getElementById('textureSlotSelect');
        if (slotSelect) {
            slotSelect.addEventListener('change', (e) => {
                this.selectTextureSlot(e.target.value);
            });
        }

        // Texture upload
        const uploadInput = document.getElementById('textureUpload');
        if (uploadInput) {
            uploadInput.addEventListener('change', (e) => {
                this.handleTextureUpload(e.target.files);
            });
        }

        // Texture settings
        const settings = ['textureRepeatX', 'textureRepeatY', 'textureOffsetX', 'textureOffsetY', 'textureRotation'];
        settings.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => this.updateTextureSettings());
            }
        });

        // Action buttons
        const applyBtn = document.getElementById('applyTexture');
        const removeBtn = document.getElementById('removeTexture');

        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applyTextureChanges());
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', () => this.removeTexture());
        }
    }

    /**
     * Setup geometry event listeners
     */
    setupGeometryEventListeners() {
        // Geometry tools
        const subdivideBtn = document.getElementById('subdivideGeometry');
        const simplifyBtn = document.getElementById('simplifyGeometry');
        const smoothBtn = document.getElementById('smoothGeometry');

        if (subdivideBtn) {
            subdivideBtn.addEventListener('click', () => this.subdivideGeometry());
        }

        if (simplifyBtn) {
            simplifyBtn.addEventListener('click', () => this.simplifyGeometry());
        }

        if (smoothBtn) {
            smoothBtn.addEventListener('click', () => this.smoothGeometry());
        }

        // Settings
        const settings = ['subdivisionLevel', 'simplificationRatio', 'smoothingFactor'];
        settings.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => this.updateValueDisplay(input));
            }
        });

        // Action buttons
        const applyBtn = document.getElementById('applyGeometryChanges');
        const resetBtn = document.getElementById('resetGeometry');

        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applyGeometryChanges());
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetGeometry());
        }
    }

    /**
     * Setup annotation event listeners
     */
    setupAnnotationEventListeners() {
        // Annotation controls
        const addBtn = document.getElementById('addAnnotation');
        const toggleBtn = document.getElementById('toggleAnnotations');
        const clearBtn = document.getElementById('clearAnnotations');

        if (addBtn) {
            addBtn.addEventListener('click', () => this.startAnnotationMode());
        }

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleAnnotationVisibility());
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllAnnotations());
        }

        // Settings
        const settings = ['annotationSize', 'annotationTextSize'];
        settings.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => {
                    this.updateAnnotationSettings();
                    this.updateValueDisplay(input);
                });
            }
        });

        const colorInput = document.getElementById('annotationColor');
        if (colorInput) {
            colorInput.addEventListener('input', () => this.updateAnnotationSettings());
        }
    }

    /**
     * Setup screenshot event listeners
     */
    setupScreenshotEventListeners() {
        // Resolution selection
        const resolutionSelect = document.getElementById('screenshotResolution');
        const customResolution = document.getElementById('customResolution');

        if (resolutionSelect) {
            resolutionSelect.addEventListener('change', (e) => {
                const isCustom = e.target.value === '4';
                customResolution.style.display = isCustom ? 'block' : 'none';
                this.screenshotManager.currentResolution = parseInt(e.target.value);
            });
        }

        // Custom resolution inputs
        const customWidth = document.getElementById('customWidth');
        const customHeight = document.getElementById('customHeight');

        if (customWidth) {
            customWidth.addEventListener('change', (e) => {
                this.screenshotManager.customWidth = parseInt(e.target.value);
            });
        }

        if (customHeight) {
            customHeight.addEventListener('change', (e) => {
                this.screenshotManager.customHeight = parseInt(e.target.value);
            });
        }

        // Options
        const transparentBg = document.getElementById('transparentBackground');
        if (transparentBg) {
            transparentBg.addEventListener('change', (e) => {
                this.screenshotManager.transparentBackground = e.target.checked;
            });
        }

        // Action buttons
        const screenshotBtn = document.getElementById('takeScreenshot');
        const captureBtn = document.getElementById('captureViewport');

        if (screenshotBtn) {
            screenshotBtn.addEventListener('click', () => this.takeScreenshot());
        }

        if (captureBtn) {
            captureBtn.addEventListener('click', () => this.captureViewport());
        }
    }

    /**
     * Handle model loaded event
     */
    onModelLoaded(data) {
        if (data.model) {
            this.resetEditingState();
            this.updateMaterialList(data.model);
        }
    }

    /**
     * Handle model added to scene event
     */
    onModelAddedToScene(data) {
        if (data.model) {
            this.currentModel = data.model;
            this.storeOriginalState(data.model);
        }
    }

    /**
     * Handle viewport click for object selection
     */
    onViewportClick(event) {
        if (this.editingMode === 'none') return;

        const rect = this.renderingEngine.renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -((event.clientY - rect.top) / rect.height) * 2 + 1
        );

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, this.renderingEngine.camera);

        const intersects = raycaster.intersectObjects(this.renderingEngine.scene.children, true);

        if (intersects.length > 0) {
            const object = intersects[0].object;
            
            if (this.annotationMode) {
                this.addAnnotationAtPoint(intersects[0].point, object);
            } else {
                this.selectObject(object);
            }
        }
    }

    /**
     * Handle viewport double-click for quick editing
     */
    onViewportDoubleClick(event) {
        // Quick access to material editing on double-click
        this.onViewportClick(event);
        if (this.selectedObject && this.selectedObject.material) {
            this.setEditingMode('material');
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    onKeyDown(event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'z':
                    event.preventDefault();
                    if (event.shiftKey) {
                        this.redo();
                    } else {
                        this.undo();
                    }
                    break;
                case 's':
                    event.preventDefault();
                    this.takeScreenshot();
                    break;
            }
        }

        // Transform shortcuts
        if (this.selectedObject && this.transformControls) {
            switch (event.key) {
                case 'g':
                    this.setTransformMode('translate');
                    break;
                case 'r':
                    this.setTransformMode('rotate');
                    break;
                case 's':
                    if (!event.ctrlKey && !event.metaKey) {
                        this.setTransformMode('scale');
                    }
                    break;
                case 'Escape':
                    this.deselectObject();
                    break;
            }
        }
    }

    /**
     * Set editing mode
     */
    setEditingMode(mode) {
        // Hide all editing panels
        document.querySelectorAll('.editing-panel').forEach(panel => {
            panel.style.display = 'none';
        });

        // Update mode buttons
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        this.editingMode = mode;

        // Show appropriate panel
        const panelMap = {
            'transform': 'transformPanel',
            'material': 'materialPanel',
            'texture': 'texturePanel',
            'geometry': 'geometryPanel',
            'annotate': 'annotationPanel'
        };

        const panelId = panelMap[mode];
        if (panelId) {
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.style.display = 'block';
            }
        }

        // Update selection info
        this.updateSelectionInfo();

        this.coreEngine.emit('editing:mode:changed', { mode });
    }

    /**
     * Select object for editing
     */
    selectObject(object) {
        // Deselect previous object
        this.deselectObject();

        this.selectedObject = object;

        // Attach transform controls if in transform mode
        if (this.editingMode === 'transform' && this.transformControls) {
            this.transformControls.attach(object);
            this.updateTransformInputs();
        }

        // Update material editor if in material mode
        if (this.editingMode === 'material') {
            this.updateMaterialEditor(object);
        }

        // Update geometry info if in geometry mode
        if (this.editingMode === 'geometry') {
            this.updateGeometryInfo(object);
        }

        this.updateSelectionInfo();
        this.coreEngine.emit('editing:object:selected', { object });
    }

    /**
     * Deselect current object
     */
    deselectObject() {
        if (this.transformControls) {
            this.transformControls.detach();
        }

        this.selectedObject = null;
        this.updateSelectionInfo();
        this.coreEngine.emit('editing:object:deselected');
    }

    /**
     * Update selection info display
     */
    updateSelectionInfo() {
        const infoElement = document.getElementById('selectionInfo');
        if (!infoElement) return;

        if (this.selectedObject) {
            const objectType = this.selectedObject.type || 'Object';
            const objectName = this.selectedObject.name || 'Unnamed';
            infoElement.textContent = `Selected: ${objectType} - ${objectName}`;
        } else {
            const modeText = this.editingMode === 'none' ? 
                'No object selected. Click on a model to start editing.' :
                `${this.editingMode.charAt(0).toUpperCase() + this.editingMode.slice(1)} mode active. Click on an object to select it.`;
            infoElement.textContent = modeText;
        }
    }

    /**
     * Store original state for undo functionality
     */
    storeOriginalState(model) {
        model.traverse((child) => {
            if (child.isMesh) {
                // Store original transform
                this.originalTransforms.set(child.uuid, {
                    position: child.position.clone(),
                    rotation: child.rotation.clone(),
                    scale: child.scale.clone()
                });

                // Store original materials
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        this.originalMaterials.set(child.uuid, child.material.map(mat => mat.clone()));
                    } else {
                        this.originalMaterials.set(child.uuid, child.material.clone());
                    }
                }
            }
        });
    }

    /**
     * Add action to history for undo/redo
     */
    addToHistory(action) {
        // Remove any actions after current index
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Add new action
        this.history.push(action);
        this.historyIndex++;
        
        // Limit history size
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.historyIndex--;
        }
        
        this.updateHistoryButtons();
    }

    /**
     * Undo last action
     */
    undo() {
        if (this.historyIndex >= 0) {
            const action = this.history[this.historyIndex];
            if (action.undo) {
                action.undo();
            }
            this.historyIndex--;
            this.updateHistoryButtons();
        }
    }

    /**
     * Redo last undone action
     */
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const action = this.history[this.historyIndex];
            if (action.redo) {
                action.redo();
            }
            this.updateHistoryButtons();
        }
    }

    /**
     * Update history button states
     */
    updateHistoryButtons() {
        const undoBtn = document.getElementById('undoEdit');
        const redoBtn = document.getElementById('redoEdit');
        
        if (undoBtn) {
            undoBtn.disabled = this.historyIndex < 0;
        }
        
        if (redoBtn) {
            redoBtn.disabled = this.historyIndex >= this.history.length - 1;
        }
    }

    /**
     * Reset all edits
     */
    resetAllEdits() {
        if (!this.currentModel) return;

        this.currentModel.traverse((child) => {
            if (child.isMesh) {
                // Reset transform
                const originalTransform = this.originalTransforms.get(child.uuid);
                if (originalTransform) {
                    child.position.copy(originalTransform.position);
                    child.rotation.copy(originalTransform.rotation);
                    child.scale.copy(originalTransform.scale);
                }

                // Reset materials
                const originalMaterial = this.originalMaterials.get(child.uuid);
                if (originalMaterial) {
                    child.material = originalMaterial;
                }
            }
        });

        // Clear history
        this.history = [];
        this.historyIndex = -1;
        this.updateHistoryButtons();

        // Clear annotations
        this.clearAllAnnotations();

        this.coreEngine.emit('editing:reset');
    }

    /**
     * Reset editing state
     */
    resetEditingState() {
        this.deselectObject();
        this.setEditingMode('none');
        this.originalTransforms.clear();
        this.originalMaterials.clear();
        this.history = [];
        this.historyIndex = -1;
        this.updateHistoryButtons();
    }

    /**
     * Load default texture library
     */
    loadDefaultTextures() {
        // Add some default procedural textures
        const defaultTextures = [
            { name: 'White', color: '#ffffff' },
            { name: 'Black', color: '#000000' },
            { name: 'Red', color: '#ff0000' },
            { name: 'Green', color: '#00ff00' },
            { name: 'Blue', color: '#0000ff' },
            { name: 'Yellow', color: '#ffff00' },
            { name: 'Magenta', color: '#ff00ff' },
            { name: 'Cyan', color: '#00ffff' }
        ];

        defaultTextures.forEach(tex => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 256;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = tex.color;
            ctx.fillRect(0, 0, 256, 256);
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.name = tex.name;
            this.textureLibrary.set(tex.name, texture);
        });

        this.updateTextureLibraryUI();
    }

    /**
     * Update texture library UI
     */
    updateTextureLibraryUI() {
        const grid = document.getElementById('textureLibraryGrid');
        if (!grid) return;

        grid.innerHTML = '';

        this.textureLibrary.forEach((texture, name) => {
            const item = document.createElement('div');
            item.className = 'texture-item';
            item.innerHTML = `
                <div class="texture-preview" style="background-image: url(${texture.image.toDataURL()})"></div>
                <div class="texture-name">${name}</div>
            `;
            
            item.addEventListener('click', () => {
                this.selectTextureFromLibrary(texture);
            });
            
            grid.appendChild(item);
        });
    }

    /**
     * Load annotations from local storage
     */
    loadAnnotationsFromStorage() {
        try {
            const saved = localStorage.getItem('model-annotations');
            if (saved) {
                const annotations = JSON.parse(saved);
                // Restore annotations if they match current model
                // This would need model identification system
            }
        } catch (error) {
            console.warn('Failed to load annotations from storage:', error);
        }
    }

    /**
     * Save annotations to local storage
     */
    saveAnnotationsToStorage() {
        try {
            const annotationsData = Array.from(this.annotations.entries()).map(([id, annotation]) => ({
                id,
                position: annotation.position.toArray(),
                text: annotation.text,
                timestamp: annotation.timestamp
            }));
            
            localStorage.setItem('model-annotations', JSON.stringify(annotationsData));
        } catch (error) {
            console.warn('Failed to save annotations to storage:', error);
        }
    }

    /**
     * Update value display for range inputs
     */
    updateValueDisplay(input) {
        const valueDisplay = input.parentElement.querySelector('.value-display');
        if (valueDisplay) {
            let value = parseFloat(input.value);
            if (input.id.includes('Text')) {
                valueDisplay.textContent = `${value}px`;
            } else {
                valueDisplay.textContent = value.toFixed(1);
            }
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Remove transform controls
        if (this.transformControls) {
            this.renderingEngine.scene.remove(this.transformControls);
            this.transformControls.dispose();
        }

        // Clear annotations
        this.clearAllAnnotations();

        // Clear event listeners
        this.coreEngine.off('assets:model:loaded', this.onModelLoaded);
        this.coreEngine.off('rendering:model:added', this.onModelAddedToScene);

        // Clear maps
        this.originalTransforms.clear();
        this.originalMaterials.clear();
        this.textureLibrary.clear();
        this.annotations.clear();

        this.initialized = false;
    }

    // ==================== TRANSFORM METHODS ====================

    /**
     * Set transform mode (translate, rotate, scale)
     */
    setTransformMode(mode) {
        if (!this.transformControls) return;

        // Update transform mode buttons
        document.querySelectorAll('.transform-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        this.transformControls.setMode(mode);
    }

    /**
     * Update transform inputs from selected object
     */
    updateTransformInputs() {
        if (!this.selectedObject) return;

        const pos = this.selectedObject.position;
        const rot = this.selectedObject.rotation;
        const scale = this.selectedObject.scale;

        // Update position inputs
        this.setInputValue('posX', pos.x.toFixed(2));
        this.setInputValue('posY', pos.y.toFixed(2));
        this.setInputValue('posZ', pos.z.toFixed(2));

        // Update rotation inputs (convert to degrees)
        this.setInputValue('rotX', THREE.MathUtils.radToDeg(rot.x).toFixed(1));
        this.setInputValue('rotY', THREE.MathUtils.radToDeg(rot.y).toFixed(1));
        this.setInputValue('rotZ', THREE.MathUtils.radToDeg(rot.z).toFixed(1));

        // Update scale inputs
        this.setInputValue('scaleX', scale.x.toFixed(2));
        this.setInputValue('scaleY', scale.y.toFixed(2));
        this.setInputValue('scaleZ', scale.z.toFixed(2));
    }

    /**
     * Update transform from input values
     */
    updateTransformFromInputs() {
        if (!this.selectedObject) return;

        const oldTransform = {
            position: this.selectedObject.position.clone(),
            rotation: this.selectedObject.rotation.clone(),
            scale: this.selectedObject.scale.clone()
        };

        // Update position
        const posX = parseFloat(document.getElementById('posX').value) || 0;
        const posY = parseFloat(document.getElementById('posY').value) || 0;
        const posZ = parseFloat(document.getElementById('posZ').value) || 0;
        this.selectedObject.position.set(posX, posY, posZ);

        // Update rotation (convert from degrees)
        const rotX = THREE.MathUtils.degToRad(parseFloat(document.getElementById('rotX').value) || 0);
        const rotY = THREE.MathUtils.degToRad(parseFloat(document.getElementById('rotY').value) || 0);
        const rotZ = THREE.MathUtils.degToRad(parseFloat(document.getElementById('rotZ').value) || 0);
        this.selectedObject.rotation.set(rotX, rotY, rotZ);

        // Update scale
        let scaleX = parseFloat(document.getElementById('scaleX').value) || 1;
        let scaleY = parseFloat(document.getElementById('scaleY').value) || 1;
        let scaleZ = parseFloat(document.getElementById('scaleZ').value) || 1;

        // Apply uniform scaling if enabled
        if (this.uniformScale) {
            scaleY = scaleZ = scaleX;
            this.setInputValue('scaleY', scaleX.toFixed(2));
            this.setInputValue('scaleZ', scaleX.toFixed(2));
        }

        this.selectedObject.scale.set(scaleX, scaleY, scaleZ);

        // Add to history
        this.addToHistory({
            type: 'transform',
            object: this.selectedObject,
            oldTransform: oldTransform,
            newTransform: {
                position: this.selectedObject.position.clone(),
                rotation: this.selectedObject.rotation.clone(),
                scale: this.selectedObject.scale.clone()
            },
            undo: () => {
                this.selectedObject.position.copy(oldTransform.position);
                this.selectedObject.rotation.copy(oldTransform.rotation);
                this.selectedObject.scale.copy(oldTransform.scale);
                this.updateTransformInputs();
            },
            redo: () => {
                this.selectedObject.position.copy(this.newTransform.position);
                this.selectedObject.rotation.copy(this.newTransform.rotation);
                this.selectedObject.scale.copy(this.newTransform.scale);
                this.updateTransformInputs();
            }
        });
    }

    /**
     * Handle transform control changes
     */
    onTransformChange() {
        if (this.selectedObject) {
            this.updateTransformInputs();
        }
    }

    /**
     * Apply transform preset
     */
    applyTransformPreset(preset) {
        if (!this.selectedObject) return;

        const oldTransform = {
            position: this.selectedObject.position.clone(),
            rotation: this.selectedObject.rotation.clone(),
            scale: this.selectedObject.scale.clone()
        };

        switch (preset) {
            case 'center':
                this.selectedObject.position.set(0, 0, 0);
                break;
            case 'ground':
                // Calculate bounding box and place on ground
                const box = new THREE.Box3().setFromObject(this.selectedObject);
                this.selectedObject.position.y = -box.min.y;
                break;
            case 'reset':
                const original = this.originalTransforms.get(this.selectedObject.uuid);
                if (original) {
                    this.selectedObject.position.copy(original.position);
                    this.selectedObject.rotation.copy(original.rotation);
                    this.selectedObject.scale.copy(original.scale);
                }
                break;
        }

        this.updateTransformInputs();

        // Add to history
        this.addToHistory({
            type: 'transform_preset',
            preset: preset,
            object: this.selectedObject,
            oldTransform: oldTransform,
            newTransform: {
                position: this.selectedObject.position.clone(),
                rotation: this.selectedObject.rotation.clone(),
                scale: this.selectedObject.scale.clone()
            },
            undo: () => {
                this.selectedObject.position.copy(oldTransform.position);
                this.selectedObject.rotation.copy(oldTransform.rotation);
                this.selectedObject.scale.copy(oldTransform.scale);
                this.updateTransformInputs();
            },
            redo: () => {
                this.applyTransformPreset(preset);
            }
        });
    }

    // ==================== MATERIAL METHODS ====================

    /**
     * Update material list for current model
     */
    updateMaterialList(model) {
        const materialSelect = document.getElementById('materialSelect');
        if (!materialSelect) return;

        materialSelect.innerHTML = '<option value="">Select material...</option>';

        const materials = new Map();
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((mat, index) => {
                        const key = `${child.uuid}_${index}`;
                        const name = mat.name || `Material ${materials.size + 1}`;
                        materials.set(key, { material: mat, name: name, object: child });
                    });
                } else {
                    const key = child.uuid;
                    const name = child.material.name || `Material ${materials.size + 1}`;
                    materials.set(key, { material: child.material, name: name, object: child });
                }
            }
        });

        materials.forEach((data, key) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = data.name;
            materialSelect.appendChild(option);
        });

        this.materialList = materials;
    }

    /**
     * Select material for editing
     */
    selectMaterial(materialKey) {
        if (!materialKey || !this.materialList) return;

        const materialData = this.materialList.get(materialKey);
        if (!materialData) return;

        this.materialEditor.currentMaterial = materialData.material;
        this.selectedObject = materialData.object;

        this.updateMaterialInputs(materialData.material);
    }

    /**
     * Update material editor with object's material
     */
    updateMaterialEditor(object) {
        if (!object.material) return;

        const material = Array.isArray(object.material) ? object.material[0] : object.material;
        this.materialEditor.currentMaterial = material;
        this.updateMaterialInputs(material);
    }

    /**
     * Update material input values
     */
    updateMaterialInputs(material) {
        if (!material) return;

        // Base color
        if (material.color) {
            this.setInputValue('materialColor', `#${material.color.getHexString()}`);
        }

        // Opacity
        this.setInputValue('materialOpacity', material.opacity || 1);
        this.updateValueDisplay(document.getElementById('materialOpacity'));

        // PBR properties
        if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
            this.setInputValue('materialMetalness', material.metalness || 0);
            this.setInputValue('materialRoughness', material.roughness !== undefined ? material.roughness : 0.5);
            this.updateValueDisplay(document.getElementById('materialMetalness'));
            this.updateValueDisplay(document.getElementById('materialRoughness'));
        }

        // Emissive
        if (material.emissive) {
            this.setInputValue('materialEmissive', `#${material.emissive.getHexString()}`);
        }
        this.setInputValue('materialEmissiveIntensity', material.emissiveIntensity || 0);
        this.updateValueDisplay(document.getElementById('materialEmissiveIntensity'));

        // Normal scale
        if (material.normalScale) {
            this.setInputValue('materialNormalScale', material.normalScale.x || 1);
            this.updateValueDisplay(document.getElementById('materialNormalScale'));
        }
    }

    /**
     * Update material preview in real-time
     */
    updateMaterialPreview() {
        if (!this.materialEditor.currentMaterial) return;

        const material = this.materialEditor.currentMaterial;

        // Update color
        const colorInput = document.getElementById('materialColor');
        if (colorInput && material.color) {
            material.color.setHex(colorInput.value.replace('#', '0x'));
        }

        // Update opacity
        const opacityInput = document.getElementById('materialOpacity');
        if (opacityInput) {
            material.opacity = parseFloat(opacityInput.value);
            material.transparent = material.opacity < 1;
        }

        // Update PBR properties
        if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
            const metalnessInput = document.getElementById('materialMetalness');
            const roughnessInput = document.getElementById('materialRoughness');
            
            if (metalnessInput) {
                material.metalness = parseFloat(metalnessInput.value);
            }
            if (roughnessInput) {
                material.roughness = parseFloat(roughnessInput.value);
            }
        }

        // Update emissive
        const emissiveInput = document.getElementById('materialEmissive');
        const emissiveIntensityInput = document.getElementById('materialEmissiveIntensity');
        
        if (emissiveInput && material.emissive) {
            material.emissive.setHex(emissiveInput.value.replace('#', '0x'));
        }
        if (emissiveIntensityInput) {
            material.emissiveIntensity = parseFloat(emissiveIntensityInput.value);
        }

        // Update normal scale
        const normalScaleInput = document.getElementById('materialNormalScale');
        if (normalScaleInput && material.normalScale) {
            const scale = parseFloat(normalScaleInput.value);
            material.normalScale.set(scale, scale);
        }

        material.needsUpdate = true;
    }

    /**
     * Apply material changes permanently
     */
    applyMaterialChanges() {
        if (!this.materialEditor.currentMaterial) return;

        // Material changes are already applied through preview
        // Just add to history for undo functionality
        this.addToHistory({
            type: 'material_edit',
            material: this.materialEditor.currentMaterial,
            // Store material state for undo/redo
            undo: () => {
                // Restore from original material
                const original = this.originalMaterials.get(this.selectedObject.uuid);
                if (original) {
                    this.selectedObject.material = original.clone();
                    this.materialEditor.currentMaterial = this.selectedObject.material;
                    this.updateMaterialInputs(this.materialEditor.currentMaterial);
                }
            },
            redo: () => {
                this.updateMaterialPreview();
            }
        });

        this.coreEngine.emit('editing:material:applied', { 
            material: this.materialEditor.currentMaterial 
        });
    }

    /**
     * Reset material to original state
     */
    resetMaterial() {
        if (!this.selectedObject) return;

        const original = this.originalMaterials.get(this.selectedObject.uuid);
        if (original) {
            this.selectedObject.material = original.clone();
            this.materialEditor.currentMaterial = this.selectedObject.material;
            this.updateMaterialInputs(this.materialEditor.currentMaterial);
        }
    }

    // ==================== TEXTURE METHODS ====================

    /**
     * Select texture slot for editing
     */
    selectTextureSlot(slot) {
        this.textureSwapper.textureSlot = slot;
        this.updateCurrentTexturePreview();
    }

    /**
     * Update current texture preview
     */
    updateCurrentTexturePreview() {
        const preview = document.getElementById('currentTexturePreview');
        if (!preview || !this.materialEditor.currentMaterial) return;

        const material = this.materialEditor.currentMaterial;
        const slot = this.textureSwapper.textureSlot;
        const texture = material[slot];

        if (texture && texture.isTexture) {
            preview.innerHTML = `
                <img src="${texture.image.src || texture.image.toDataURL()}" alt="Current texture">
                <div class="texture-info">
                    <div>Size: ${texture.image.width}x${texture.image.height}</div>
                    <div>Format: ${texture.format}</div>
                </div>
            `;
        } else {
            preview.innerHTML = '<div class="no-texture">No texture assigned</div>';
        }
    }

    /**
     * Handle texture file upload
     */
    handleTextureUpload(files) {
        if (!files || files.length === 0) return;

        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        const texture = new THREE.Texture(img);
                        texture.needsUpdate = true;
                        texture.name = file.name;
                        
                        // Add to texture library
                        this.textureLibrary.set(file.name, texture);
                        this.updateTextureLibraryUI();
                        
                        // Auto-apply if a slot is selected
                        if (this.textureSwapper.textureSlot) {
                            this.applyTextureToSlot(texture, this.textureSwapper.textureSlot);
                        }
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    /**
     * Select texture from library
     */
    selectTextureFromLibrary(texture) {
        this.textureSwapper.previewTexture = texture;
        
        // Highlight selected texture in library
        document.querySelectorAll('.texture-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        event.currentTarget.classList.add('selected');
    }

    /**
     * Apply texture to selected slot
     */
    applyTextureToSlot(texture, slot) {
        if (!this.materialEditor.currentMaterial) return;

        const material = this.materialEditor.currentMaterial;
        const oldTexture = material[slot];

        // Store old texture for undo
        this.addToHistory({
            type: 'texture_change',
            material: material,
            slot: slot,
            oldTexture: oldTexture,
            newTexture: texture,
            undo: () => {
                material[slot] = oldTexture;
                material.needsUpdate = true;
                this.updateCurrentTexturePreview();
            },
            redo: () => {
                material[slot] = texture;
                material.needsUpdate = true;
                this.updateCurrentTexturePreview();
            }
        });

        // Apply texture
        material[slot] = texture;
        material.needsUpdate = true;
        
        this.updateCurrentTexturePreview();
        this.updateTextureSettings();
    }

    /**
     * Update texture settings (repeat, offset, rotation)
     */
    updateTextureSettings() {
        if (!this.materialEditor.currentMaterial || !this.textureSwapper.textureSlot) return;

        const material = this.materialEditor.currentMaterial;
        const texture = material[this.textureSwapper.textureSlot];
        
        if (!texture || !texture.isTexture) return;

        // Update repeat
        const repeatX = parseFloat(document.getElementById('textureRepeatX').value) || 1;
        const repeatY = parseFloat(document.getElementById('textureRepeatY').value) || 1;
        texture.repeat.set(repeatX, repeatY);

        // Update offset
        const offsetX = parseFloat(document.getElementById('textureOffsetX').value) || 0;
        const offsetY = parseFloat(document.getElementById('textureOffsetY').value) || 0;
        texture.offset.set(offsetX, offsetY);

        // Update rotation
        const rotation = THREE.MathUtils.degToRad(parseFloat(document.getElementById('textureRotation').value) || 0);
        texture.rotation = rotation;

        texture.needsUpdate = true;
    }

    /**
     * Apply texture changes
     */
    applyTextureChanges() {
        if (this.textureSwapper.previewTexture && this.textureSwapper.textureSlot) {
            this.applyTextureToSlot(this.textureSwapper.previewTexture, this.textureSwapper.textureSlot);
        }
    }

    /**
     * Remove texture from current slot
     */
    removeTexture() {
        if (!this.materialEditor.currentMaterial || !this.textureSwapper.textureSlot) return;

        const material = this.materialEditor.currentMaterial;
        const slot = this.textureSwapper.textureSlot;
        const oldTexture = material[slot];

        this.addToHistory({
            type: 'texture_remove',
            material: material,
            slot: slot,
            oldTexture: oldTexture,
            undo: () => {
                material[slot] = oldTexture;
                material.needsUpdate = true;
                this.updateCurrentTexturePreview();
            },
            redo: () => {
                material[slot] = null;
                material.needsUpdate = true;
                this.updateCurrentTexturePreview();
            }
        });

        material[slot] = null;
        material.needsUpdate = true;
        this.updateCurrentTexturePreview();
    }

    // ==================== GEOMETRY METHODS ====================

    /**
     * Update geometry info display
     */
    updateGeometryInfo(object) {
        if (!object.geometry) return;

        const geometry = object.geometry;
        const vertices = geometry.attributes.position ? geometry.attributes.position.count : 0;
        const faces = geometry.index ? geometry.index.count / 3 : vertices / 3;

        this.setElementText('geometryVertices', vertices.toLocaleString());
        this.setElementText('geometryFaces', Math.floor(faces).toLocaleString());

        this.geometryEditor.currentGeometry = geometry;
    }

    /**
     * Subdivide geometry
     */
    subdivideGeometry() {
        if (!this.selectedObject || !this.selectedObject.geometry) return;

        const level = parseInt(document.getElementById('subdivisionLevel').value) || 1;
        
        // This would require a subdivision modifier
        // For now, we'll show a placeholder implementation
        console.log(`Subdividing geometry with level ${level}`);
        
        // In a real implementation, you would use a subdivision surface algorithm
        // or import Three.js subdivision modifier
    }

    /**
     * Simplify geometry
     */
    simplifyGeometry() {
        if (!this.selectedObject || !this.selectedObject.geometry) return;

        const ratio = parseFloat(document.getElementById('simplificationRatio').value) || 0.5;
        
        // This would require a mesh simplification algorithm
        console.log(`Simplifying geometry with ratio ${ratio}`);
        
        // In a real implementation, you would use mesh decimation algorithms
    }

    /**
     * Smooth geometry
     */
    smoothGeometry() {
        if (!this.selectedObject || !this.selectedObject.geometry) return;

        const factor = parseFloat(document.getElementById('smoothingFactor').value) || 1;
        
        // Apply Laplacian smoothing or similar
        const geometry = this.selectedObject.geometry;
        if (geometry.attributes.normal) {
            geometry.computeVertexNormals();
        }
        
        console.log(`Smoothing geometry with factor ${factor}`);
    }

    /**
     * Apply geometry changes
     */
    applyGeometryChanges() {
        if (!this.selectedObject || !this.selectedObject.geometry) return;

        // Geometry changes would be applied here
        this.updateGeometryInfo(this.selectedObject);
        
        this.coreEngine.emit('editing:geometry:applied', { 
            object: this.selectedObject 
        });
    }

    /**
     * Reset geometry to original state
     */
    resetGeometry() {
        if (!this.selectedObject) return;

        // In a real implementation, you would restore the original geometry
        console.log('Resetting geometry to original state');
    }

    // ==================== ANNOTATION METHODS ====================

    /**
     * Start annotation mode
     */
    startAnnotationMode() {
        this.annotationMode = true;
        
        const addBtn = document.getElementById('addAnnotation');
        if (addBtn) {
            addBtn.textContent = 'Click on model to add annotation';
            addBtn.classList.add('active');
        }
        
        // Change cursor to indicate annotation mode
        document.body.style.cursor = 'crosshair';
    }

    /**
     * Add annotation at clicked point
     */
    addAnnotationAtPoint(point, object) {
        const text = prompt('Enter annotation text:');
        if (!text) {
            this.stopAnnotationMode();
            return;
        }

        const annotationId = `annotation_${this.annotationCounter++}`;
        
        // Create annotation marker
        const markerGeometry = new THREE.SphereGeometry(0.05, 8, 6);
        const markerMaterial = new THREE.MeshBasicMaterial({ 
            color: document.getElementById('annotationColor').value 
        });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(point);
        
        // Create text sprite
        const textSprite = this.createTextSprite(text);
        textSprite.position.copy(point);
        textSprite.position.y += 0.1;
        
        this.renderingEngine.scene.add(marker);
        this.renderingEngine.scene.add(textSprite);
        
        // Store annotation
        const annotation = {
            id: annotationId,
            text: text,
            position: point.clone(),
            marker: marker,
            textSprite: textSprite,
            object: object,
            timestamp: Date.now()
        };
        
        this.annotations.set(annotationId, annotation);
        this.annotationMarkers.push(marker, textSprite);
        
        // Update annotations list
        this.updateAnnotationsList();
        
        // Save to storage
        this.saveAnnotationsToStorage();
        
        this.stopAnnotationMode();
        
        this.coreEngine.emit('editing:annotation:added', { annotation });
    }

    /**
     * Create text sprite for annotation
     */
    createTextSprite(text) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const fontSize = parseInt(document.getElementById('annotationTextSize').value) || 16;
        
        context.font = `${fontSize}px Arial`;
        const textWidth = context.measureText(text).width;
        
        canvas.width = textWidth + 20;
        canvas.height = fontSize + 10;
        
        // Background
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Text
        context.fillStyle = 'white';
        context.font = `${fontSize}px Arial`;
        context.fillText(text, 10, fontSize);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        
        const scale = parseFloat(document.getElementById('annotationSize').value) || 1;
        sprite.scale.set(scale, scale * 0.5, 1);
        
        return sprite;
    }

    /**
     * Stop annotation mode
     */
    stopAnnotationMode() {
        this.annotationMode = false;
        
        const addBtn = document.getElementById('addAnnotation');
        if (addBtn) {
            addBtn.textContent = 'Add Annotation';
            addBtn.classList.remove('active');
        }
        
        document.body.style.cursor = 'default';
    }

    /**
     * Update annotations list UI
     */
    updateAnnotationsList() {
        const list = document.getElementById('annotationsList');
        if (!list) return;

        if (this.annotations.size === 0) {
            list.innerHTML = '<div class="no-annotations">No annotations yet. Click "Add Annotation" and then click on the model.</div>';
            return;
        }

        list.innerHTML = '';
        
        this.annotations.forEach((annotation, id) => {
            const item = document.createElement('div');
            item.className = 'annotation-item';
            item.innerHTML = `
                <div class="annotation-text">${annotation.text}</div>
                <div class="annotation-actions">
                    <button class="edit-annotation" data-id="${id}">Edit</button>
                    <button class="delete-annotation" data-id="${id}">Delete</button>
                </div>
            `;
            
            // Add event listeners
            item.querySelector('.edit-annotation').addEventListener('click', () => {
                this.editAnnotation(id);
            });
            
            item.querySelector('.delete-annotation').addEventListener('click', () => {
                this.deleteAnnotation(id);
            });
            
            list.appendChild(item);
        });
    }

    /**
     * Edit annotation
     */
    editAnnotation(annotationId) {
        const annotation = this.annotations.get(annotationId);
        if (!annotation) return;

        const newText = prompt('Edit annotation text:', annotation.text);
        if (newText && newText !== annotation.text) {
            annotation.text = newText;
            
            // Update text sprite
            this.renderingEngine.scene.remove(annotation.textSprite);
            annotation.textSprite = this.createTextSprite(newText);
            annotation.textSprite.position.copy(annotation.position);
            annotation.textSprite.position.y += 0.1;
            this.renderingEngine.scene.add(annotation.textSprite);
            
            this.updateAnnotationsList();
            this.saveAnnotationsToStorage();
        }
    }

    /**
     * Delete annotation
     */
    deleteAnnotation(annotationId) {
        const annotation = this.annotations.get(annotationId);
        if (!annotation) return;

        // Remove from scene
        this.renderingEngine.scene.remove(annotation.marker);
        this.renderingEngine.scene.remove(annotation.textSprite);
        
        // Remove from arrays
        const markerIndex = this.annotationMarkers.indexOf(annotation.marker);
        if (markerIndex > -1) {
            this.annotationMarkers.splice(markerIndex, 1);
        }
        
        const spriteIndex = this.annotationMarkers.indexOf(annotation.textSprite);
        if (spriteIndex > -1) {
            this.annotationMarkers.splice(spriteIndex, 1);
        }
        
        // Remove from map
        this.annotations.delete(annotationId);
        
        this.updateAnnotationsList();
        this.saveAnnotationsToStorage();
        
        this.coreEngine.emit('editing:annotation:deleted', { annotationId });
    }

    /**
     * Toggle annotation visibility
     */
    toggleAnnotationVisibility() {
        const visible = this.annotationMarkers.length > 0 ? !this.annotationMarkers[0].visible : true;
        
        this.annotationMarkers.forEach(marker => {
            marker.visible = visible;
        });
        
        const toggleBtn = document.getElementById('toggleAnnotations');
        if (toggleBtn) {
            toggleBtn.textContent = visible ? 'Hide Annotations' : 'Show Annotations';
        }
    }

    /**
     * Clear all annotations
     */
    clearAllAnnotations() {
        this.annotations.forEach((annotation) => {
            this.renderingEngine.scene.remove(annotation.marker);
            this.renderingEngine.scene.remove(annotation.textSprite);
        });
        
        this.annotations.clear();
        this.annotationMarkers = [];
        this.updateAnnotationsList();
        this.saveAnnotationsToStorage();
        
        this.coreEngine.emit('editing:annotations:cleared');
    }

    /**
     * Update annotation settings
     */
    updateAnnotationSettings() {
        const size = parseFloat(document.getElementById('annotationSize').value) || 1;
        const color = document.getElementById('annotationColor').value;
        const textSize = parseInt(document.getElementById('annotationTextSize').value) || 16;
        
        // Update existing annotations
        this.annotations.forEach((annotation) => {
            // Update marker color
            annotation.marker.material.color.setHex(color.replace('#', '0x'));
            
            // Update text sprite scale
            annotation.textSprite.scale.set(size, size * 0.5, 1);
        });
    }

    // ==================== SCREENSHOT METHODS ====================

    /**
     * Take screenshot with custom resolution
     */
    takeScreenshot() {
        const resolution = this.screenshotManager.resolutions[this.screenshotManager.currentResolution];
        let width, height;
        
        if (this.screenshotManager.currentResolution === 4) { // Custom
            width = this.screenshotManager.customWidth;
            height = this.screenshotManager.customHeight;
        } else {
            width = resolution.width;
            height = resolution.height;
        }
        
        this.captureAtResolution(width, height, `screenshot_${Date.now()}.png`);
    }

    /**
     * Capture current viewport
     */
    captureViewport() {
        const canvas = this.renderingEngine.renderer.domElement;
        this.downloadCanvas(canvas, `viewport_${Date.now()}.png`);
    }

    /**
     * Capture at specific resolution
     */
    captureAtResolution(width, height, filename) {
        const renderer = this.renderingEngine.renderer;
        const camera = this.renderingEngine.camera;
        const scene = this.renderingEngine.scene;
        
        // Store original size
        const originalSize = renderer.getSize(new THREE.Vector2());
        const originalPixelRatio = renderer.getPixelRatio();
        
        // Create temporary canvas for high-resolution capture
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        
        const tempRenderer = new THREE.WebGLRenderer({ 
            canvas: tempCanvas,
            preserveDrawingBuffer: true,
            alpha: this.screenshotManager.transparentBackground
        });
        
        tempRenderer.setSize(width, height);
        tempRenderer.setPixelRatio(1);
        
        // Copy renderer settings
        tempRenderer.shadowMap.enabled = renderer.shadowMap.enabled;
        tempRenderer.shadowMap.type = renderer.shadowMap.type;
        tempRenderer.toneMapping = renderer.toneMapping;
        tempRenderer.toneMappingExposure = renderer.toneMappingExposure;
        
        if (this.screenshotManager.transparentBackground) {
            tempRenderer.setClearColor(0x000000, 0);
        } else {
            tempRenderer.setClearColor(scene.background || 0x000000, 1);
        }
        
        // Update camera aspect ratio
        const originalAspect = camera.aspect;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        
        // Hide UI elements if requested
        const hideUI = document.getElementById('hideUI').checked;
        if (hideUI) {
            document.getElementById('sidebar').style.display = 'none';
        }
        
        // Render
        tempRenderer.render(scene, camera);
        
        // Restore UI
        if (hideUI) {
            document.getElementById('sidebar').style.display = '';
        }
        
        // Restore camera
        camera.aspect = originalAspect;
        camera.updateProjectionMatrix();
        
        // Download
        this.downloadCanvas(tempCanvas, filename);
        
        // Add to capture history
        this.addToCaptureHistory(tempCanvas.toDataURL(), filename, width, height);
        
        // Cleanup
        tempRenderer.dispose();
    }

    /**
     * Download canvas as image
     */
    downloadCanvas(canvas, filename) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    /**
     * Add capture to history
     */
    addToCaptureHistory(dataUrl, filename, width, height) {
        const historyList = document.getElementById('captureHistory');
        if (!historyList) return;

        // Remove "no captures" message
        const noCaptures = historyList.querySelector('.no-captures');
        if (noCaptures) {
            noCaptures.remove();
        }

        const item = document.createElement('div');
        item.className = 'capture-item';
        item.innerHTML = `
            <img src="${dataUrl}" alt="${filename}" class="capture-thumbnail">
            <div class="capture-info">
                <div class="capture-name">${filename}</div>
                <div class="capture-size">${width}x${height}</div>
                <div class="capture-time">${new Date().toLocaleTimeString()}</div>
            </div>
            <div class="capture-actions">
                <button class="download-capture">Download</button>
            </div>
        `;
        
        item.querySelector('.download-capture').addEventListener('click', () => {
            const link = document.createElement('a');
            link.download = filename;
            link.href = dataUrl;
            link.click();
        });
        
        historyList.insertBefore(item, historyList.firstChild);
        
        // Limit history to 10 items
        const items = historyList.querySelectorAll('.capture-item');
        if (items.length > 10) {
            items[items.length - 1].remove();
        }
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Set input value safely
     */
    setInputValue(id, value) {
        const input = document.getElementById(id);
        if (input) {
            input.value = value;
        }
    }

    /**
     * Set element text content safely
     */
    setElementText(id, text) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = text;
        }
    }}
