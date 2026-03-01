import * as THREE from 'three';

/**
 * LightingDirector - Creates cinematic lighting with dramatic shadows and atmospheric effects
 * Manages dynamic lighting that enhances the superhero reveal experience
 */
export class LightingDirector {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        
        // Lighting setup
        this.lights = new Map();
        this.originalLights = [];
        this.shadowMapEnabled = false;
        
        // Cinematic lighting components
        this.keyLight = null;
        this.fillLight = null;
        this.rimLight = null;
        this.backgroundLight = null;
        this.atmosphericLight = null;
        
        // Volumetric effects
        this.volumetricMaterial = null;
        this.volumetricGeometry = null;
        this.volumetricMesh = null;
        
        // Animation properties
        this.lightingTween = null;
        this.currentPhase = 'approach';
        
        // Configuration
        this.config = {
            enableShadows: true,
            shadowMapSize: 2048,
            volumetricIntensity: 0.3,
            rimLightIntensity: 2.0,
            keyLightIntensity: 1.5,
            fillLightIntensity: 0.4
        };
        
        this.initializeShadows();
    }

    /**
     * Initialize shadow mapping
     */
    initializeShadows() {
        if (!this.config.enableShadows || !this.renderer || !this.renderer.shadowMap) return;
        
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.shadowMap.autoUpdate = true;
        this.shadowMapEnabled = true;
    }

    /**
     * Setup cinematic lighting for superhero mode
     */
    setupCinematicLighting(targetModel, modelCenter) {
        // Store original lights
        this.storeOriginalLights();
        
        // Clear existing lights
        this.clearLights();
        
        // Calculate model bounds for lighting positioning
        const modelBounds = new THREE.Box3().setFromObject(targetModel);
        const modelSize = modelBounds.getSize(new THREE.Vector3()).length();
        
        // Create cinematic lighting setup
        this.createKeyLight(modelCenter, modelSize);
        this.createFillLight(modelCenter, modelSize);
        this.createRimLight(modelCenter, modelSize);
        this.createBackgroundLight(modelCenter, modelSize);
        this.createAtmosphericEffects(modelCenter, modelSize);
        
        // Enable model to cast and receive shadows
        this.setupModelShadows(targetModel);
        
        // Ensure all lights have proper intensity values
        if (this.keyLight && this.keyLight.intensity === 0) {
            this.keyLight.intensity = this.config.keyLightIntensity;
        }
        if (this.fillLight && this.fillLight.intensity === 0) {
            this.fillLight.intensity = this.config.fillLightIntensity;
        }
        if (this.rimLight && this.rimLight.intensity === 0) {
            this.rimLight.intensity = this.config.rimLightIntensity;
        }
        
        // Set initial lighting state
        this.setLightingPhase('approach');
    }

    /**
     * Create key light (main dramatic light)
     */
    createKeyLight(modelCenter, modelSize) {
        this.keyLight = new THREE.DirectionalLight(0xffffff, this.config.keyLightIntensity);
        
        // Position key light for dramatic angle
        const keyPosition = new THREE.Vector3(
            modelSize * 2,
            modelSize * 1.5,
            modelSize * 1.5
        ).add(modelCenter);
        
        this.keyLight.position.copy(keyPosition);
        this.keyLight.target.position.copy(modelCenter);
        
        // Setup shadows
        if (this.shadowMapEnabled) {
            this.keyLight.castShadow = true;
            this.keyLight.shadow.mapSize.width = this.config.shadowMapSize;
            this.keyLight.shadow.mapSize.height = this.config.shadowMapSize;
            this.keyLight.shadow.camera.near = 0.1;
            this.keyLight.shadow.camera.far = modelSize * 10;
            this.keyLight.shadow.camera.left = -modelSize * 2;
            this.keyLight.shadow.camera.right = modelSize * 2;
            this.keyLight.shadow.camera.top = modelSize * 2;
            this.keyLight.shadow.camera.bottom = -modelSize * 2;
            this.keyLight.shadow.bias = -0.0001;
        }
        
        this.scene.add(this.keyLight);
        this.scene.add(this.keyLight.target);
        this.lights.set('key', this.keyLight);
    }

    /**
     * Create fill light (softer secondary light)
     */
    createFillLight(modelCenter, modelSize) {
        this.fillLight = new THREE.DirectionalLight(0x87ceeb, this.config.fillLightIntensity);
        
        // Position fill light opposite to key light
        const fillPosition = new THREE.Vector3(
            -modelSize * 1.5,
            modelSize * 0.8,
            modelSize * 2
        ).add(modelCenter);
        
        this.fillLight.position.copy(fillPosition);
        this.fillLight.target.position.copy(modelCenter);
        
        this.scene.add(this.fillLight);
        this.scene.add(this.fillLight.target);
        this.lights.set('fill', this.fillLight);
    }

    /**
     * Create rim light (edge lighting for silhouette)
     */
    createRimLight(modelCenter, modelSize) {
        this.rimLight = new THREE.DirectionalLight(0xffd700, this.config.rimLightIntensity);
        
        // Debug: Ensure intensity is set correctly
        if (this.rimLight.intensity !== this.config.rimLightIntensity) {
            console.warn('Rim light intensity mismatch, correcting:', this.rimLight.intensity, '->', this.config.rimLightIntensity);
            this.rimLight.intensity = this.config.rimLightIntensity;
        }
        
        // Position rim light behind and above model
        const rimPosition = new THREE.Vector3(
            -modelSize * 0.5,
            modelSize * 2,
            -modelSize * 3
        ).add(modelCenter);
        
        this.rimLight.position.copy(rimPosition);
        this.rimLight.target.position.copy(modelCenter);
        
        this.scene.add(this.rimLight);
        this.scene.add(this.rimLight.target);
        this.lights.set('rim', this.rimLight);
    }

    /**
     * Create background ambient light
     */
    createBackgroundLight(modelCenter, modelSize) {
        this.backgroundLight = new THREE.AmbientLight(0x404040, 0.2);
        this.scene.add(this.backgroundLight);
        this.lights.set('background', this.backgroundLight);
    }

    /**
     * Create atmospheric lighting effects
     */
    createAtmosphericEffects(modelCenter, modelSize) {
        // Create atmospheric point light for volumetric effects
        this.atmosphericLight = new THREE.PointLight(0x4169e1, 0.8, modelSize * 8);
        this.atmosphericLight.position.set(
            modelCenter.x + modelSize * 3,
            modelCenter.y + modelSize * 4,
            modelCenter.z + modelSize * 2
        );
        
        this.scene.add(this.atmosphericLight);
        this.lights.set('atmospheric', this.atmosphericLight);
        
        // Create volumetric fog effect
        this.createVolumetricFog(modelCenter, modelSize);
    }

    /**
     * Create volumetric fog for atmospheric depth
     */
    createVolumetricFog(modelCenter, modelSize) {
        // Create fog geometry
        this.volumetricGeometry = new THREE.PlaneGeometry(modelSize * 8, modelSize * 8);
        
        // Create volumetric material with custom shader
        this.volumetricMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                intensity: { value: this.config.volumetricIntensity },
                color: { value: new THREE.Color(0x4169e1) },
                lightPosition: { value: this.atmosphericLight.position }
            },
            vertexShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                
                void main() {
                    vUv = uv;
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform float intensity;
                uniform vec3 color;
                uniform vec3 lightPosition;
                
                varying vec2 vUv;
                varying vec3 vPosition;
                
                float noise(vec2 p) {
                    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
                }
                
                void main() {
                    vec2 uv = vUv;
                    
                    // Create animated noise for volumetric effect
                    float n1 = noise(uv * 4.0 + time * 0.1);
                    float n2 = noise(uv * 8.0 - time * 0.05);
                    float n3 = noise(uv * 16.0 + time * 0.02);
                    
                    float noiseValue = (n1 + n2 * 0.5 + n3 * 0.25) / 1.75;
                    
                    // Distance from center for radial falloff
                    float dist = length(uv - 0.5);
                    float falloff = 1.0 - smoothstep(0.0, 0.5, dist);
                    
                    // Combine effects
                    float alpha = noiseValue * falloff * intensity;
                    
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        // Create volumetric mesh
        this.volumetricMesh = new THREE.Mesh(this.volumetricGeometry, this.volumetricMaterial);
        this.volumetricMesh.position.copy(modelCenter);
        this.volumetricMesh.position.z -= modelSize * 2;
        this.volumetricMesh.rotation.x = -Math.PI / 2;
        
        this.scene.add(this.volumetricMesh);
    }

    /**
     * Setup shadows for target model
     */
    setupModelShadows(model) {
        if (!this.shadowMapEnabled) return;
        
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
    }

    /**
     * Update lighting based on cinematic phase and progress
     */
    updateLighting(progress, phase) {
        this.currentPhase = phase && phase.name ? phase.name : phase;
        
        // Update volumetric effects
        if (this.volumetricMaterial) {
            this.volumetricMaterial.uniforms.time.value = performance.now() * 0.001;
        }
        
        // Phase-specific lighting adjustments
        switch (phase) {
            case 'approach':
                this.updateApproachLighting(progress);
                break;
            case 'reveal':
                this.updateRevealLighting(progress);
                break;
            case 'showcase':
                this.updateShowcaseLighting(progress);
                break;
            case 'finale':
                this.updateFinaleLighting(progress);
                break;
        }
    }

    /**
     * Update lighting for approach phase
     */
    updateApproachLighting(progress) {
        if (this.keyLight) {
            // Gradually increase key light intensity
            this.keyLight.intensity = this.config.keyLightIntensity * (0.3 + progress * 0.7);
            
            // Shift color temperature
            const warmth = 0.3 + progress * 0.4;
            this.keyLight.color.setHSL(0.1, 0.2, warmth);
        }
        
        if (this.rimLight) {
            // Subtle rim light buildup
            this.rimLight.intensity = this.config.rimLightIntensity * progress * 0.5;
        }
        
        if (this.volumetricMaterial) {
            // Increase atmospheric intensity
            this.volumetricMaterial.uniforms.intensity.value = this.config.volumetricIntensity * progress;
        }
    }

    /**
     * Update lighting for reveal phase
     */
    updateRevealLighting(progress) {
        if (this.keyLight) {
            // Dramatic key light increase
            this.keyLight.intensity = this.config.keyLightIntensity * (1 + progress * 0.5);
            this.keyLight.color.setHSL(0.15, 0.3, 0.9);
        }
        
        if (this.rimLight) {
            // Strong rim light for silhouette
            this.rimLight.intensity = this.config.rimLightIntensity * (0.5 + progress * 0.5);
        }
        
        if (this.fillLight) {
            // Reduce fill light for more contrast
            this.fillLight.intensity = this.config.fillLightIntensity * (1 - progress * 0.3);
        }
    }

    /**
     * Update lighting for showcase phase
     */
    updateShowcaseLighting(progress) {
        if (this.keyLight) {
            // Stable, strong key light
            this.keyLight.intensity = this.config.keyLightIntensity * 1.3;
            this.keyLight.color.setHSL(0.12, 0.25, 0.95);
        }
        
        if (this.rimLight) {
            // Full rim light intensity
            this.rimLight.intensity = this.config.rimLightIntensity;
        }
        
        if (this.fillLight) {
            // Balanced fill light
            this.fillLight.intensity = this.config.fillLightIntensity * 0.8;
        }
        
        // Animate atmospheric light position
        if (this.atmosphericLight) {
            const angle = progress * Math.PI * 2;
            const radius = 5;
            this.atmosphericLight.position.x += Math.sin(angle) * 0.1;
            this.atmosphericLight.position.z += Math.cos(angle) * 0.1;
        }
    }

    /**
     * Update lighting for finale phase
     */
    updateFinaleLighting(progress) {
        if (this.keyLight) {
            // Hero lighting - perfect balance
            this.keyLight.intensity = this.config.keyLightIntensity * 1.2;
            this.keyLight.color.setHSL(0.08, 0.15, 1.0);
        }
        
        if (this.rimLight) {
            // Golden rim light for hero effect
            this.rimLight.intensity = this.config.rimLightIntensity * 1.2;
            this.rimLight.color.setHSL(0.15, 0.8, 0.9);
        }
        
        if (this.fillLight) {
            // Subtle fill to maintain detail
            this.fillLight.intensity = this.config.fillLightIntensity * 0.6;
        }
        
        if (this.volumetricMaterial) {
            // Reduce atmospheric effects for clarity
            this.volumetricMaterial.uniforms.intensity.value = this.config.volumetricIntensity * 0.7;
        }
    }

    /**
     * Set lighting for specific phase
     */
    setLightingPhase(phase) {
        this.currentPhase = phase;
        
        switch (phase) {
            case 'approach':
                this.updateApproachLighting(0);
                break;
            case 'reveal':
                this.updateRevealLighting(0);
                break;
            case 'showcase':
                this.updateShowcaseLighting(0);
                break;
            case 'finale':
                this.updateFinaleLighting(1);
                break;
        }
    }

    /**
     * Set final hero lighting state
     */
    setHeroLighting() {
        this.setLightingPhase('finale');
        this.updateFinaleLighting(1);
    }

    /**
     * Store original lighting state
     */
    storeOriginalLights() {
        this.originalLights = [];
        
        this.scene.traverse((child) => {
            if (child.isLight) {
                this.originalLights.push({
                    light: child,
                    parent: child.parent
                });
            }
        });
    }

    /**
     * Clear all lights from scene
     */
    clearLights() {
        const lightsToRemove = [];
        
        this.scene.traverse((child) => {
            if (child.isLight) {
                lightsToRemove.push(child);
            }
        });
        
        lightsToRemove.forEach(light => {
            this.scene.remove(light);
        });
    }

    /**
     * Get current lighting state
     */
    getCurrentState() {
        return {
            lights: Array.from(this.lights.entries()).map(([name, light]) => ({
                name,
                type: light.type,
                position: light.position?.clone(),
                intensity: light.intensity,
                color: light.color?.clone()
            })),
            shadowMapEnabled: this.shadowMapEnabled,
            phase: this.currentPhase
        };
    }

    /**
     * Restore lighting state
     */
    restoreState(state) {
        // Clear cinematic lights
        this.cleanup();
        
        // Restore original lights
        this.originalLights.forEach(({ light, parent }) => {
            parent.add(light);
        });
        
        this.shadowMapEnabled = state.shadowMapEnabled;
        this.renderer.shadowMap.enabled = this.shadowMapEnabled;
    }

    /**
     * Clean up cinematic lighting
     */
    cleanup() {
        // Remove cinematic lights
        this.lights.forEach(light => {
            if (light.target) {
                this.scene.remove(light.target);
            }
            this.scene.remove(light);
        });
        this.lights.clear();
        
        // Remove volumetric effects
        if (this.volumetricMesh) {
            this.scene.remove(this.volumetricMesh);
            this.volumetricMesh = null;
        }
        
        if (this.volumetricGeometry) {
            this.volumetricGeometry.dispose();
            this.volumetricGeometry = null;
        }
        
        if (this.volumetricMaterial) {
            this.volumetricMaterial.dispose();
            this.volumetricMaterial = null;
        }
        
        // Reset references
        this.keyLight = null;
        this.fillLight = null;
        this.rimLight = null;
        this.backgroundLight = null;
        this.atmosphericLight = null;
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        this.cleanup();
        this.originalLights = [];
    }
}