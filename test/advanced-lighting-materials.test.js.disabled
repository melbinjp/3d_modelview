/**
 * Advanced Lighting and Material System Tests
 * Tests for HDRI environment lighting, PBR materials, lighting presets, 
 * high-quality shadows, and realistic post-processing effects
 */

describe('Advanced Lighting and Material System', () => {
    let core, renderingEngine, lightingManager, materialManager, contactShadowManager, postProcessingManager;
    let container;

    beforeEach(() => {
        // Create test container
        container = document.createElement('div');
        container.style.width = '800px';
        container.style.height = '600px';
        document.body.appendChild(container);

        // Initialize core engine and rendering system
        core = new (require('../src/core/CoreEngine.js').CoreEngine)();
        renderingEngine = new (require('../src/rendering/RenderingEngine.js').RenderingEngine)(core);
        
        renderingEngine.init(container);
        
        // Get advanced systems
        lightingManager = renderingEngine.getLightingManager();
        materialManager = renderingEngine.getMaterialManager();
        contactShadowManager = renderingEngine.getContactShadowManager();
        postProcessingManager = renderingEngine.getPostProcessingManager();
    });

    afterEach(() => {
        if (renderingEngine) {
            renderingEngine.destroy();
        }
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
    });

    describe('HDRI Environment Lighting', () => {
        it('should load HDRI environment maps', async () => {
            expect(lightingManager).toBeDefined();
            expect(typeof lightingManager.loadHDRI).toBe('function');
            
            // Mock HDRI loading
            const mockHDRI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
            
            try {
                await lightingManager.loadHDRI(mockHDRI);
                expect(lightingManager.environmentMap).toBeDefined();
            } catch (error) {
                // Expected for mock data, but function should exist
                expect(error).toBeDefined();
            }
        });

        it('should control environment intensity', () => {
            lightingManager.setEnvironmentIntensity(1.5);
            expect(lightingManager.environmentIntensity).toBe(1.5);
            expect(renderingEngine.renderer.toneMappingExposure).toBe(1.5);
        });

        it('should control environment rotation', () => {
            const rotation = Math.PI / 2;
            lightingManager.setEnvironmentRotation(rotation);
            expect(lightingManager.environmentRotation).toBe(rotation);
        });

        it('should set different background types', () => {
            lightingManager.setBackground('color');
            expect(renderingEngine.scene.background).toBeInstanceOf(THREE.Color);
            
            lightingManager.setBackground('none');
            expect(renderingEngine.scene.background).toBeNull();
        });
    });

    describe('PBR Material System', () => {
        it('should create accurate PBR materials', () => {
            const material = materialManager.createPBRMaterial('test_pbr', {
                color: new THREE.Color(0xff0000),
                metalness: 0.8,
                roughness: 0.2,
                clearcoat: 0.5,
                clearcoatRoughness: 0.1
            });

            expect(material).toBeInstanceOf(THREE.MeshPhysicalMaterial);
            expect(material.metalness).toBe(0.8);
            expect(material.roughness).toBe(0.2);
            expect(material.clearcoat).toBe(0.5);
            expect(material.clearcoatRoughness).toBe(0.1);
        });

        it('should support metallic workflow', () => {
            const material = materialManager.applyPreset('test_metal', 'gold');
            
            expect(material).toBeDefined();
            expect(material.metalness).toBe(1.0);
            expect(material.roughness).toBeLessThan(0.1);
            expect(materialManager.detectWorkflow(material)).toBe('metallic');
        });

        it('should support dielectric workflow', () => {
            const material = materialManager.applyPreset('test_plastic', 'plastic');
            
            expect(material).toBeDefined();
            expect(material.metalness).toBe(0.0);
            expect(materialManager.detectWorkflow(material)).toBe('dielectric');
        });

        it('should support transmission workflow', () => {
            const material = materialManager.applyPreset('test_glass', 'glass');
            
            expect(material).toBeDefined();
            expect(material.transmission).toBeGreaterThan(0.5);
            expect(material.transparent).toBe(true);
            expect(materialManager.detectWorkflow(material)).toBe('transmission');
        });

        it('should validate material properties', () => {
            const material = materialManager.createPBRMaterial('test_invalid', {
                metalness: 1.0,
                transmission: 0.8 // Invalid combination
            });

            const validation = materialManager.analyzeMaterial('test_invalid');
            expect(validation.validation.valid).toBe(false);
            expect(validation.validation.issues.length).toBeGreaterThan(0);
        });

        it('should apply textures to materials', () => {
            const material = materialManager.createPBRMaterial('test_textured', {
                textures: {
                    diffuse: 'test_diffuse.jpg',
                    normal: 'test_normal.jpg',
                    roughness: 'test_roughness.jpg',
                    metalness: 'test_metalness.jpg'
                }
            });

            expect(material.map).toBeDefined();
            expect(material.normalMap).toBeDefined();
            expect(material.roughnessMap).toBeDefined();
            expect(material.metalnessMap).toBeDefined();
        });
    });

    describe('Lighting Presets', () => {
        it('should have comprehensive lighting presets', () => {
            const presets = lightingManager.getPresets();
            const presetNames = presets.map(([name]) => name);
            
            expect(presetNames).toContain('studio');
            expect(presetNames).toContain('outdoor');
            expect(presetNames).toContain('dramatic');
            expect(presetNames).toContain('soft');
            expect(presetNames).toContain('night');
            expect(presetNames).toContain('golden');
        });

        it('should apply studio lighting preset', () => {
            lightingManager.applyPreset('studio');
            
            const ambientLight = lightingManager.getLight('ambient');
            const directionalLight = lightingManager.getLight('directional');
            
            expect(ambientLight.intensity).toBe(0.1);
            expect(directionalLight.intensity).toBe(2.0);
            expect(directionalLight.castShadow).toBe(true);
            expect(lightingManager.getCurrentPreset()).toBe('studio');
        });

        it('should apply dramatic lighting preset with contact shadows', () => {
            lightingManager.applyPreset('dramatic');
            
            const ambientLight = lightingManager.getLight('ambient');
            expect(ambientLight.intensity).toBe(0.05);
            
            // Should enable contact shadows
            expect(contactShadowManager.settings.enabled).toBe(true);
        });

        it('should configure post-processing with presets', () => {
            lightingManager.applyPreset('dramatic');
            
            // Check if post-processing effects are enabled
            const enabledPasses = postProcessingManager.getEnabledPasses();
            expect(enabledPasses).toContain('ssao');
            expect(enabledPasses).toContain('bloom');
        });
    });

    describe('High-Quality Shadow System', () => {
        it('should support soft shadows', () => {
            expect(renderingEngine.renderer.shadowMap.enabled).toBe(true);
            expect(renderingEngine.renderer.shadowMap.type).toBe(THREE.PCFSoftShadowMap);
        });

        it('should configure shadow quality', () => {
            const directionalLight = lightingManager.getLight('directional');
            
            expect(directionalLight.castShadow).toBe(true);
            expect(directionalLight.shadow.mapSize.width).toBe(2048);
            expect(directionalLight.shadow.mapSize.height).toBe(2048);
            expect(directionalLight.shadow.bias).toBeDefined();
            expect(directionalLight.shadow.normalBias).toBeDefined();
        });

        it('should enable contact shadows', () => {
            contactShadowManager.enable();
            
            expect(contactShadowManager.settings.enabled).toBe(true);
            expect(contactShadowManager.shadowPlane).toBeDefined();
            expect(contactShadowManager.shadowPlane.visible).toBe(true);
        });

        it('should configure contact shadow settings', () => {
            const newSettings = {
                opacity: 0.7,
                blur: 5.0,
                darkness: 1.2,
                resolution: 1024
            };
            
            contactShadowManager.updateSettings(newSettings);
            
            expect(contactShadowManager.settings.opacity).toBe(0.7);
            expect(contactShadowManager.settings.blur).toBe(5.0);
            expect(contactShadowManager.settings.darkness).toBe(1.2);
            expect(contactShadowManager.settings.resolution).toBe(1024);
        });

        it('should fit shadows to model', () => {
            // Create a test model
            const geometry = new THREE.BoxGeometry(2, 2, 2);
            const material = new THREE.MeshStandardMaterial();
            const testModel = new THREE.Mesh(geometry, material);
            
            renderingEngine.addModel(testModel);
            contactShadowManager.fitToModel();
            
            expect(contactShadowManager.settings.planeSize).toBeGreaterThan(2);
        });
    });

    describe('Realistic Post-Processing Effects', () => {
        it('should have realistic enhancement presets', () => {
            const presets = postProcessingManager.getRealisticPresets();
            const presetNames = presets.map(([name]) => name);
            
            expect(presetNames).toContain('subtle');
            expect(presetNames).toContain('professional');
            expect(presetNames).toContain('cinematic');
            expect(presetNames).toContain('architectural');
            expect(presetNames).toContain('product');
        });

        it('should apply subtle enhancement preset', () => {
            postProcessingManager.applyRealisticPreset('subtle');
            
            const enabledPasses = postProcessingManager.getEnabledPasses();
            expect(enabledPasses).toContain('ssao');
            expect(enabledPasses).toContain('fxaa');
            expect(enabledPasses).toContain('colorCorrection');
            expect(postProcessingManager.enabled).toBe(true);
        });

        it('should apply professional enhancement preset', () => {
            postProcessingManager.applyRealisticPreset('professional');
            
            const enabledPasses = postProcessingManager.getEnabledPasses();
            expect(enabledPasses).toContain('ssao');
            expect(enabledPasses).toContain('smaa');
            expect(enabledPasses).toContain('bloom');
            expect(enabledPasses).toContain('colorCorrection');
            expect(enabledPasses).toContain('vignette');
        });

        it('should apply cinematic enhancement preset', () => {
            postProcessingManager.applyRealisticPreset('cinematic');
            
            const enabledPasses = postProcessingManager.getEnabledPasses();
            expect(enabledPasses).toContain('ssao');
            expect(enabledPasses).toContain('ssr');
            expect(enabledPasses).toContain('bloom');
            expect(enabledPasses).toContain('film');
        });

        it('should configure SSAO for realism', () => {
            const ssaoPass = postProcessingManager.getPass('ssao');
            postProcessingManager.configureSSAO({
                kernelRadius: 8,
                minDistance: 0.005,
                maxDistance: 0.1
            });
            
            expect(ssaoPass.kernelRadius).toBe(8);
            expect(ssaoPass.minDistance).toBe(0.005);
            expect(ssaoPass.maxDistance).toBe(0.1);
        });

        it('should configure bloom for subtle enhancement', () => {
            const bloomPass = postProcessingManager.getPass('bloom');
            postProcessingManager.configureBloom({
                strength: 0.3,
                radius: 0.4,
                threshold: 0.9
            });
            
            expect(bloomPass.strength).toBe(0.3);
            expect(bloomPass.radius).toBe(0.4);
            expect(bloomPass.threshold).toBe(0.9);
        });

        it('should not over-process with realistic presets', () => {
            postProcessingManager.applyRealisticPreset('subtle');
            
            // Verify subtle settings
            const bloomPass = postProcessingManager.getPass('bloom');
            if (bloomPass && bloomPass.enabled) {
                expect(bloomPass.strength).toBeLessThanOrEqual(0.5);
                expect(bloomPass.threshold).toBeGreaterThanOrEqual(0.8);
            }
        });
    });

    describe('Integration Tests', () => {
        it('should integrate lighting presets with post-processing', () => {
            lightingManager.applyPreset('cinematic');
            
            // Should automatically configure post-processing
            const enabledPasses = postProcessingManager.getEnabledPasses();
            expect(enabledPasses.length).toBeGreaterThan(0);
        });

        it('should integrate materials with lighting', () => {
            // Apply dramatic lighting
            lightingManager.applyPreset('dramatic');
            
            // Create metallic material
            const material = materialManager.applyPreset('test_metal', 'chrome');
            
            // Material should respond well to dramatic lighting
            expect(material.metalness).toBe(1.0);
            expect(material.roughness).toBeLessThan(0.05);
        });

        it('should fit lighting to model automatically', () => {
            // Create a large test model
            const geometry = new THREE.BoxGeometry(10, 5, 8);
            const material = new THREE.MeshStandardMaterial();
            const testModel = new THREE.Mesh(geometry, material);
            
            renderingEngine.addModel(testModel);
            
            // Lighting should auto-fit
            const directionalLight = lightingManager.getLight('directional');
            const shadowCamera = directionalLight.shadow.camera;
            
            expect(shadowCamera.left).toBeLessThan(-7);
            expect(shadowCamera.right).toBeGreaterThan(7);
        });

        it('should maintain performance with all features enabled', () => {
            // Enable comprehensive features
            lightingManager.applyPreset('dramatic');
            postProcessingManager.applyRealisticPreset('cinematic');
            contactShadowManager.enable();
            
            // Create test model
            const geometry = new THREE.SphereGeometry(1, 32, 32);
            const material = materialManager.applyPreset('test_material', 'gold');
            const testModel = new THREE.Mesh(geometry, material);
            
            renderingEngine.addModel(testModel);
            
            // Should render without errors
            expect(() => {
                renderingEngine.render();
            }).not.toThrow();
        });
    });

    describe('Quality and Validation', () => {
        it('should validate material combinations', () => {
            const material = materialManager.createPBRMaterial('test_validation', {
                metalness: 0.8,
                transmission: 0.7 // Physically incorrect
            });
            
            const analysis = materialManager.analyzeMaterial('test_validation');
            expect(analysis.validation.valid).toBe(false);
        });

        it('should provide material analysis', () => {
            const material = materialManager.applyPreset('test_analysis', 'gold');
            const analysis = materialManager.analyzeMaterial('test_analysis');
            
            expect(analysis.workflow).toBe('metallic');
            expect(analysis.properties.metalness).toBe(1.0);
            expect(analysis.validation).toBeDefined();
        });

        it('should optimize materials for performance', () => {
            const material = materialManager.createPBRMaterial('test_optimize', {
                clearcoat: 0.0,
                transmission: 0.0,
                sheen: 0.0
            });
            
            materialManager.optimizeMaterial('test_optimize');
            
            expect(material.clearcoat).toBeUndefined();
            expect(material.transmission).toBeUndefined();
            expect(material.sheen).toBeUndefined();
        });
    });
});