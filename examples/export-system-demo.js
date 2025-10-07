/**
 * Export System Demo
 * Demonstrates the comprehensive export functionality
 */

import { CoreEngine } from '../src/core/CoreEngine.js';
import { ExportSystem } from '../src/export/ExportSystem.js';
import { ExportPanel } from '../src/ui/ExportPanel.js';
import * as THREE from 'three';

class ExportSystemDemo {
    constructor() {
        this.core = new CoreEngine();
        this.exportSystem = null;
        this.exportPanel = null;
        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.testModels = [];
    }

    async init() {
        console.log('🚀 Initializing Export System Demo...');

        // Initialize core engine
        this.core.init();

        // Get export system
        this.exportSystem = this.core.getModule('export');
        if (!this.exportSystem) {
            console.error('Export system not available');
            return;
        }

        // Create basic Three.js setup for demo
        this.setupThreeJS();
        this.createTestModels();
        this.setupExportPanel();
        this.setupDemoControls();

        console.log('✅ Export System Demo initialized');
        this.showAvailableFeatures();
    }

    setupThreeJS() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x222222);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(5, 5, 5);
        this.camera.lookAt(0, 0, 0);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Add to DOM
        document.body.appendChild(this.renderer.domElement);

        // Add lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Mock rendering engine for export system
        this.core.modules.set('rendering', {
            renderer: this.renderer,
            camera: this.camera,
            scene: this.scene,
            render: () => this.renderer.render(this.scene, this.camera)
        });

        // Start render loop
        this.animate();
    }

    createTestModels() {
        console.log('📦 Creating test models...');

        // Create various test models
        const models = [
            {
                name: 'Cube',
                geometry: new THREE.BoxGeometry(1, 1, 1),
                material: new THREE.MeshLambertMaterial({ color: 0xff6b6b }),
                position: [-2, 0, 0]
            },
            {
                name: 'Sphere',
                geometry: new THREE.SphereGeometry(0.8, 32, 32),
                material: new THREE.MeshLambertMaterial({ color: 0x4ecdc4 }),
                position: [0, 0, 0]
            },
            {
                name: 'Cylinder',
                geometry: new THREE.CylinderGeometry(0.5, 0.5, 1.5, 32),
                material: new THREE.MeshLambertMaterial({ color: 0x45b7d1 }),
                position: [2, 0, 0]
            },
            {
                name: 'Torus',
                geometry: new THREE.TorusGeometry(0.6, 0.2, 16, 100),
                material: new THREE.MeshLambertMaterial({ color: 0xf9ca24 }),
                position: [0, 2, 0]
            }
        ];

        models.forEach(modelData => {
            const mesh = new THREE.Mesh(modelData.geometry, modelData.material);
            mesh.name = modelData.name;
            mesh.position.set(...modelData.position);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            this.scene.add(mesh);
            this.testModels.push(mesh);
        });

        // Set first model as current
        this.core.setState({ currentModel: this.testModels[0] });

        console.log(`✅ Created ${this.testModels.length} test models`);
    }

    setupExportPanel() {
        this.exportPanel = new ExportPanel(this.core);
        console.log('🎛️ Export panel created');
    }

    setupDemoControls() {
        // Create demo control panel
        const controlPanel = document.createElement('div');
        controlPanel.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            z-index: 1000;
            max-width: 300px;
        `;

        controlPanel.innerHTML = `
            <h3 style="margin: 0 0 15px 0;">Export System Demo</h3>
            
            <div style="margin-bottom: 15px;">
                <label>Current Model:</label>
                <select id="modelSelect" style="width: 100%; margin-top: 5px; padding: 5px;">
                    ${this.testModels.map((model, i) => 
                        `<option value="${i}">${model.name}</option>`
                    ).join('')}
                </select>
            </div>
            
            <div style="margin-bottom: 15px;">
                <button id="showExportPanel" style="width: 100%; padding: 8px; margin-bottom: 8px;">
                    🎛️ Show Export Panel
                </button>
                <button id="quickExportGLB" style="width: 100%; padding: 8px; margin-bottom: 8px;">
                    📦 Quick Export GLB
                </button>
                <button id="quickScreenshot" style="width: 100%; padding: 8px; margin-bottom: 8px;">
                    📸 Quick Screenshot
                </button>
                <button id="batchExport" style="width: 100%; padding: 8px; margin-bottom: 8px;">
                    📚 Batch Export All
                </button>
            </div>
            
            <div style="margin-bottom: 15px;">
                <h4 style="margin: 0 0 8px 0;">Test Presets:</h4>
                <button id="exportUnity" style="width: 100%; padding: 6px; margin-bottom: 4px; font-size: 12px;">
                    Unity Preset
                </button>
                <button id="exportBlender" style="width: 100%; padding: 6px; margin-bottom: 4px; font-size: 12px;">
                    Blender Preset
                </button>
                <button id="export3DPrint" style="width: 100%; padding: 6px; margin-bottom: 4px; font-size: 12px;">
                    3D Printing (STL)
                </button>
            </div>
            
            <div style="font-size: 12px; color: #ccc;">
                <p>Use the controls above to test different export features.</p>
            </div>
        `;

        document.body.appendChild(controlPanel);

        // Setup event listeners
        this.setupControlEvents(controlPanel);
    }

    setupControlEvents(controlPanel) {
        // Model selection
        controlPanel.querySelector('#modelSelect').addEventListener('change', (e) => {
            const modelIndex = parseInt(e.target.value);
            this.core.setState({ currentModel: this.testModels[modelIndex] });
            console.log(`📦 Selected model: ${this.testModels[modelIndex].name}`);
        });

        // Show export panel
        controlPanel.querySelector('#showExportPanel').addEventListener('click', () => {
            this.exportPanel.show();
        });

        // Quick export GLB
        controlPanel.querySelector('#quickExportGLB').addEventListener('click', async () => {
            try {
                console.log('📦 Quick exporting GLB...');
                await this.exportSystem.exportModel('glb', { filename: 'quick-export.glb' });
                console.log('✅ GLB export completed');
            } catch (error) {
                console.error('❌ GLB export failed:', error);
            }
        });

        // Quick screenshot
        controlPanel.querySelector('#quickScreenshot').addEventListener('click', async () => {
            try {
                console.log('📸 Taking screenshot...');
                await this.exportSystem.exportScreenshot({
                    width: 1920,
                    height: 1080,
                    format: 'png'
                });
                console.log('✅ Screenshot completed');
            } catch (error) {
                console.error('❌ Screenshot failed:', error);
            }
        });

        // Batch export
        controlPanel.querySelector('#batchExport').addEventListener('click', async () => {
            try {
                console.log('📚 Starting batch export...');
                const result = await this.exportSystem.batchExport(this.testModels, 'glb', {
                    filenameTemplate: '{name}_{index}'
                });
                console.log('✅ Batch export completed:', result);
            } catch (error) {
                console.error('❌ Batch export failed:', error);
            }
        });

        // Preset exports
        controlPanel.querySelector('#exportUnity').addEventListener('click', async () => {
            try {
                console.log('🎮 Exporting with Unity preset...');
                await this.exportSystem.exportWithPreset('unity');
                console.log('✅ Unity export completed');
            } catch (error) {
                console.error('❌ Unity export failed:', error);
            }
        });

        controlPanel.querySelector('#exportBlender').addEventListener('click', async () => {
            try {
                console.log('🎨 Exporting with Blender preset...');
                await this.exportSystem.exportWithPreset('blender');
                console.log('✅ Blender export completed');
            } catch (error) {
                console.error('❌ Blender export failed:', error);
            }
        });

        controlPanel.querySelector('#export3DPrint').addEventListener('click', async () => {
            try {
                console.log('🖨️ Exporting for 3D printing...');
                await this.exportSystem.exportWithPreset('3d-printing');
                console.log('✅ 3D printing export completed');
            } catch (error) {
                console.error('❌ 3D printing export failed:', error);
            }
        });
    }

    showAvailableFeatures() {
        console.log('\n🎯 Available Export Features:');
        
        const stats = this.exportSystem.getExportStatistics();
        
        console.log('📋 Supported Formats:', stats.availableFormats);
        console.log('🎛️ Available Presets:', stats.availablePresets);
        console.log('⚡ Optimizations:', stats.supportedOptimizations);
        console.log('✅ Validations:', stats.supportedValidations);
        
        console.log('\n💡 Try the following:');
        console.log('1. Click "Show Export Panel" for full export options');
        console.log('2. Use "Quick Export GLB" for immediate export');
        console.log('3. Try "Batch Export All" to export all models');
        console.log('4. Test different presets for various platforms');
        console.log('5. Take high-resolution screenshots');
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Rotate models for visual interest
        this.testModels.forEach((model, index) => {
            model.rotation.y += 0.01 * (index + 1);
        });

        this.renderer.render(this.scene, this.camera);
    }

    // Cleanup
    destroy() {
        if (this.exportPanel) {
            this.exportPanel.destroy();
        }
        
        if (this.renderer && this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        
        this.core.destroy();
    }
}

// Auto-start demo when page loads
document.addEventListener('DOMContentLoaded', async () => {
    const demo = new ExportSystemDemo();
    await demo.init();
    
    // Make demo available globally for debugging
    window.exportDemo = demo;
});

export { ExportSystemDemo };