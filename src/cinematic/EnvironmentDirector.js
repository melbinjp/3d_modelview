import * as THREE from 'three';

/**
 * EnvironmentDirector - Creates cinematic environments and atmospheric effects
 * Manages dynamic backgrounds, weather effects, and environmental storytelling
 */
export class EnvironmentDirector {
    constructor(scene) {
        this.scene = scene;
        
        // Environment state
        this.currentEnvironment = null;
        this.originalEnvironment = null;
        this.environmentMeshes = [];
        this.particleSystems = [];
        
        // Environment types
        this.environments = new Map();
        this.initializeEnvironments();
        
        // Animation properties
        this.animationMixers = [];
        this.clock = new THREE.Clock();
        
        // Weather effects
        this.weatherSystem = null;
        this.atmosphericEffects = [];
    }

    /**
     * Initialize available cinematic environments
     */
    initializeEnvironments() {
        this.environments.set('cosmic_scene', {
            name: 'Cosmic Scene',
            create: () => this.createCosmicEnvironment(),
            update: (progress, phase) => this.updateCosmicEnvironment(progress, phase)
        });
        
        this.environments.set('stormy_skies', {
            name: 'Stormy Skies',
            create: () => this.createStormyEnvironment(),
            update: (progress, phase) => this.updateStormyEnvironment(progress, phase)
        });
        
        this.environments.set('urban_landscape', {
            name: 'Urban Landscape',
            create: () => this.createUrbanEnvironment(),
            update: (progress, phase) => this.updateUrbanEnvironment(progress, phase)
        });
        
        this.environments.set('studio_setup', {
            name: 'Studio Setup',
            create: () => this.createStudioEnvironment(),
            update: (progress, phase) => this.updateStudioEnvironment(progress, phase)
        });
        
        this.environments.set('heroic_dawn', {
            name: 'Heroic Dawn',
            create: () => this.createHeroicDawnEnvironment(),
            update: (progress, phase) => this.updateHeroicDawnEnvironment(progress, phase)
        });
    }

    /**
     * Setup cinematic environment
     */
    async setupEnvironment(environmentType) {
        // Store original environment
        this.storeOriginalEnvironment();
        
        // Clear existing environment
        this.clearEnvironment();
        
        // Create new environment
        const environment = this.environments.get(environmentType);
        if (environment) {
            this.currentEnvironment = environmentType;
            await environment.create();
        } else {
            console.warn(`Unknown environment type: ${environmentType}`);
            await this.createCosmicEnvironment(); // Fallback
            this.currentEnvironment = 'cosmic_scene';
        }
    }

    /**
     * Create cosmic scene environment
     */
    async createCosmicEnvironment() {
        // Create starfield background
        await this.createStarfield();
        
        // Create nebula effects
        this.createNebula();
        
        // Create floating particles
        this.createCosmicParticles();
        
        // Create distant planets/moons
        this.createCelestialBodies();
        
        // Set cosmic fog
        this.scene.fog = new THREE.FogExp2(0x000011, 0.0008);
    }

    /**
     * Create starfield background
     */
    async createStarfield() {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 10000;
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount; i++) {
            const i3 = i * 3;
            
            // Random positions in sphere
            const radius = 1000;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);
            
            // Random star colors (white to blue)
            const intensity = 0.5 + Math.random() * 0.5;
            colors[i3] = intensity;
            colors[i3 + 1] = intensity;
            colors[i3 + 2] = intensity + Math.random() * 0.3;
        }
        
        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const starMaterial = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });
        
        const starField = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(starField);
        this.environmentMeshes.push(starField);
    }

    /**
     * Create nebula effects
     */
    createNebula() {
        const nebulaGeometry = new THREE.PlaneGeometry(500, 500);
        const nebulaMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color1: { value: new THREE.Color(0x4169e1) },
                color2: { value: new THREE.Color(0x8a2be2) },
                color3: { value: new THREE.Color(0xff1493) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 color1;
                uniform vec3 color2;
                uniform vec3 color3;
                varying vec2 vUv;
                
                float noise(vec2 p) {
                    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
                }
                
                float fbm(vec2 p) {
                    float value = 0.0;
                    float amplitude = 0.5;
                    for (int i = 0; i < 6; i++) {
                        value += amplitude * noise(p);
                        p *= 2.0;
                        amplitude *= 0.5;
                    }
                    return value;
                }
                
                void main() {
                    vec2 uv = vUv;
                    
                    float n1 = fbm(uv * 2.0 + time * 0.1);
                    float n2 = fbm(uv * 4.0 - time * 0.05);
                    
                    vec3 color = mix(color1, color2, n1);
                    color = mix(color, color3, n2 * 0.5);
                    
                    float alpha = (n1 + n2) * 0.3;
                    alpha *= (1.0 - length(uv - 0.5) * 1.5);
                    
                    gl_FragColor = vec4(color, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
        nebula.position.z = -200;
        nebula.rotation.z = Math.PI * 0.25;
        
        this.scene.add(nebula);
        this.environmentMeshes.push(nebula);
    }

    /**
     * Create cosmic particles
     */
    createCosmicParticles() {
        const particleCount = 1000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            positions[i3] = (Math.random() - 0.5) * 200;
            positions[i3 + 1] = (Math.random() - 0.5) * 200;
            positions[i3 + 2] = (Math.random() - 0.5) * 200;
            
            velocities[i3] = (Math.random() - 0.5) * 0.02;
            velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0x88ccff,
            size: 1,
            transparent: true,
            opacity: 0.6
        });
        
        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);
        this.environmentMeshes.push(particles);
        this.particleSystems.push(particles);
    }

    /**
     * Create celestial bodies
     */
    createCelestialBodies() {
        // Create distant planet
        const planetGeometry = new THREE.SphereGeometry(20, 32, 32);
        const planetMaterial = new THREE.MeshBasicMaterial({
            color: 0x4169e1,
            transparent: true,
            opacity: 0.3
        });
        
        const planet = new THREE.Mesh(planetGeometry, planetMaterial);
        planet.position.set(-150, 100, -300);
        
        this.scene.add(planet);
        this.environmentMeshes.push(planet);
        
        // Create moon
        const moonGeometry = new THREE.SphereGeometry(5, 16, 16);
        const moonMaterial = new THREE.MeshBasicMaterial({
            color: 0xcccccc,
            transparent: true,
            opacity: 0.4
        });
        
        const moon = new THREE.Mesh(moonGeometry, moonMaterial);
        moon.position.set(100, 80, -200);
        
        this.scene.add(moon);
        this.environmentMeshes.push(moon);
    }

    /**
     * Create stormy environment
     */
    async createStormyEnvironment() {
        // Create storm clouds
        this.createStormClouds();
        
        // Create lightning effects
        this.createLightningSystem();
        
        // Create rain particles
        this.createRainSystem();
        
        // Set stormy atmosphere
        this.scene.fog = new THREE.Fog(0x222222, 10, 200);
    }

    /**
     * Create storm clouds
     */
    createStormClouds() {
        const cloudGeometry = new THREE.PlaneGeometry(100, 50);
        const cloudMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                cloudColor: { value: new THREE.Color(0x333333) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 cloudColor;
                varying vec2 vUv;
                
                float noise(vec2 p) {
                    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
                }
                
                void main() {
                    vec2 uv = vUv;
                    float n = noise(uv * 8.0 + time * 0.5);
                    float alpha = smoothstep(0.3, 0.7, n);
                    
                    gl_FragColor = vec4(cloudColor, alpha * 0.8);
                }
            `,
            transparent: true,
            depthWrite: false
        });
        
        // Create multiple cloud layers
        for (let i = 0; i < 5; i++) {
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial.clone());
            cloud.position.set(
                (Math.random() - 0.5) * 200,
                50 + i * 10,
                -100 - i * 20
            );
            cloud.rotation.z = Math.random() * Math.PI;
            
            this.scene.add(cloud);
            this.environmentMeshes.push(cloud);
        }
    }

    /**
     * Create lightning system
     */
    createLightningSystem() {
        // Lightning will be created dynamically during updates
        this.lightningFlashes = [];
    }

    /**
     * Create rain system
     */
    createRainSystem() {
        const rainCount = 2000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(rainCount * 3);
        
        for (let i = 0; i < rainCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 200;
            positions[i3 + 1] = Math.random() * 100 + 50;
            positions[i3 + 2] = (Math.random() - 0.5) * 200;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0x87ceeb,
            size: 0.5,
            transparent: true,
            opacity: 0.6
        });
        
        const rain = new THREE.Points(geometry, material);
        this.scene.add(rain);
        this.environmentMeshes.push(rain);
        this.particleSystems.push(rain);
    }

    /**
     * Create urban environment
     */
    async createUrbanEnvironment() {
        // Create city skyline silhouette
        this.createCitySkyline();
        
        // Create street lights
        this.createStreetLights();
        
        // Create urban atmosphere
        this.scene.fog = new THREE.Fog(0x1a1a2e, 20, 150);
    }

    /**
     * Create city skyline
     */
    createCitySkyline() {
        const buildings = [];
        
        for (let i = 0; i < 20; i++) {
            const width = 5 + Math.random() * 10;
            const height = 20 + Math.random() * 40;
            const depth = 5 + Math.random() * 10;
            
            const geometry = new THREE.BoxGeometry(width, height, depth);
            const material = new THREE.MeshBasicMaterial({
                color: 0x1a1a2e,
                transparent: true,
                opacity: 0.8
            });
            
            const building = new THREE.Mesh(geometry, material);
            building.position.set(
                (Math.random() - 0.5) * 200,
                height / 2,
                -80 - Math.random() * 50
            );
            
            this.scene.add(building);
            this.environmentMeshes.push(building);
            
            // Add random lit windows
            if (Math.random() > 0.5) {
                this.addBuildingLights(building, width, height, depth);
            }
        }
    }

    /**
     * Add lights to buildings
     */
    addBuildingLights(building, width, height, depth) {
        const windowCount = Math.floor(Math.random() * 10) + 5;
        
        for (let i = 0; i < windowCount; i++) {
            const light = new THREE.PointLight(0xffff88, 0.5, 10);
            light.position.set(
                (Math.random() - 0.5) * width * 0.8,
                (Math.random() - 0.5) * height * 0.8,
                depth * 0.6
            );
            
            building.add(light);
        }
    }

    /**
     * Create street lights
     */
    createStreetLights() {
        for (let i = 0; i < 10; i++) {
            const light = new THREE.PointLight(0xffa500, 1, 20);
            light.position.set(
                (Math.random() - 0.5) * 100,
                8,
                (Math.random() - 0.5) * 100
            );
            
            this.scene.add(light);
            this.environmentMeshes.push(light);
        }
    }

    /**
     * Create studio environment
     */
    async createStudioEnvironment() {
        // Create studio floor
        const floorGeometry = new THREE.PlaneGeometry(100, 100);
        const floorMaterial = new THREE.MeshLambertMaterial({
            color: 0x404040
        });
        
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -5;
        floor.receiveShadow = true;
        
        this.scene.add(floor);
        this.environmentMeshes.push(floor);
        
        // Create studio backdrop
        const backdropGeometry = new THREE.PlaneGeometry(50, 30);
        const backdropMaterial = new THREE.MeshLambertMaterial({
            color: 0x808080
        });
        
        const backdrop = new THREE.Mesh(backdropGeometry, backdropMaterial);
        backdrop.position.set(0, 10, -20);
        
        this.scene.add(backdrop);
        this.environmentMeshes.push(backdrop);
        
        // Clear fog for clean studio look
        this.scene.fog = null;
    }

    /**
     * Create heroic dawn environment
     */
    async createHeroicDawnEnvironment() {
        // Create gradient sky
        this.createDawnSky();
        
        // Create sun rays
        this.createSunRays();
        
        // Create floating particles for magical effect
        this.createMagicalParticles();
        
        // Set dawn atmosphere
        this.scene.fog = new THREE.Fog(0xffd700, 50, 200);
    }

    /**
     * Create dawn sky gradient
     */
    createDawnSky() {
        const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x87ceeb) },
                bottomColor: { value: new THREE.Color(0xffd700) },
                offset: { value: 33 },
                exponent: { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        
        const sky = new THREE.Mesh(skyGeometry, skyMaterial);
        this.scene.add(sky);
        this.environmentMeshes.push(sky);
    }

    /**
     * Create sun rays effect
     */
    createSunRays() {
        const rayGeometry = new THREE.PlaneGeometry(200, 200);
        const rayMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                sunPosition: { value: new THREE.Vector3(100, 100, -100) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float time;
                uniform vec3 sunPosition;
                varying vec2 vUv;
                
                void main() {
                    vec2 uv = vUv - 0.5;
                    float angle = atan(uv.y, uv.x);
                    float rays = sin(angle * 12.0 + time) * 0.5 + 0.5;
                    float dist = length(uv);
                    
                    float alpha = rays * (1.0 - dist) * 0.3;
                    
                    gl_FragColor = vec4(1.0, 0.9, 0.6, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const sunRays = new THREE.Mesh(rayGeometry, rayMaterial);
        sunRays.position.set(50, 50, -50);
        sunRays.lookAt(0, 0, 0);
        
        this.scene.add(sunRays);
        this.environmentMeshes.push(sunRays);
    }

    /**
     * Create magical particles
     */
    createMagicalParticles() {
        const particleCount = 500;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 100;
            positions[i3 + 1] = Math.random() * 50;
            positions[i3 + 2] = (Math.random() - 0.5) * 100;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0xffd700,
            size: 2,
            transparent: true,
            opacity: 0.8
        });
        
        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);
        this.environmentMeshes.push(particles);
        this.particleSystems.push(particles);
    }

    /**
     * Update environment effects based on progress and phase
     */
    updateEffects(progress, phase) {
        const deltaTime = this.clock.getDelta();
        
        // Update current environment
        if (this.currentEnvironment && this.environments.has(this.currentEnvironment)) {
            this.environments.get(this.currentEnvironment).update(progress, phase);
        }
        
        // Update particle systems
        this.updateParticleSystems(deltaTime);
        
        // Update shader uniforms
        this.updateShaderUniforms(deltaTime);
        
        // Update animation mixers
        this.animationMixers.forEach(mixer => mixer.update(deltaTime));
    }

    /**
     * Update cosmic environment
     */
    updateCosmicEnvironment(progress, phase) {
        // Rotate starfield slowly
        if (this.environmentMeshes.length > 0) {
            this.environmentMeshes[0].rotation.y += 0.0002;
        }
        
        // Animate nebula
        if (this.environmentMeshes.length > 1) {
            const nebula = this.environmentMeshes[1];
            if (nebula.material.uniforms) {
                nebula.material.uniforms.time.value = performance.now() * 0.001;
            }
        }
    }

    /**
     * Update stormy environment
     */
    updateStormyEnvironment(progress, phase) {
        // Create random lightning flashes
        if (Math.random() < 0.02) {
            this.createLightningFlash();
        }
        
        // Update rain animation
        this.updateRainAnimation();
    }

    /**
     * Update urban environment
     */
    updateUrbanEnvironment(progress, phase) {
        // Flicker street lights occasionally
        this.environmentMeshes.forEach(mesh => {
            if (mesh.isLight && Math.random() < 0.01) {
                mesh.intensity = 0.5 + Math.random() * 0.5;
            }
        });
    }

    /**
     * Update studio environment
     */
    updateStudioEnvironment(progress, phase) {
        // Studio environment is static
    }

    /**
     * Update heroic dawn environment
     */
    updateHeroicDawnEnvironment(progress, phase) {
        // Animate sun rays
        this.environmentMeshes.forEach(mesh => {
            if (mesh.material && mesh.material.uniforms && mesh.material.uniforms.time) {
                mesh.material.uniforms.time.value = performance.now() * 0.001;
            }
        });
    }

    /**
     * Update particle systems
     */
    updateParticleSystems(deltaTime) {
        this.particleSystems.forEach(system => {
            const positions = system.geometry.attributes.position.array;
            
            for (let i = 0; i < positions.length; i += 3) {
                // Simple particle animation
                positions[i + 1] -= deltaTime * 10; // Fall down
                
                // Reset particles that fall too low
                if (positions[i + 1] < -50) {
                    positions[i + 1] = 50;
                }
            }
            
            system.geometry.attributes.position.needsUpdate = true;
        });
    }

    /**
     * Update shader uniforms
     */
    updateShaderUniforms(deltaTime) {
        const time = performance.now() * 0.001;
        
        this.environmentMeshes.forEach(mesh => {
            if (mesh.material && mesh.material.uniforms) {
                if (mesh.material.uniforms.time) {
                    mesh.material.uniforms.time.value = time;
                }
            }
        });
    }

    /**
     * Create lightning flash
     */
    createLightningFlash() {
        const flash = new THREE.PointLight(0xffffff, 5, 100);
        flash.position.set(
            (Math.random() - 0.5) * 100,
            30 + Math.random() * 20,
            -50 - Math.random() * 50
        );
        
        this.scene.add(flash);
        
        // Remove flash after short duration
        setTimeout(() => {
            this.scene.remove(flash);
        }, 100 + Math.random() * 200);
    }

    /**
     * Update rain animation
     */
    updateRainAnimation() {
        this.particleSystems.forEach(system => {
            if (system.material.color.getHex() === 0x87ceeb) { // Rain particles
                system.rotation.y += 0.001;
            }
        });
    }

    /**
     * Store original environment
     */
    storeOriginalEnvironment() {
        this.originalEnvironment = {
            fog: this.scene.fog,
            background: this.scene.background,
            environment: this.scene.environment
        };
    }

    /**
     * Clear current environment
     */
    clearEnvironment() {
        // Remove environment meshes
        this.environmentMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(mat => mat.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
        });
        
        this.environmentMeshes = [];
        this.particleSystems = [];
        
        // Clear fog
        this.scene.fog = null;
    }

    /**
     * Restore original environment
     */
    restoreOriginalEnvironment() {
        this.clearEnvironment();
        
        if (this.originalEnvironment) {
            this.scene.fog = this.originalEnvironment.fog;
            this.scene.background = this.originalEnvironment.background;
            this.scene.environment = this.originalEnvironment.environment;
        }
    }

    /**
     * Clean up environment
     */
    cleanup() {
        this.clearEnvironment();
        this.restoreOriginalEnvironment();
        this.currentEnvironment = null;
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        this.cleanup();
        this.animationMixers = [];
        this.atmosphericEffects = [];
    }
}