import * as THREE from 'three';
import { CoreEngine } from '../src/core/CoreEngine.js';
import { RenderingEngine } from '../src/rendering/RenderingEngine.js';

/**
 * Advanced Three.js Features Demo
 * Demonstrates all the advanced Three.js integration features
 */
class AdvancedThreeJSDemo {
    constructor() {
        this.core = new CoreEngine();
        this.renderingEngine = null;
        this.container = null;
        this.currentModel = null;
        
        this.demoSteps = [
            'Basic Setup',
            'Post-Processing Effects',
            'Custom Shaders',
            'Physics Simulation',
            'Advanced Rendering Techniques',
            'WebXR Support',
            'GPU Compute Shaders'
        ];
        this.currentStep = 0;
    }

    async init() {
        try {
            // Initialize core engine
            await this.core.init();
            
            // Create container
            this.container = document.getElementById('viewer-container') || this.createContainer();
            
            // Initialize rendering engine
            this.renderingEngine = new RenderingEngine(this.core);
            this.renderingEngine.init(this.container);
            
            // Create demo UI
            this.createDemoUI();
            
            // Start with basic setup
            this.runDemoStep(0);
            
            console.log('Advanced Three.js Demo initialized successfully');
        } catch (error) {
            console.error('Failed to initialize demo:', error);
        }
    }

    createContainer() {
        const container = document.createElement('div');
        container.id = 'viewer-container';
        container.style.width = '100%';
        container.style.height = '600px';
        container.style.position = 'relative';
        container.style.border = '1px solid #ccc';
        document.body.appendChild(container);
        return container;
    }

    createDemoUI() {
        const ui = document.createElement('div');
        ui.style.position = 'absolute';
        ui.style.top = '10px';
        ui.style.left = '10px';
        ui.style.zIndex = '1000';
        ui.style.background = 'rgba(0, 0, 0, 0.8)';
        ui.style.color = 'white';
        ui.style.padding = '20px';
        ui.style.borderRadius = '5px';
        ui.style.fontFamily = 'Arial, sans-serif';
        ui.style.maxWidth = '300px';

        const title = document.createElement('h3');
        title.textContent = 'Advanced Three.js Features Demo';
        title.style.margin = '0 0 15px 0';
        ui.appendChild(title);

        const stepInfo = document.createElement('div');
        stepInfo.id = 'step-info';
        stepInfo.style.marginBottom = '15px';
        ui.appendChild(stepInfo);

        const controls = document.createElement('div');
        
        const prevButton = document.createElement('button');
        prevButton.textContent = 'Previous';
        prevButton.onclick = () => this.previousStep();
        prevButton.style.marginRight = '10px';
        controls.appendChild(prevButton);

        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.onclick = () => this.nextStep();
        controls.appendChild(nextButton);

        ui.appendChild(controls);

        // Feature toggles
        const toggles = document.createElement('div');
        toggles.style.marginTop = '15px';
        
        this.createToggle(toggles, 'Physics', () => {
            if (this.renderingEngine.physicsEngine.enabled) {
                this.renderingEngine.disablePhysics();
            } else {
                this.renderingEngine.enablePhysics();
            }
        });

        this.createToggle(toggles, 'Bloom', () => {
            const enabled = this.renderingEngine.postProcessingManager.getEnabledPasses().includes('bloom');
            if (enabled) {
                this.renderingEngine.disablePostProcessingEffect('bloom');
            } else {
                this.renderingEngine.enablePostProcessingEffect('bloom');
            }
        });

        this.createToggle(toggles, 'SSAO', () => {
            const enabled = this.renderingEngine.postProcessingManager.getEnabledPasses().includes('ssao');
            if (enabled) {
                this.renderingEngine.disablePostProcessingEffect('ssao');
            } else {
                this.renderingEngine.enablePostProcessingEffect('ssao');
            }
        });

        ui.appendChild(toggles);
        this.container.appendChild(ui);

        this.updateStepInfo();
    }

    createToggle(parent, label, callback) {
        const toggle = document.createElement('div');
        toggle.style.marginBottom = '5px';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `toggle-${label.toLowerCase()}`;
        checkbox.onchange = callback;
        
        const labelElement = document.createElement('label');
        labelElement.htmlFor = checkbox.id;
        labelElement.textContent = label;
        labelElement.style.marginLeft = '5px';
        labelElement.style.cursor = 'pointer';
        
        toggle.appendChild(checkbox);
        toggle.appendChild(labelElement);
        parent.appendChild(toggle);
    }

    updateStepInfo() {
        const stepInfo = document.getElementById('step-info');
        if (stepInfo) {
            stepInfo.innerHTML = `
                <strong>Step ${this.currentStep + 1}/${this.demoSteps.length}:</strong><br>
                ${this.demoSteps[this.currentStep]}
            `;
        }
    }

    nextStep() {
        if (this.currentStep < this.demoSteps.length - 1) {
            this.currentStep++;
            this.runDemoStep(this.currentStep);
            this.updateStepInfo();
        }
    }

    previousStep() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.runDemoStep(this.currentStep);
            this.updateStepInfo();
        }
    }

    runDemoStep(step) {
        switch (step) {
            case 0:
                this.demoBasicSetup();
                break;
            case 1:
                this.demoPostProcessing();
                break;
            case 2:
                this.demoCustomShaders();
                break;
            case 3:
                this.demoPhysics();
                break;
            case 4:
                this.demoAdvancedRendering();
                break;
            case 5:
                this.demoWebXR();
                break;
            case 6:
                this.demoComputeShaders();
                break;
        }
    }

    demoBasicSetup() {
        console.log('Demo Step 1: Basic Setup');
        
        // Clear scene
        this.clearScene();
        
        // Create a basic model
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x00ff00,
            metalness: 0.3,
            roughness: 0.4
        });
        this.currentModel = new THREE.Mesh(geometry, material);
        
        this.renderingEngine.addModel(this.currentModel);
        this.renderingEngine.fitCameraToModel();
        
        console.log('✓ Basic model added to scene');
        console.log('✓ All advanced systems initialized:', {
            postProcessing: !!this.renderingEngine.postProcessingManager,
            shaders: !!this.renderingEngine.shaderManager,
            physics: !!this.renderingEngine.physicsEngine,
            webxr: !!this.renderingEngine.webXRManager,
            advancedRendering: !!this.renderingEngine.advancedRenderingManager
        });
    }

    demoPostProcessing() {
        console.log('Demo Step 2: Post-Processing Effects');
        
        const postProcessing = this.renderingEngine.postProcessingManager;
        
        // Enable bloom effect
        postProcessing.enablePass('bloom');
        postProcessing.configureBloom({
            strength: 1.5,
            radius: 0.4,
            threshold: 0.85
        });
        
        // Enable SSAO
        postProcessing.enablePass('ssao');
        postProcessing.configureSSAO({
            kernelRadius: 8,
            minDistance: 0.005,
            maxDistance: 0.1
        });
        
        console.log('✓ Post-processing effects enabled:', postProcessing.getEnabledPasses());
        console.log('✓ Available effects:', postProcessing.getAvailablePasses());
    }

    demoCustomShaders() {
        console.log('Demo Step 3: Custom Shaders');
        
        if (!this.currentModel) return;
        
        const shaderManager = this.renderingEngine.shaderManager;
        
        // Apply holographic shader
        const holographicMaterial = shaderManager.createMaterial('holographic', {
            color1: { value: new THREE.Color(0x00ffff) },
            color2: { value: new THREE.Color(0xff00ff) },
            fresnelPower: { value: 2.0 }
        });
        
        this.currentModel.material = holographicMaterial;
        
        console.log('✓ Holographic shader applied');
        console.log('✓ Available shaders:', shaderManager.getAvailableShaders());
        
        // Demonstrate geometry modification
        const modifiedGeometry = shaderManager.applyGeometryModifier(
            new THREE.BoxGeometry(2, 2, 2),
            'noise',
            0.1,
            1
        );
        
        console.log('✓ Geometry modifier applied');
    }

    demoPhysics() {
        console.log('Demo Step 4: Physics Simulation');
        
        this.clearScene();
        
        const physics = this.renderingEngine.physicsEngine;
        physics.enable();
        
        // Create falling boxes
        for (let i = 0; i < 5; i++) {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshStandardMaterial({ 
                color: Math.random() * 0xffffff 
            });
            const mesh = new THREE.Mesh(geometry, material);
            
            mesh.position.set(
                (Math.random() - 0.5) * 4,
                5 + i * 2,
                (Math.random() - 0.5) * 4
            );
            
            this.renderingEngine.addModel(mesh);
            
            // Add physics body
            physics.addRigidBody(mesh, {
                type: 'dynamic',
                mass: 1,
                material: 'default'
            });
        }
        
        // Create ground
        const groundGeometry = new THREE.BoxGeometry(10, 0.5, 10);
        const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.position.y = -2;
        
        this.renderingEngine.scene.add(ground);
        physics.addRigidBody(ground, {
            type: 'static',
            mass: 0
        });
        
        console.log('✓ Physics simulation enabled');
        console.log('✓ Physics bodies created:', physics.getBodies().length);
    }

    demoAdvancedRendering() {
        console.log('Demo Step 5: Advanced Rendering Techniques');
        
        const advancedRendering = this.renderingEngine.advancedRenderingManager;
        
        // Enable deferred rendering
        advancedRendering.enableTechnique('deferred');
        
        // Enable volumetric lighting
        advancedRendering.enableTechnique('volumetric');
        
        console.log('✓ Advanced rendering techniques enabled:', 
            advancedRendering.getEnabledTechniques());
        console.log('✓ Available techniques:', 
            advancedRendering.getAvailableTechniques());
    }

    demoWebXR() {
        console.log('Demo Step 6: WebXR Support');
        
        const webxr = this.renderingEngine.webXRManager;
        
        // Add XR buttons to container
        this.renderingEngine.addXRButtons(this.container);
        
        console.log('✓ WebXR support initialized');
        console.log('✓ VR supported:', webxr.vrSupported);
        console.log('✓ AR supported:', webxr.arSupported);
        console.log('✓ Controllers:', webxr.controllers.length);
        console.log('✓ Hand tracking:', webxr.hands.length);
    }

    demoComputeShaders() {
        console.log('Demo Step 7: GPU Compute Shaders');
        
        const shaderManager = this.renderingEngine.shaderManager;
        
        // Create compute shader renderer
        const particleCompute = shaderManager.createComputeRenderer('particles', {});
        const fluidCompute = shaderManager.createComputeRenderer('fluid', {});
        
        console.log('✓ Compute shaders available:', 
            shaderManager.getAvailableComputeShaders());
        console.log('✓ Particle compute renderer:', !!particleCompute);
        console.log('✓ Fluid compute renderer:', !!fluidCompute);
        
        // Note: Actual compute shader execution would require WebGL 2.0 compute support
        console.log('Note: Compute shaders require WebGL 2.0 compute support (not widely available yet)');
    }

    clearScene() {
        if (this.currentModel) {
            this.renderingEngine.removeCurrentModel();
            this.currentModel = null;
        }
        
        // Clear physics bodies
        if (this.renderingEngine.physicsEngine) {
            this.renderingEngine.physicsEngine.reset();
        }
        
        // Clear additional scene objects
        const objectsToRemove = [];
        this.renderingEngine.scene.traverse(child => {
            if (child.isMesh && child !== this.renderingEngine.groundPlane) {
                objectsToRemove.push(child);
            }
        });
        
        objectsToRemove.forEach(obj => {
            this.renderingEngine.scene.remove(obj);
        });
    }

    // Animation loop
    animate() {
        requestAnimationFrame(() => this.animate());
        this.renderingEngine.update();
    }

    start() {
        this.animate();
        console.log('Advanced Three.js Demo started');
    }

    destroy() {
        if (this.renderingEngine) {
            this.renderingEngine.destroy();
        }
        if (this.core) {
            this.core.destroy();
        }
    }
}

// Auto-initialize if running in browser
if (typeof window !== 'undefined') {
    window.AdvancedThreeJSDemo = AdvancedThreeJSDemo;
    
    // Initialize demo when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', async () => {
            const demo = new AdvancedThreeJSDemo();
            await demo.init();
            demo.start();
            
            // Make demo available globally for debugging
            window.demo = demo;
        });
    } else {
        // DOM is already ready
        (async () => {
            const demo = new AdvancedThreeJSDemo();
            await demo.init();
            demo.start();
            
            // Make demo available globally for debugging
            window.demo = demo;
        })();
    }
}

export { AdvancedThreeJSDemo };