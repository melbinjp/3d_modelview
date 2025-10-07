import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';

/**
 * LightingManager - Advanced lighting system with HDRI support and preset configurations
 */
export class LightingManager {
    constructor(core, scene, renderer) {
        this.core = core;
        this.scene = scene;
        this.renderer = renderer;
        
        // Lighting components
        this.lights = new Map();
        this.lightHelpers = new Map();
        this.shadowCascades = [];
        
        // Environment lighting
        this.environmentMap = null;
        this.environmentIntensity = 1.0;
        this.environmentRotation = 0;
        this.backgroundBlurred = null;
        
        // Shadow system
        this.shadowMapSize = 2048;
        this.shadowCascadeCount = 3;
        this.contactShadows = null;
        
        // Lighting presets
        this.presets = new Map();
        this.currentPreset = null;
        
        // Loaders
        this.rgbeLoader = new RGBELoader();
        this.exrLoader = new EXRLoader();
        
        this.initialized = false;
        this.init();
    }

    /**
     * Initialize the lighting system
     */
    init() {
        if (this.initialized) return;

        try {
            this.setupShadowSystem();
            this.createDefaultLights();
            this.createLightingPresets();
            this.setupEventListeners();
            
            this.initialized = true;
            this.core.emit('lighting:initialized');
        } catch (error) {
            console.error('Failed to initialize LightingManager:', error);
            throw error;
        }
    }

    /**
     * Setup advanced shadow system
     */
    setupShadowSystem() {
        // Enable shadows on renderer
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.shadowMap.autoUpdate = true;
        
        // Setup tone mapping for better lighting
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        // Enable physically correct lights
        this.renderer.physicallyCorrectLights = true;
    }

    /**
     * Create default lighting setup
     */
    createDefaultLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
        this.lights.set('ambient', ambientLight);
        this.scene.add(ambientLight);

        // Main directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 3.0);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        
        // High-quality shadow setup
        directionalLight.shadow.mapSize.width = this.shadowMapSize;
        directionalLight.shadow.mapSize.height = this.shadowMapSize;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        directionalLight.shadow.bias = -0.0001;
        directionalLight.shadow.normalBias = 0.02;
        
        this.lights.set('directional', directionalLight);
        this.scene.add(directionalLight);

        // Fill light
        const fillLight = new THREE.DirectionalLight(0x87ceeb, 1.0);
        fillLight.position.set(-5, 3, -5);
        this.lights.set('fill', fillLight);
        this.scene.add(fillLight);

        // Rim light
        const rimLight = new THREE.DirectionalLight(0xffffff, 2.0);
        rimLight.position.set(0, 5, -10);
        this.lights.set('rim', rimLight);
        this.scene.add(rimLight);

        // Point lights for accent lighting
        const keyLight = new THREE.PointLight(0xffffff, 1.0, 30);
        keyLight.position.set(5, 5, 5);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 1024;
        keyLight.shadow.mapSize.height = 1024;
        this.lights.set('key', keyLight);
        this.scene.add(keyLight);
    }

    /**
     * Load HDRI environment map
     */
    async loadHDRI(url) {
        try {
            let texture;
            
            if (url.toLowerCase().endsWith('.exr')) {
                texture = await this.exrLoader.loadAsync(url);
            } else {
                texture = await this.rgbeLoader.loadAsync(url);
            }
            
            texture.mapping = THREE.EquirectangularReflectionMapping;
            
            this.setEnvironmentMap(texture);
            this.core.emit('lighting:hdri:loaded', { texture, url });
            
            return texture;
        } catch (error) {
            console.error('Failed to load HDRI:', error);
            throw error;
        }
    }

    /**
     * Set environment map
     */
    setEnvironmentMap(texture) {
        this.environmentMap = texture;
        
        // Apply to scene
        this.scene.environment = texture;
        
        // Create blurred version for background
        this.createBlurredBackground(texture);
        
        this.updateEnvironmentSettings();
        this.core.emit('lighting:environment:changed', { texture });
    }

    /**
     * Create blurred background from environment map
     */
    createBlurredBackground(texture) {
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();
        
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        this.backgroundBlurred = envMap;
        
        pmremGenerator.dispose();
    }

    /**
     * Set environment intensity
     */
    setEnvironmentIntensity(intensity) {
        this.environmentIntensity = intensity;
        this.updateEnvironmentSettings();
        this.core.emit('lighting:environment:intensity', { intensity });
    }

    /**
     * Set environment rotation
     */
    setEnvironmentRotation(rotation) {
        this.environmentRotation = rotation;
        this.updateEnvironmentSettings();
        this.core.emit('lighting:environment:rotation', { rotation });
    }

    /**
     * Update environment settings
     */
    updateEnvironmentSettings() {
        if (!this.environmentMap) return;

        // Apply intensity
        this.renderer.toneMappingExposure = this.environmentIntensity;
        
        // Apply rotation
        if (this.environmentRotation !== 0) {
            const matrix = new THREE.Matrix4();
            matrix.makeRotationY(this.environmentRotation);
            
            // Create rotated environment map
            const rotatedTexture = this.environmentMap.clone();
            rotatedTexture.matrix = matrix;
            rotatedTexture.matrixAutoUpdate = false;
            
            this.scene.environment = rotatedTexture;
        } else {
            this.scene.environment = this.environmentMap;
        }
    }

    /**
     * Set scene background
     */
    setBackground(type = 'environment') {
        switch (type) {
            case 'environment':
                this.scene.background = this.environmentMap;
                break;
            case 'blurred':
                this.scene.background = this.backgroundBlurred || this.environmentMap;
                break;
            case 'color':
                this.scene.background = new THREE.Color(0xf0f0f0);
                break;
            case 'none':
                this.scene.background = null;
                break;
            default:
                this.scene.background = type;
        }
        
        this.core.emit('lighting:background:changed', { type });
    }

    /**
     * Create lighting presets
     */
    createLightingPresets() {
        // Studio lighting preset
        this.presets.set('studio', {
            name: 'Studio',
            description: 'Professional studio lighting setup with three-point lighting',
            lights: {
                ambient: { color: 0x404040, intensity: 0.1 },
                directional: { 
                    color: 0xffffff, 
                    intensity: 2.0, 
                    position: [5, 10, 5],
                    castShadow: true
                },
                fill: { 
                    color: 0x87ceeb, 
                    intensity: 0.8, 
                    position: [-5, 5, -3] 
                },
                rim: { 
                    color: 0xffffff, 
                    intensity: 1.5, 
                    position: [0, 3, -8] 
                }
            },
            environment: {
                intensity: 0.8,
                rotation: 0
            },
            shadows: {
                enabled: true,
                type: 'soft',
                bias: -0.0001,
                normalBias: 0.02
            },
            postProcessing: {
                ssao: { enabled: true, intensity: 0.3 },
                bloom: { enabled: false }
            }
        });

        // Outdoor lighting preset
        this.presets.set('outdoor', {
            name: 'Outdoor',
            description: 'Natural outdoor lighting with realistic sun and sky',
            lights: {
                ambient: { color: 0x87ceeb, intensity: 0.3 },
                directional: { 
                    color: 0xfff8dc, 
                    intensity: 3.0, 
                    position: [10, 15, 5],
                    castShadow: true
                },
                fill: { 
                    color: 0x87ceeb, 
                    intensity: 1.2, 
                    position: [-8, 8, -5] 
                }
            },
            environment: {
                intensity: 1.2,
                rotation: 0
            },
            shadows: {
                enabled: true,
                type: 'hard',
                bias: -0.0005,
                normalBias: 0.01
            },
            postProcessing: {
                ssao: { enabled: true, intensity: 0.5 },
                bloom: { enabled: true, strength: 0.3, threshold: 0.9 }
            }
        });

        // Dramatic lighting preset
        this.presets.set('dramatic', {
            name: 'Dramatic',
            description: 'High contrast dramatic lighting with deep shadows',
            lights: {
                ambient: { color: 0x202020, intensity: 0.05 },
                directional: { 
                    color: 0xffffff, 
                    intensity: 4.0, 
                    position: [8, 12, 3],
                    castShadow: true
                },
                rim: { 
                    color: 0xff6b35, 
                    intensity: 2.0, 
                    position: [-3, 5, -10] 
                },
                key: {
                    color: 0xffffff,
                    intensity: 2.0,
                    position: [3, 8, 8],
                    distance: 20,
                    castShadow: true
                }
            },
            environment: {
                intensity: 0.4,
                rotation: Math.PI * 0.25
            },
            shadows: {
                enabled: true,
                type: 'contact',
                bias: -0.001,
                normalBias: 0.05,
                contactShadows: true
            },
            postProcessing: {
                ssao: { enabled: true, intensity: 0.8 },
                bloom: { enabled: true, strength: 0.8, threshold: 0.7 },
                vignette: { enabled: true, intensity: 0.3 }
            }
        });

        // Soft lighting preset
        this.presets.set('soft', {
            name: 'Soft',
            description: 'Soft, even lighting',
            lights: {
                ambient: { color: 0xffffff, intensity: 0.4 },
                directional: { 
                    color: 0xffffff, 
                    intensity: 1.5, 
                    position: [3, 8, 5],
                    castShadow: true
                },
                fill: { 
                    color: 0xffffff, 
                    intensity: 1.0, 
                    position: [-3, 5, 3] 
                }
            },
            environment: {
                intensity: 1.0,
                rotation: 0
            }
        });

        // Night lighting preset
        this.presets.set('night', {
            name: 'Night',
            description: 'Moody night lighting',
            lights: {
                ambient: { color: 0x1a1a2e, intensity: 0.1 },
                directional: { 
                    color: 0x4a69bd, 
                    intensity: 0.8, 
                    position: [2, 5, 8],
                    castShadow: true
                },
                key: {
                    color: 0xf39c12,
                    intensity: 3.0,
                    position: [-5, 3, 5],
                    distance: 15,
                    castShadow: true
                }
            },
            environment: {
                intensity: 0.3,
                rotation: Math.PI
            }
        });

        // Golden hour preset
        this.presets.set('golden', {
            name: 'Golden Hour',
            description: 'Warm golden hour lighting',
            lights: {
                ambient: { color: 0xffd700, intensity: 0.2 },
                directional: { 
                    color: 0xffa500, 
                    intensity: 2.5, 
                    position: [15, 3, 8],
                    castShadow: true
                },
                fill: { 
                    color: 0xff6347, 
                    intensity: 0.8, 
                    position: [-5, 2, -3] 
                }
            },
            environment: {
                intensity: 1.5,
                rotation: Math.PI * 0.75
            }
        });
    }

    /**
     * Apply lighting preset
     */
    applyPreset(presetName) {
        const preset = this.presets.get(presetName);
        if (!preset) {
            console.warn(`Lighting preset '${presetName}' not found`);
            return;
        }

        // Apply light settings
        Object.entries(preset.lights).forEach(([lightName, settings]) => {
            const light = this.lights.get(lightName);
            if (light) {
                if (settings.color !== undefined) {
                    light.color.setHex(settings.color);
                }
                if (settings.intensity !== undefined) {
                    light.intensity = settings.intensity;
                }
                if (settings.position !== undefined) {
                    light.position.set(...settings.position);
                }
                if (settings.distance !== undefined && light.distance !== undefined) {
                    light.distance = settings.distance;
                }
                if (settings.castShadow !== undefined) {
                    light.castShadow = settings.castShadow;
                }
            }
        });

        // Apply environment settings
        if (preset.environment) {
            if (preset.environment.intensity !== undefined) {
                this.setEnvironmentIntensity(preset.environment.intensity);
            }
            if (preset.environment.rotation !== undefined) {
                this.setEnvironmentRotation(preset.environment.rotation);
            }
        }

        // Apply shadow settings
        if (preset.shadows) {
            this.applyShadowSettings(preset.shadows);
        }

        // Apply post-processing settings
        if (preset.postProcessing) {
            this.applyPostProcessingSettings(preset.postProcessing);
        }

        this.currentPreset = presetName;
        this.core.emit('lighting:preset:applied', { preset: presetName, settings: preset });
    }

    /**
     * Apply shadow settings from preset
     */
    applyShadowSettings(shadowSettings) {
        if (shadowSettings.enabled) {
            // Configure shadow type and quality
            if (shadowSettings.type === 'soft') {
                this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            } else if (shadowSettings.type === 'hard') {
                this.renderer.shadowMap.type = THREE.PCFShadowMap;
            }

            // Apply shadow bias settings to all shadow-casting lights
            this.lights.forEach(light => {
                if (light.castShadow && light.shadow) {
                    if (shadowSettings.bias !== undefined) {
                        light.shadow.bias = shadowSettings.bias;
                    }
                    if (shadowSettings.normalBias !== undefined) {
                        light.shadow.normalBias = shadowSettings.normalBias;
                    }
                }
            });

            // Enable contact shadows if specified
            if (shadowSettings.contactShadows) {
                const contactShadowManager = this.core.getModule('contactShadows');
                if (contactShadowManager) {
                    contactShadowManager.enable();
                }
            }
        }
    }

    /**
     * Apply post-processing settings from preset
     */
    applyPostProcessingSettings(postProcessingSettings) {
        const postProcessingManager = this.core.getModule('postProcessing');
        if (!postProcessingManager) return;

        Object.entries(postProcessingSettings).forEach(([effectName, settings]) => {
            if (settings.enabled) {
                postProcessingManager.enablePass(effectName);
                
                // Configure specific effects
                switch (effectName) {
                    case 'ssao':
                        postProcessingManager.configureSSAO(settings);
                        break;
                    case 'bloom':
                        postProcessingManager.configureBloom(settings);
                        break;
                    case 'vignette':
                        postProcessingManager.configureVignette(settings);
                        break;
                }
            }
        });
    }

    /**
     * Create custom light
     */
    createLight(type, name, options = {}) {
        let light;

        switch (type) {
            case 'ambient':
                light = new THREE.AmbientLight(
                    options.color || 0xffffff,
                    options.intensity || 1.0
                );
                break;
            case 'directional':
                light = new THREE.DirectionalLight(
                    options.color || 0xffffff,
                    options.intensity || 1.0
                );
                if (options.position) {
                    light.position.set(...options.position);
                }
                if (options.castShadow) {
                    this.setupDirectionalLightShadows(light, options.shadow || {});
                }
                break;
            case 'point':
                light = new THREE.PointLight(
                    options.color || 0xffffff,
                    options.intensity || 1.0,
                    options.distance || 0,
                    options.decay || 2
                );
                if (options.position) {
                    light.position.set(...options.position);
                }
                if (options.castShadow) {
                    this.setupPointLightShadows(light, options.shadow || {});
                }
                break;
            case 'spot':
                light = new THREE.SpotLight(
                    options.color || 0xffffff,
                    options.intensity || 1.0,
                    options.distance || 0,
                    options.angle || Math.PI / 3,
                    options.penumbra || 0,
                    options.decay || 2
                );
                if (options.position) {
                    light.position.set(...options.position);
                }
                if (options.target) {
                    light.target.position.set(...options.target);
                    this.scene.add(light.target);
                }
                if (options.castShadow) {
                    this.setupSpotLightShadows(light, options.shadow || {});
                }
                break;
            case 'hemisphere':
                light = new THREE.HemisphereLight(
                    options.skyColor || 0xffffbb,
                    options.groundColor || 0x080820,
                    options.intensity || 1.0
                );
                break;
            case 'rectArea':
                light = new THREE.RectAreaLight(
                    options.color || 0xffffff,
                    options.intensity || 1.0,
                    options.width || 10,
                    options.height || 10
                );
                if (options.position) {
                    light.position.set(...options.position);
                }
                if (options.lookAt) {
                    light.lookAt(...options.lookAt);
                }
                break;
            default:
                console.warn(`Unknown light type: ${type}`);
                return null;
        }

        this.lights.set(name, light);
        this.scene.add(light);

        // Create helper if requested
        if (options.helper) {
            this.createLightHelper(name, type);
        }

        this.core.emit('lighting:light:created', { name, type, light });
        return light;
    }

    /**
     * Setup directional light shadows
     */
    setupDirectionalLightShadows(light, shadowOptions) {
        light.castShadow = true;
        light.shadow.mapSize.width = shadowOptions.mapSize || this.shadowMapSize;
        light.shadow.mapSize.height = shadowOptions.mapSize || this.shadowMapSize;
        light.shadow.camera.near = shadowOptions.near || 0.5;
        light.shadow.camera.far = shadowOptions.far || 50;
        light.shadow.camera.left = shadowOptions.left || -10;
        light.shadow.camera.right = shadowOptions.right || 10;
        light.shadow.camera.top = shadowOptions.top || 10;
        light.shadow.camera.bottom = shadowOptions.bottom || -10;
        light.shadow.bias = shadowOptions.bias || -0.0001;
        light.shadow.normalBias = shadowOptions.normalBias || 0.02;
    }

    /**
     * Setup point light shadows
     */
    setupPointLightShadows(light, shadowOptions) {
        light.castShadow = true;
        light.shadow.mapSize.width = shadowOptions.mapSize || 1024;
        light.shadow.mapSize.height = shadowOptions.mapSize || 1024;
        light.shadow.camera.near = shadowOptions.near || 0.5;
        light.shadow.camera.far = shadowOptions.far || 25;
        light.shadow.bias = shadowOptions.bias || -0.0001;
    }

    /**
     * Setup spot light shadows
     */
    setupSpotLightShadows(light, shadowOptions) {
        light.castShadow = true;
        light.shadow.mapSize.width = shadowOptions.mapSize || 1024;
        light.shadow.mapSize.height = shadowOptions.mapSize || 1024;
        light.shadow.camera.near = shadowOptions.near || 0.5;
        light.shadow.camera.far = shadowOptions.far || 25;
        light.shadow.bias = shadowOptions.bias || -0.0001;
    }

    /**
     * Create light helper
     */
    createLightHelper(lightName, lightType) {
        const light = this.lights.get(lightName);
        if (!light) return;

        let helper;
        switch (lightType) {
            case 'directional':
                helper = new THREE.DirectionalLightHelper(light, 1);
                break;
            case 'point':
                helper = new THREE.PointLightHelper(light, 1);
                break;
            case 'spot':
                helper = new THREE.SpotLightHelper(light);
                break;
            case 'hemisphere':
                helper = new THREE.HemisphereLightHelper(light, 1);
                break;
            default:
                return;
        }

        helper.visible = false;
        this.lightHelpers.set(lightName, helper);
        this.scene.add(helper);
    }

    /**
     * Toggle light helper visibility
     */
    toggleLightHelper(lightName, visible) {
        const helper = this.lightHelpers.get(lightName);
        if (helper) {
            helper.visible = visible;
        }
    }

    /**
     * Remove light
     */
    removeLight(name) {
        const light = this.lights.get(name);
        if (light) {
            this.scene.remove(light);
            this.lights.delete(name);

            // Remove helper if exists
            const helper = this.lightHelpers.get(name);
            if (helper) {
                this.scene.remove(helper);
                this.lightHelpers.delete(name);
            }

            this.core.emit('lighting:light:removed', { name });
        }
    }

    /**
     * Get light by name
     */
    getLight(name) {
        return this.lights.get(name);
    }

    /**
     * Get all lights
     */
    getAllLights() {
        return Array.from(this.lights.entries());
    }

    /**
     * Get available presets
     */
    getPresets() {
        return Array.from(this.presets.entries());
    }

    /**
     * Get current preset
     */
    getCurrentPreset() {
        return this.currentPreset;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.core.on('model:loaded', () => {
            // Auto-fit lighting to model if needed
            this.fitLightingToModel();
        });
    }

    /**
     * Fit lighting to loaded model
     */
    fitLightingToModel() {
        const currentModel = this.core.getState().currentModel;
        if (!currentModel) return;

        const box = new THREE.Box3().setFromObject(currentModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        // Adjust directional light shadow camera
        const directionalLight = this.lights.get('directional');
        if (directionalLight && directionalLight.shadow) {
            const shadowSize = maxDim * 1.5;
            directionalLight.shadow.camera.left = -shadowSize;
            directionalLight.shadow.camera.right = shadowSize;
            directionalLight.shadow.camera.top = shadowSize;
            directionalLight.shadow.camera.bottom = -shadowSize;
            directionalLight.shadow.camera.updateProjectionMatrix();
        }

        // Adjust point light distances
        this.lights.forEach((light, name) => {
            if (light.isPointLight || light.isSpotLight) {
                if (light.distance === 0) {
                    light.distance = maxDim * 3;
                }
            }
        });
    }

    /**
     * Update lighting system
     */
    update(deltaTime) {
        // Update light helpers
        this.lightHelpers.forEach(helper => {
            if (helper.update) {
                helper.update();
            }
        });
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Remove all lights
        this.lights.forEach((light, name) => {
            this.scene.remove(light);
        });
        this.lights.clear();

        // Remove all helpers
        this.lightHelpers.forEach((helper, name) => {
            this.scene.remove(helper);
        });
        this.lightHelpers.clear();

        // Dispose environment map
        if (this.environmentMap) {
            this.environmentMap.dispose();
        }
        if (this.backgroundBlurred) {
            this.backgroundBlurred.dispose();
        }

        this.presets.clear();
        this.initialized = false;
    }
}