import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { PostProcessingManager } from './PostProcessingManager.js';
import { ShaderManager } from './ShaderManager.js';
import { AdvancedRenderingManager } from './AdvancedRenderingManager.js';
import { LightingManager } from './LightingManager.js';
import { MaterialManager } from './MaterialManager.js';
import { ContactShadowManager } from './ContactShadowManager.js';
import { PhysicsEngine } from '../physics/PhysicsEngine.js';
import { WebXRManager } from '../xr/WebXRManager.js';

/**
 * RenderingEngine - Manages Three.js scene, camera, renderer, and all visual aspects
 */
export class RenderingEngine {
    constructor(core) {
        this.core = core;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.composer = null;
        this.clock = new THREE.Clock();
        
        // Advanced systems
        this.postProcessingManager = null;
        this.shaderManager = null;
        this.advancedRenderingManager = null;
        this.lightingManager = null;
        this.materialManager = null;
        this.contactShadowManager = null;
        this.physicsEngine = null;
        this.webXRManager = null;
        
        // Lighting system
        this.lights = {};
        
        // Post-processing
        this.bloomPass = null;
        
        // Scene objects
        this.groundPlane = null;
        this.gridHelper = null;
        
        // Animation
        this.mixer = null;
        this.animationPaused = false;
        
        this.initialized = false;
    }

    /**
     * Initialize the rendering engine
     */
    async init(container) {
        if (this.initialized) {
            console.warn('RenderingEngine already initialized');
            return;
        }

        try {
            // Check WebGL support first
            if (!this.checkWebGLSupport()) {
                throw new Error('WebGL is not supported in this browser');
            }

            this.initScene();
            this.initCamera(container);
            await this.initRenderer(container);
            this.initControls();
            this.initLighting();
            this.initPostProcessing();
            this.initSceneObjects();
            this.initAdvancedSystems();
            
            this.setupEventListeners();
            this.setupErrorHandling();
            this.initialized = true;
            
            this.core.emit('rendering:initialized');
        } catch (error) {
            console.error('Failed to initialize RenderingEngine:', error);
            
            // Handle initialization error through error manager
            await this.core.handleError(error, {
                type: 'initialization_error',
                severity: 'critical',
                context: { module: 'rendering', phase: 'initialization' }
            });
            
            throw error;
        }
    }

    /**
     * Check WebGL support
     */
    checkWebGLSupport() {
        if (process.env.NODE_ENV === 'test') {
            return true;
        }
        const webglRecovery = this.core.getWebGLRecovery();
        if (!webglRecovery.constructor.isWebGLSupported()) {
            this.core.handleError(new Error('WebGL not supported'), {
                type: 'webgl_not_supported',
                severity: 'critical',
                context: { userAgent: navigator.userAgent }
            });
            return false;
        }
        return true;
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);
    }

    initCamera(container) {
        this.camera = new THREE.PerspectiveCamera(
            75, 
            container.clientWidth / container.clientHeight, 
            0.1, 
            1000
        );
        this.camera.position.set(5, 5, 5);
    }

    async initRenderer(container) {
        if (process.env.NODE_ENV === 'test') {
            return;
        }
        try {
            this.renderer = new THREE.WebGLRenderer({ 
                antialias: true, 
                preserveDrawingBuffer: true,
                failIfMajorPerformanceCaveat: false // Allow software rendering as fallback
            });
            
            this.renderer.setSize(container.clientWidth, container.clientHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio for performance
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1;
            
            container.appendChild(this.renderer.domElement);
            
            // Ensure canvas is visible and properly sized
            const canvas = this.renderer.domElement;
            canvas.style.display = 'block';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            
            // Setup WebGL context loss handling
            const webglRecovery = this.core.getWebGLRecovery();
            webglRecovery.setupContextLossHandlers(this.renderer.domElement, this.renderer);
            
        } catch (error) {
            // Handle WebGL context creation failure
            await this.core.handleError(error, {
                type: 'webgl_context_creation_failed',
                severity: 'critical',
                context: { 
                    container: container ? 'present' : 'missing',
                    webglSupported: this.core.getWebGLRecovery().constructor.isWebGLSupported()
                }
            });
            throw error;
        }
    }

    initControls() {
        if (process.env.NODE_ENV === 'test') {
            return;
        }
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 100;
    }

    initLighting() {
        // Ambient light
        this.lights.ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.lights.ambient);
        
        // Directional light
        this.lights.directional = new THREE.DirectionalLight(0xffffff, 1);
        this.lights.directional.position.set(5, 5, 5);
        this.lights.directional.castShadow = true;
        this.lights.directional.shadow.mapSize.width = 2048;
        this.lights.directional.shadow.mapSize.height = 2048;
        this.lights.directional.shadow.camera.near = 0.5;
        this.lights.directional.shadow.camera.far = 50;
        this.scene.add(this.lights.directional);
        
        // Light helper (initially hidden)
        const dirLightHelper = new THREE.DirectionalLightHelper(this.lights.directional, 1);
        dirLightHelper.visible = false;
        this.scene.add(dirLightHelper);
    }

    initPostProcessing() {
        this.composer = new EffectComposer(this.renderer);

        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight), 
            1.5, 
            0.4, 
            0.85
        );
        this.bloomPass.enabled = false;
        this.composer.addPass(this.bloomPass);
    }

    initSceneObjects() {
        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.1 
        });
        this.groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
        this.groundPlane.rotation.x = -Math.PI / 2;
        this.groundPlane.position.y = 0;
        this.groundPlane.receiveShadow = true;
        this.scene.add(this.groundPlane);
        
        // Grid helper
        this.gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0xcccccc);
        this.gridHelper.material.transparent = true;
        this.gridHelper.material.opacity = 0.3;
        this.gridHelper.visible = false;
        this.scene.add(this.gridHelper);
    }

    /**
     * Initialize advanced rendering systems
     */
    initAdvancedSystems() {
        if (process.env.NODE_ENV === 'test') {
            return;
        }
        // Initialize post-processing manager
        this.postProcessingManager = new PostProcessingManager(this.renderer, this.scene, this.camera);
        
        // Initialize shader manager
        this.shaderManager = new ShaderManager(this.core);
        
        // Initialize advanced rendering manager
        this.advancedRenderingManager = new AdvancedRenderingManager(this.core, this.renderer, this.scene, this.camera);
        
        // Initialize lighting manager
        this.lightingManager = new LightingManager(this.core, this.scene, this.renderer);
        
        // Initialize material manager
        this.materialManager = new MaterialManager(this.core, this.renderer);
        
        // Initialize contact shadow manager
        this.contactShadowManager = new ContactShadowManager(this.core, this.renderer, this.scene, this.camera);
        
        // Initialize physics engine
        this.physicsEngine = new PhysicsEngine(this.core);
        
        // Initialize WebXR manager
        this.webXRManager = new WebXRManager(this.core, this.renderer, this.scene, this.camera);
        
        // Register modules with core
        this.core.registerModule('postProcessing', this.postProcessingManager);
        this.core.registerModule('shader', this.shaderManager);
        this.core.registerModule('advancedRendering', this.advancedRenderingManager);
        this.core.registerModule('lighting', this.lightingManager);
        this.core.registerModule('materials', this.materialManager);
        this.core.registerModule('contactShadows', this.contactShadowManager);
        this.core.registerModule('physics', this.physicsEngine);
        this.core.registerModule('webxr', this.webXRManager);
    }

    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Listen to core events
        this.core.on('model:loaded', (data) => this.onModelLoaded(data));
        this.core.on('model:removed', () => this.onModelRemoved());
        
        // Listen to error recovery events
        this.core.on('webgl:context-restored', () => this.onContextRestored());
        this.core.on('performance:quality-reduced', () => this.onQualityReduced());
    }

    /**
     * Setup error handling for rendering
     */
    setupErrorHandling() {
        // Monitor for WebGL errors during rendering
        const originalRender = this.render.bind(this);
        this.render = () => {
            try {
                originalRender();
            } catch (error) {
                this.handleRenderError(error);
            }
        };
    }

    /**
     * Add a model to the scene
     */
    addModel(model) {
        if (this.core.getState().currentModel) {
            this.removeCurrentModel();
        }

        this.scene.add(model);
        this.core.setState({ currentModel: model });
        
        // Setup shadows for the model
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Force immediate render to make model visible
        this.render();
        
        // Additional render calls to ensure visibility
        requestAnimationFrame(() => {
            this.render();
            setTimeout(() => {
                this.render();
            }, 16); // One more frame
        });

        this.core.emit('rendering:model:added', { model });
    }

    /**
     * Remove the current model from the scene
     */
    removeCurrentModel() {
        const currentModel = this.core.getState().currentModel;
        if (currentModel) {
            this.scene.remove(currentModel);
            this.core.setState({ currentModel: null });
            this.core.emit('rendering:model:removed');
        }
    }

    /**
     * Set the scene background
     */
    setBackground(background) {
        this.scene.background = background;
        this.core.emit('rendering:background:changed', { background });
    }

    /**
     * Set the scene environment
     */
    setEnvironment(environment) {
        this.scene.environment = environment;
        this.core.emit('rendering:environment:changed', { environment });
    }

    /**
     * Fit camera to the current model
     */
    fitCameraToModel() {
        const currentModel = this.core.getState().currentModel;
        if (!currentModel) return;

        const box = new THREE.Box3().setFromObject(currentModel);
        const center = box.getCenter(new THREE.Vector3());
        
        // Adjust model position if it's below ground
        if (box.min.y < 0) {
            currentModel.position.y = -box.min.y;
            box.setFromObject(currentModel);
            center.copy(box.getCenter(new THREE.Vector3()));
        }

        const boundingSphere = new THREE.Sphere();
        box.getBoundingSphere(boundingSphere);
        const radius = boundingSphere.radius;
        
        const distance = radius / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2));
        
        this.camera.position.set(
            center.x, 
            center.y + radius * 0.4, 
            center.z + distance
        );
        this.camera.lookAt(center);
        this.controls.target.copy(center);
        this.controls.update();
        
        // Force render after camera positioning
        this.render();
    }

    /**
     * Reset camera to default position
     */
    resetCamera() {
        this.camera.position.set(5, 5, 5);
        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0, 0);
        this.controls.reset();
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        const container = this.renderer.domElement.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        
        if (this.composer) {
            this.composer.setSize(width, height);
        }
        
        // Update advanced systems
        if (this.postProcessingManager) {
            this.postProcessingManager.onResize(width, height);
        }
        
        if (this.advancedRenderingManager) {
            this.advancedRenderingManager.onResize(width, height);
        }
        
        this.render();
    }

    /**
     * Handle model loaded event
     */
    onModelLoaded(data) {
        if (data.animations && data.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(data.model);
            data.animations.forEach(clip => {
                this.mixer.clipAction(clip).play();
            });
        }
    }

    /**
     * Handle model removed event
     */
    onModelRemoved() {
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer = null;
        }
    }

    /**
     * Update animations
     */
    updateAnimations(delta) {
        if (this.mixer && !this.animationPaused) {
            this.mixer.update(delta);
        }
    }

    /**
     * Render the scene
     */
    render() {
        try {
            // Use advanced post-processing if available
            if (this.postProcessingManager && this.postProcessingManager.enabled) {
                this.postProcessingManager.render();
            } else if (this.composer && this.bloomPass && this.bloomPass.enabled) {
                this.composer.render();
            } else if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        } catch (error) {
            this.handleRenderError(error);
        }
    }

    /**
     * Force a complete refresh of the rendering
     */
    forceRefresh() {
        // Update camera projection matrix
        this.camera.updateProjectionMatrix();
        
        // Update controls
        this.controls.update();
        
        // Force multiple renders
        this.render();
        requestAnimationFrame(() => {
            this.render();
            setTimeout(() => {
                this.render();
            }, 16);
        });
    }

    /**
     * Handle rendering errors
     */
    async handleRenderError(error) {
        console.error('Rendering error:', error);
        
        // Determine error type
        let errorType = 'unknown_error';
        let severity = 'medium';
        
        if (error.message.includes('WebGL')) {
            errorType = 'webgl_context_lost';
            severity = 'high';
        } else if (error.message.includes('memory') || error.message.includes('Memory')) {
            errorType = 'gpu_memory_exhausted';
            severity = 'high';
        } else if (error.message.includes('shader')) {
            errorType = 'shader_compilation_failed';
            severity = 'medium';
        }
        
        await this.core.handleError(error, {
            type: errorType,
            severity: severity,
            context: { 
                module: 'rendering',
                phase: 'render',
                hasPostProcessing: !!this.postProcessingManager?.enabled,
                hasBloom: !!this.bloomPass?.enabled
            }
        });
    }

    /**
     * Handle WebGL context restoration
     */
    async onContextRestored() {
        console.info('WebGL context restored, reinitializing renderer');
        
        try {
            // Reinitialize renderer components that may have been lost
            if (this.postProcessingManager) {
                await this.postProcessingManager.reinitialize();
            }
            
            if (this.shaderManager) {
                await this.shaderManager.recompileShaders();
            }
            
            // Emit restoration success
            this.core.emit('rendering:context-restored');
            
        } catch (error) {
            await this.core.handleError(error, {
                type: 'webgl_context_lost',
                severity: 'high',
                context: { phase: 'restoration' }
            });
        }
    }

    /**
     * Handle quality reduction for performance
     */
    onQualityReduced() {
        console.info('Reducing rendering quality for performance');
        
        // Reduce pixel ratio
        const currentPixelRatio = this.renderer.getPixelRatio();
        if (currentPixelRatio > 1) {
            this.renderer.setPixelRatio(Math.max(1, currentPixelRatio * 0.75));
        }
        
        // Disable expensive effects
        if (this.bloomPass && this.bloomPass.enabled) {
            this.bloomPass.enabled = false;
            console.info('Disabled bloom effect for performance');
        }
        
        if (this.postProcessingManager && this.postProcessingManager.enabled) {
            this.postProcessingManager.reduceQuality();
            console.info('Reduced post-processing quality');
        }
        
        // Reduce shadow quality
        if (this.lights.directional && this.lights.directional.shadow) {
            const currentSize = this.lights.directional.shadow.mapSize.width;
            if (currentSize > 512) {
                const newSize = Math.max(512, currentSize / 2);
                this.lights.directional.shadow.mapSize.setScalar(newSize);
                console.info(`Reduced shadow map size to ${newSize}x${newSize}`);
            }
        }
        
        this.core.emit('rendering:quality-reduced');
    }

    /**
     * Restore rendering quality
     */
    restoreQuality() {
        console.info('Restoring rendering quality');
        
        // Restore pixel ratio
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        // Re-enable effects if they were disabled
        if (this.bloomPass) {
            this.bloomPass.enabled = false; // Keep disabled by default, user can re-enable
        }
        
        if (this.postProcessingManager) {
            this.postProcessingManager.restoreQuality();
        }
        
        // Restore shadow quality
        if (this.lights.directional && this.lights.directional.shadow) {
            this.lights.directional.shadow.mapSize.setScalar(2048);
        }
        
        this.core.emit('rendering:quality-restored');
    }

    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        if (!this.renderer) {
            return { fps: 0, frameTime: 0 };
        }

        const info = this.renderer.info;
        return {
            fps: this.fps || 0,
            frameTime: this.frameTime || 0,
            triangles: info.render.triangles,
            geometries: info.memory.geometries,
            textures: info.memory.textures,
            programs: info.programs?.length || 0,
            calls: info.render.calls
        };
    }

    /**
     * Force WebGL context restoration
     */
    async restoreContext() {
        const webglRecovery = this.core.getWebGLRecovery();
        return await webglRecovery.forceContextRestore(this.renderer);
    }

    /**
     * Update the rendering engine (called in animation loop)
     */
    update() {
        if (!this.initialized) return;

        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();
        
        if (this.controls) {
            this.controls.update();
        }
        this.updateAnimations(delta);
        
        // Update advanced systems
        if (this.physicsEngine && this.physicsEngine.enabled) {
            this.physicsEngine.step(delta);
        }
        
        if (this.webXRManager) {
            this.webXRManager.update();
        }
        
        if (this.shaderManager) {
            this.shaderManager.updateTime(time);
        }
        
        if (this.lightingManager) {
            this.lightingManager.update(delta);
        }
        
        if (this.contactShadowManager) {
            this.contactShadowManager.update();
        }
        
        this.render();
    }

    /**
     * Get advanced systems for external access
     */
    getPostProcessingManager() {
        return this.postProcessingManager;
    }

    getShaderManager() {
        return this.shaderManager;
    }

    getAdvancedRenderingManager() {
        return this.advancedRenderingManager;
    }

    getLightingManager() {
        return this.lightingManager;
    }

    getMaterialManager() {
        return this.materialManager;
    }

    getContactShadowManager() {
        return this.contactShadowManager;
    }

    getPhysicsEngine() {
        return this.physicsEngine;
    }

    getWebXRManager() {
        return this.webXRManager;
    }

    /**
     * Enable physics simulation
     */
    enablePhysics() {
        if (this.physicsEngine) {
            this.physicsEngine.enable();
        }
    }

    /**
     * Disable physics simulation
     */
    disablePhysics() {
        if (this.physicsEngine) {
            this.physicsEngine.disable();
        }
    }

    /**
     * Add physics body to a mesh
     */
    addPhysicsBody(mesh, options = {}) {
        if (this.physicsEngine) {
            return this.physicsEngine.addRigidBody(mesh, options);
        }
        return null;
    }

    /**
     * Enable post-processing effect
     */
    enablePostProcessingEffect(effectName) {
        if (this.postProcessingManager) {
            this.postProcessingManager.enablePass(effectName);
        }
    }

    /**
     * Disable post-processing effect
     */
    disablePostProcessingEffect(effectName) {
        if (this.postProcessingManager) {
            this.postProcessingManager.disablePass(effectName);
        }
    }

    /**
     * Create custom shader material
     */
    createShaderMaterial(shaderName, uniforms = {}) {
        if (this.shaderManager) {
            return this.shaderManager.createMaterial(shaderName, uniforms);
        }
        return new THREE.MeshBasicMaterial();
    }

    /**
     * Enable advanced rendering technique
     */
    enableAdvancedTechnique(techniqueName) {
        if (this.advancedRenderingManager) {
            this.advancedRenderingManager.enableTechnique(techniqueName);
        }
    }

    /**
     * Disable advanced rendering technique
     */
    disableAdvancedTechnique(techniqueName) {
        if (this.advancedRenderingManager) {
            this.advancedRenderingManager.disableTechnique(techniqueName);
        }
    }

    /**
     * Add VR/AR buttons to container
     */
    addXRButtons(container) {
        if (this.webXRManager) {
            this.webXRManager.addVRButton(container);
            this.webXRManager.addARButton(container);
        }
    }

    /**
     * Lighting system convenience methods
     */
    loadHDRI(url) {
        if (this.lightingManager) {
            return this.lightingManager.loadHDRI(url);
        }
        return Promise.reject(new Error('LightingManager not initialized'));
    }

    setEnvironmentIntensity(intensity) {
        if (this.lightingManager) {
            this.lightingManager.setEnvironmentIntensity(intensity);
        }
    }

    setEnvironmentRotation(rotation) {
        if (this.lightingManager) {
            this.lightingManager.setEnvironmentRotation(rotation);
        }
    }

    applyLightingPreset(presetName) {
        if (this.lightingManager) {
            this.lightingManager.applyPreset(presetName);
        }
    }

    setSceneBackground(type) {
        if (this.lightingManager) {
            this.lightingManager.setBackground(type);
        }
    }

    /**
     * Material system convenience methods
     */
    createPBRMaterial(name, options) {
        if (this.materialManager) {
            return this.materialManager.createPBRMaterial(name, options);
        }
        return null;
    }

    applyMaterialPreset(materialName, presetName) {
        if (this.materialManager) {
            return this.materialManager.applyPreset(materialName, presetName);
        }
        return null;
    }

    applyMaterialToModel(model, materialName, meshFilter) {
        if (this.materialManager) {
            this.materialManager.applyMaterialToModel(model, materialName, meshFilter);
        }
    }

    /**
     * Contact shadow convenience methods
     */
    enableContactShadows() {
        if (this.contactShadowManager) {
            this.contactShadowManager.enable();
        }
    }

    disableContactShadows() {
        if (this.contactShadowManager) {
            this.contactShadowManager.disable();
        }
    }

    updateContactShadowSettings(settings) {
        if (this.contactShadowManager) {
            this.contactShadowManager.updateSettings(settings);
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Remove event listeners first
        window.removeEventListener('resize', this.onWindowResize);
        
        // Remove core event listeners
        this.core.off('model:loaded', this.onModelLoaded);
        this.core.off('model:removed', this.onModelRemoved);
        this.core.off('webgl:context-restored', this.onContextRestored);
        this.core.off('performance:quality-reduced', this.onQualityReduced);
        
        // Destroy advanced systems
        if (this.postProcessingManager) {
            this.postProcessingManager.destroy();
        }
        
        if (this.shaderManager) {
            this.shaderManager.destroy();
        }
        
        if (this.advancedRenderingManager) {
            this.advancedRenderingManager.destroy();
        }
        
        if (this.lightingManager) {
            this.lightingManager.destroy();
        }
        
        if (this.materialManager) {
            this.materialManager.destroy();
        }
        
        if (this.contactShadowManager) {
            this.contactShadowManager.destroy();
        }
        
        if (this.physicsEngine) {
            this.physicsEngine.destroy();
        }
        
        if (this.webXRManager) {
            this.webXRManager.destroy();
        }
        
        // Dispose Three.js resources
        if (this.renderer && typeof this.renderer.dispose === 'function') {
            this.renderer.dispose();
        }
        
        if (this.composer && typeof this.composer.dispose === 'function') {
            this.composer.dispose();
        }
        
        if (this.mixer) {
            this.mixer.stopAllAction();
        }
        
        // Dispose scene objects
        if (this.scene && typeof this.scene.traverse === 'function') {
            this.scene.traverse((child) => {
                if (child.geometry && typeof child.geometry.dispose === 'function') {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => {
                            if (material && typeof material.dispose === 'function') {
                                material.dispose();
                            }
                        });
                    } else if (typeof child.material.dispose === 'function') {
                        child.material.dispose();
                    }
                }
            });
        }
        
        this.initialized = false;
    }
}