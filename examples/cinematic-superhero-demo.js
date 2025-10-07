/**
 * Cinematic Superhero Mode Demo
 * Demonstrates the enhanced cinematic superhero mode with professional camera movements,
 * dynamic lighting, and atmospheric environments
 */

import * as THREE from 'three';
import { CinematicEngine } from '../src/cinematic/CinematicEngine.js';

class CinematicSuperheroDemo {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.cinematicEngine = null;
        this.testModel = null;
        
        this.init();
        this.createTestModel();
        this.setupUI();
        this.animate();
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x222222);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 5);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        // Create mock rendering engine for cinematic engine
        const mockRenderingEngine = {
            scene: this.scene,
            camera: this.camera,
            renderer: this.renderer
        };

        // Initialize cinematic engine
        this.cinematicEngine = new CinematicEngine(mockRenderingEngine);

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    createTestModel() {
        // Create a simple character-like model for testing
        const group = new THREE.Group();

        // Body
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.5, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x4169e1 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.75;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Head
        const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.75;
        head.castShadow = true;
        head.receiveShadow = true;
        group.add(head);

        // Arms
        const armGeometry = new THREE.CylinderGeometry(0.1, 0.12, 1.2, 6);
        const armMaterial = new THREE.MeshLambertMaterial({ color: 0x4169e1 });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.5, 1, 0);
        leftArm.rotation.z = Math.PI * 0.1;
        leftArm.castShadow = true;
        group.add(leftArm);

        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.5, 1, 0);
        rightArm.rotation.z = -Math.PI * 0.1;
        rightArm.castShadow = true;
        group.add(rightArm);

        // Legs
        const legGeometry = new THREE.CylinderGeometry(0.12, 0.15, 1.5, 6);
        const legMaterial = new THREE.MeshLambertMaterial({ color: 0x2c5aa0 });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.2, -0.75, 0);
        leftLeg.castShadow = true;
        group.add(leftLeg);

        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.2, -0.75, 0);
        rightLeg.castShadow = true;
        group.add(rightLeg);

        // Cape
        const capeGeometry = new THREE.PlaneGeometry(1.2, 1.8);
        const capeMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x8b0000, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        const cape = new THREE.Mesh(capeGeometry, capeMaterial);
        cape.position.set(0, 0.5, -0.3);
        cape.rotation.x = Math.PI * 0.1;
        group.add(cape);

        this.testModel = group;
        this.scene.add(this.testModel);

        // Add basic lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Add ground plane
        const groundGeometry = new THREE.PlaneGeometry(20, 20);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -1.5;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    setupUI() {
        // Create UI container
        const uiContainer = document.createElement('div');
        uiContainer.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 10px;
            font-family: Arial, sans-serif;
            z-index: 1000;
        `;

        // Title
        const title = document.createElement('h2');
        title.textContent = 'Cinematic Superhero Mode Demo';
        title.style.margin = '0 0 15px 0';
        uiContainer.appendChild(title);

        // Environment selector
        const envLabel = document.createElement('label');
        envLabel.textContent = 'Environment: ';
        envLabel.style.display = 'block';
        envLabel.style.marginBottom = '5px';
        uiContainer.appendChild(envLabel);

        const envSelect = document.createElement('select');
        envSelect.style.cssText = 'width: 200px; margin-bottom: 15px; padding: 5px;';
        const environments = [
            { value: 'cosmic_scene', label: 'Cosmic Scene' },
            { value: 'stormy_skies', label: 'Stormy Skies' },
            { value: 'urban_landscape', label: 'Urban Landscape' },
            { value: 'heroic_dawn', label: 'Heroic Dawn' },
            { value: 'studio_setup', label: 'Studio Setup' }
        ];

        environments.forEach(env => {
            const option = document.createElement('option');
            option.value = env.value;
            option.textContent = env.label;
            envSelect.appendChild(option);
        });
        uiContainer.appendChild(envSelect);

        // Start button
        const startBtn = document.createElement('button');
        startBtn.textContent = 'Start Cinematic Sequence';
        startBtn.style.cssText = `
            background: #4169e1;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-right: 10px;
            margin-bottom: 10px;
        `;
        startBtn.addEventListener('click', () => this.startCinematicSequence(envSelect.value));
        uiContainer.appendChild(startBtn);

        // Stop button
        const stopBtn = document.createElement('button');
        stopBtn.textContent = 'Stop Sequence';
        stopBtn.style.cssText = `
            background: #dc143c;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-bottom: 10px;
        `;
        stopBtn.addEventListener('click', () => this.stopCinematicSequence());
        uiContainer.appendChild(stopBtn);

        // Status display
        this.statusDisplay = document.createElement('div');
        this.statusDisplay.style.cssText = `
            background: rgba(255, 255, 255, 0.1);
            padding: 10px;
            border-radius: 5px;
            margin-top: 10px;
            font-size: 12px;
        `;
        this.statusDisplay.innerHTML = '<strong>Status:</strong> Ready';
        uiContainer.appendChild(this.statusDisplay);

        document.body.appendChild(uiContainer);

        // Instructions
        const instructions = document.createElement('div');
        instructions.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 10px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            max-width: 300px;
        `;
        instructions.innerHTML = `
            <strong>Instructions:</strong><br>
            1. Select an environment type<br>
            2. Click "Start Cinematic Sequence"<br>
            3. Watch the professional camera movements<br>
            4. Observe dynamic lighting and atmospheric effects<br>
            5. Experience the narrative structure: approach → reveal → showcase → finale
        `;
        document.body.appendChild(instructions);
    }

    async startCinematicSequence(environmentType = 'cosmic_scene') {
        if (!this.testModel) {
            console.error('No model available for cinematic sequence');
            return;
        }

        try {
            this.updateStatus('Starting cinematic sequence...', 'info');

            const options = {
                model: this.testModel,
                environmentType: environmentType,
                onComplete: () => {
                    this.updateStatus('Cinematic sequence completed! Model positioned in hero pose.', 'success');
                }
            };

            const result = await this.cinematicEngine.startReveal(options);
            
            this.updateStatus(
                `Cinematic sequence "${result.sequence}" started! Duration: ${result.duration.toFixed(1)}s`, 
                'success'
            );

            // Update status periodically during sequence
            this.statusInterval = setInterval(() => {
                const state = this.cinematicEngine.getState();
                if (state.isActive) {
                    this.updateStatus(
                        `Phase: ${state.currentPhase?.name || 'unknown'} | Progress: ${(state.progress * 100).toFixed(1)}%`,
                        'info'
                    );
                } else {
                    clearInterval(this.statusInterval);
                }
            }, 500);

        } catch (error) {
            console.error('Failed to start cinematic sequence:', error);
            this.updateStatus(`Error: ${error.message}`, 'error');
        }
    }

    stopCinematicSequence() {
        if (this.cinematicEngine) {
            this.cinematicEngine.stopReveal();
            this.updateStatus('Cinematic sequence stopped', 'warning');
            
            if (this.statusInterval) {
                clearInterval(this.statusInterval);
                this.statusInterval = null;
            }
        }
    }

    updateStatus(message, type = 'info') {
        if (!this.statusDisplay) return;

        const colors = {
            info: '#4169e1',
            success: '#32cd32',
            warning: '#ffa500',
            error: '#dc143c'
        };

        this.statusDisplay.innerHTML = `
            <strong style="color: ${colors[type]}">Status:</strong> ${message}
        `;
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Render the scene
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize demo when page loads
document.addEventListener('DOMContentLoaded', () => {
    new CinematicSuperheroDemo();
});

export { CinematicSuperheroDemo };