import * as THREE from 'three';
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader.js';

/**
 * ContactShadowManager - High-quality contact shadow system with soft edges
 */
export class ContactShadowManager {
    constructor(core, renderer, scene, camera) {
        this.core = core;
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        // Shadow configuration
        this.shadowPlane = null;
        this.shadowCamera = null;
        this.shadowRenderTarget = null;
        this.blurRenderTarget1 = null;
        this.blurRenderTarget2 = null;
        
        // Shadow material
        this.shadowMaterial = null;
        this.blurMaterial1 = null;
        this.blurMaterial2 = null;
        
        // Settings
        this.settings = {
            enabled: false,
            opacity: 0.5,
            blur: 3.5,
            darkness: 1.0,
            resolution: 512,
            planeSize: 10,
            planePosition: new THREE.Vector3(0, 0, 0),
            far: 10,
            near: 0.1
        };
        
        // Objects to cast shadows
        this.shadowCasters = new Set();
        
        this.initialized = false;
        this.init();
    }

    /**
     * Initialize contact shadow system
     */
    init() {
        if (this.initialized) return;

        try {
            this.createShadowCamera();
            this.createRenderTargets();
            this.createShadowMaterials();
            this.createShadowPlane();
            this.setupEventListeners();
            
            this.initialized = true;
            this.core.emit('contactShadows:initialized');
        } catch (error) {
            console.error('Failed to initialize ContactShadowManager:', error);
            throw error;
        }
    }

    /**
     * Create shadow camera
     */
    createShadowCamera() {
        this.shadowCamera = new THREE.OrthographicCamera(
            -this.settings.planeSize / 2,
            this.settings.planeSize / 2,
            this.settings.planeSize / 2,
            -this.settings.planeSize / 2,
            this.settings.near,
            this.settings.far
        );
        
        this.shadowCamera.position.copy(this.settings.planePosition);
        this.shadowCamera.position.y += this.settings.far / 2;
        this.shadowCamera.lookAt(this.settings.planePosition);
    }

    /**
     * Create render targets for shadow rendering and blurring
     */
    createRenderTargets() {
        const resolution = this.settings.resolution;
        
        // Main shadow render target
        this.shadowRenderTarget = new THREE.WebGLRenderTarget(resolution, resolution, {
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            wrapS: THREE.ClampToEdgeWrapping,
            wrapT: THREE.ClampToEdgeWrapping,
            generateMipmaps: false,
            stencilBuffer: false,
            depthBuffer: true
        });

        // Blur render targets
        this.blurRenderTarget1 = new THREE.WebGLRenderTarget(resolution, resolution, {
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            wrapS: THREE.ClampToEdgeWrapping,
            wrapT: THREE.ClampToEdgeWrapping,
            generateMipmaps: false,
            stencilBuffer: false,
            depthBuffer: false
        });

        this.blurRenderTarget2 = this.blurRenderTarget1.clone();
    }

    /**
     * Create shadow materials
     */
    createShadowMaterials() {
        // Shadow depth material
        this.shadowMaterial = new THREE.MeshDepthMaterial({
            depthPacking: THREE.RGBADepthPacking,
            alphaTest: 0.001
        });

        // Horizontal blur material
        this.blurMaterial1 = new THREE.ShaderMaterial({
            ...HorizontalBlurShader,
            uniforms: {
                ...HorizontalBlurShader.uniforms,
                tDiffuse: { value: null },
                h: { value: 1.0 / this.settings.resolution }
            }
        });

        // Vertical blur material
        this.blurMaterial2 = new THREE.ShaderMaterial({
            ...VerticalBlurShader,
            uniforms: {
                ...VerticalBlurShader.uniforms,
                tDiffuse: { value: null },
                v: { value: 1.0 / this.settings.resolution }
            }
        });
    }

    /**
     * Create shadow receiving plane
     */
    createShadowPlane() {
        const planeGeometry = new THREE.PlaneGeometry(
            this.settings.planeSize, 
            this.settings.planeSize
        );
        planeGeometry.rotateX(-Math.PI / 2);

        const planeMaterial = new THREE.ShadowMaterial({
            opacity: this.settings.opacity,
            transparent: true,
            color: 0x000000
        });

        // Custom shader for contact shadows
        planeMaterial.onBeforeCompile = (shader) => {
            shader.uniforms.shadowTexture = { value: this.blurRenderTarget2.texture };
            shader.uniforms.shadowOpacity = { value: this.settings.opacity };
            shader.uniforms.shadowDarkness = { value: this.settings.darkness };
            
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `
                #include <common>
                uniform sampler2D shadowTexture;
                uniform float shadowOpacity;
                uniform float shadowDarkness;
                `
            );

            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <dithering_fragment>',
                `
                #include <dithering_fragment>
                
                vec2 shadowUv = (gl_FragCoord.xy / resolution.xy);
                vec4 shadowColor = texture2D(shadowTexture, shadowUv);
                float shadowValue = 1.0 - shadowColor.r;
                
                gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.0), shadowValue * shadowDarkness);
                gl_FragColor.a = shadowValue * shadowOpacity;
                `
            );
        };

        this.shadowPlane = new THREE.Mesh(planeGeometry, planeMaterial);
        this.shadowPlane.position.copy(this.settings.planePosition);
        this.shadowPlane.receiveShadow = false; // We handle shadows manually
        this.shadowPlane.visible = this.settings.enabled;
        
        this.scene.add(this.shadowPlane);
    }

    /**
     * Add object to cast contact shadows
     */
    addShadowCaster(object) {
        this.shadowCasters.add(object);
        this.core.emit('contactShadows:caster:added', { object });
    }

    /**
     * Remove object from shadow casting
     */
    removeShadowCaster(object) {
        this.shadowCasters.delete(object);
        this.core.emit('contactShadows:caster:removed', { object });
    }

    /**
     * Update shadow casters from current model
     */
    updateShadowCasters() {
        this.shadowCasters.clear();
        
        const currentModel = this.core.getState().currentModel;
        if (currentModel) {
            currentModel.traverse((child) => {
                if (child.isMesh) {
                    this.shadowCasters.add(child);
                }
            });
        }
    }

    /**
     * Render contact shadows
     */
    renderShadows() {
        if (!this.settings.enabled || this.shadowCasters.size === 0) {
            return;
        }

        const originalRenderTarget = this.renderer.getRenderTarget();
        const originalAutoClear = this.renderer.autoClear;
        const originalShadowMapEnabled = this.renderer.shadowMap.enabled;
        
        // Disable regular shadow mapping
        this.renderer.shadowMap.enabled = false;
        this.renderer.autoClear = false;

        // Store original materials
        const originalMaterials = new Map();
        this.shadowCasters.forEach(object => {
            if (object.material) {
                originalMaterials.set(object, object.material);
                object.material = this.shadowMaterial;
            }
        });

        // Render depth to shadow render target
        this.renderer.setRenderTarget(this.shadowRenderTarget);
        this.renderer.clear();
        
        // Render only shadow casters
        const tempScene = new THREE.Scene();
        this.shadowCasters.forEach(object => {
            tempScene.add(object);
        });
        
        this.renderer.render(tempScene, this.shadowCamera);

        // Restore objects to original scene
        this.shadowCasters.forEach(object => {
            this.scene.add(object);
        });

        // Apply blur
        this.applyBlur();

        // Restore original materials
        originalMaterials.forEach((material, object) => {
            object.material = material;
        });

        // Restore renderer state
        this.renderer.setRenderTarget(originalRenderTarget);
        this.renderer.autoClear = originalAutoClear;
        this.renderer.shadowMap.enabled = originalShadowMapEnabled;
    }

    /**
     * Apply blur to shadow texture
     */
    applyBlur() {
        const fullScreenQuad = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 2),
            this.blurMaterial1
        );

        const tempScene = new THREE.Scene();
        tempScene.add(fullScreenQuad);
        
        const tempCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        // Horizontal blur
        this.blurMaterial1.uniforms.tDiffuse.value = this.shadowRenderTarget.texture;
        this.blurMaterial1.uniforms.h.value = this.settings.blur / this.settings.resolution;
        
        this.renderer.setRenderTarget(this.blurRenderTarget1);
        this.renderer.render(tempScene, tempCamera);

        // Vertical blur
        fullScreenQuad.material = this.blurMaterial2;
        this.blurMaterial2.uniforms.tDiffuse.value = this.blurRenderTarget1.texture;
        this.blurMaterial2.uniforms.v.value = this.settings.blur / this.settings.resolution;
        
        this.renderer.setRenderTarget(this.blurRenderTarget2);
        this.renderer.render(tempScene, tempCamera);

        // Clean up
        tempScene.remove(fullScreenQuad);
        fullScreenQuad.geometry.dispose();
    }

    /**
     * Enable contact shadows
     */
    enable() {
        this.settings.enabled = true;
        if (this.shadowPlane) {
            this.shadowPlane.visible = true;
        }
        this.updateShadowCasters();
        this.core.emit('contactShadows:enabled');
    }

    /**
     * Disable contact shadows
     */
    disable() {
        this.settings.enabled = false;
        if (this.shadowPlane) {
            this.shadowPlane.visible = false;
        }
        this.core.emit('contactShadows:disabled');
    }

    /**
     * Update shadow settings
     */
    updateSettings(newSettings) {
        Object.assign(this.settings, newSettings);

        if (this.shadowPlane) {
            this.shadowPlane.material.opacity = this.settings.opacity;
            this.shadowPlane.position.copy(this.settings.planePosition);
        }

        if (this.shadowCamera) {
            this.shadowCamera.left = -this.settings.planeSize / 2;
            this.shadowCamera.right = this.settings.planeSize / 2;
            this.shadowCamera.top = this.settings.planeSize / 2;
            this.shadowCamera.bottom = -this.settings.planeSize / 2;
            this.shadowCamera.near = this.settings.near;
            this.shadowCamera.far = this.settings.far;
            this.shadowCamera.updateProjectionMatrix();
            
            this.shadowCamera.position.copy(this.settings.planePosition);
            this.shadowCamera.position.y += this.settings.far / 2;
            this.shadowCamera.lookAt(this.settings.planePosition);
        }

        // Update blur uniforms
        if (this.blurMaterial1 && this.blurMaterial2) {
            this.blurMaterial1.uniforms.h.value = this.settings.blur / this.settings.resolution;
            this.blurMaterial2.uniforms.v.value = this.settings.blur / this.settings.resolution;
        }

        this.core.emit('contactShadows:settings:updated', { settings: this.settings });
    }

    /**
     * Fit shadow plane to model
     */
    fitToModel() {
        const currentModel = this.core.getState().currentModel;
        if (!currentModel) return;

        const box = new THREE.Box3().setFromObject(currentModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // Update plane size and position
        const maxSize = Math.max(size.x, size.z) * 1.5;
        this.updateSettings({
            planeSize: maxSize,
            planePosition: new THREE.Vector3(center.x, box.min.y, center.z),
            far: size.y * 2
        });

        // Update shadow plane geometry
        if (this.shadowPlane) {
            this.shadowPlane.geometry.dispose();
            this.shadowPlane.geometry = new THREE.PlaneGeometry(maxSize, maxSize);
            this.shadowPlane.geometry.rotateX(-Math.PI / 2);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.core.on('model:loaded', () => {
            this.fitToModel();
            this.updateShadowCasters();
        });

        this.core.on('model:removed', () => {
            this.shadowCasters.clear();
        });
    }

    /**
     * Update contact shadows (called in render loop)
     */
    update() {
        if (this.settings.enabled) {
            this.renderShadows();
        }
    }

    /**
     * Get current settings
     */
    getSettings() {
        return { ...this.settings };
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Dispose render targets
        if (this.shadowRenderTarget) {
            this.shadowRenderTarget.dispose();
        }
        if (this.blurRenderTarget1) {
            this.blurRenderTarget1.dispose();
        }
        if (this.blurRenderTarget2) {
            this.blurRenderTarget2.dispose();
        }

        // Dispose materials
        if (this.shadowMaterial) {
            this.shadowMaterial.dispose();
        }
        if (this.blurMaterial1) {
            this.blurMaterial1.dispose();
        }
        if (this.blurMaterial2) {
            this.blurMaterial2.dispose();
        }

        // Remove shadow plane
        if (this.shadowPlane) {
            this.scene.remove(this.shadowPlane);
            this.shadowPlane.geometry.dispose();
            this.shadowPlane.material.dispose();
        }

        this.shadowCasters.clear();
        this.initialized = false;
    }
}