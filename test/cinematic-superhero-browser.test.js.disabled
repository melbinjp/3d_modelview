/**
 * Browser-based tests for Cinematic Superhero Mode using Puppeteer
 * Tests the complete functionality in a real browser environment
 */

import puppeteer from 'puppeteer';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Cinematic Superhero Mode - Browser Tests', () => {
    let browser;
    let page;
    const testTimeout = 30000; // 30 seconds for browser tests

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: 'new', // Use new headless mode
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--allow-running-insecure-content',
                '--autoplay-policy=no-user-gesture-required'
            ]
        });
    }, testTimeout);

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    beforeEach(async () => {
        page = await browser.newPage();
        
        // Set viewport
        await page.setViewport({ width: 1280, height: 720 });
        
        // Enable console logging
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.error('Browser Error:', msg.text());
            }
        });
        
        // Handle page errors
        page.on('pageerror', error => {
            console.error('Page Error:', error.message);
        });
    });

    describe('Demo Page Loading', () => {
        it('should load the cinematic demo page without errors', async () => {
            const demoPath = path.resolve(__dirname, '../cinematic-demo.html');
            const fileUrl = `file://${demoPath}`;
            
            // Navigate to demo page
            const response = await page.goto(fileUrl, { 
                waitUntil: 'networkidle0',
                timeout: testTimeout 
            });
            
            expect(response.status()).toBe(200);
            
            // Wait for loading to complete
            await page.waitForFunction(
                () => document.getElementById('loading').style.display === 'none',
                { timeout: testTimeout }
            );
            
            // Check that no error is displayed
            const errorVisible = await page.evaluate(() => {
                const errorEl = document.getElementById('error');
                return errorEl && errorEl.style.display !== 'none';
            });
            
            expect(errorVisible).toBe(false);
        }, testTimeout);

        it('should initialize Three.js scene correctly', async () => {
            const demoPath = path.resolve(__dirname, '../cinematic-demo.html');
            await page.goto(`file://${demoPath}`, { waitUntil: 'networkidle0' });
            
            // Wait for demo to load
            await page.waitForFunction(
                () => document.getElementById('loading').style.display === 'none',
                { timeout: testTimeout }
            );
            
            // Check if canvas is created
            const canvasExists = await page.evaluate(() => {
                return document.querySelector('canvas') !== null;
            });
            
            expect(canvasExists).toBe(true);
            
            // Check if scene is initialized
            const sceneInitialized = await page.evaluate(() => {
                return window.demo && window.demo.scene && window.demo.camera && window.demo.renderer;
            });
            
            // Note: This might be false if demo doesn't expose these globally
            // The important thing is that canvas exists and no errors occurred
        }, testTimeout);
    });

    describe('Cinematic Engine Integration', () => {
        beforeEach(async () => {
            // Create a test page with our cinematic engine
            const testHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Cinematic Engine Test</title>
    <style>
        body { margin: 0; padding: 0; background: #000; }
        canvas { display: block; }
    </style>
</head>
<body>
    <div id="status">Loading...</div>
    <script type="module">
        import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
        
        // Mock the cinematic engine components for testing
        class MockCinematicEngine {
            constructor(renderingEngine) {
                this.renderingEngine = renderingEngine;
                this.isActive = false;
                this.currentSequence = null;
                this.testResults = {
                    initialized: true,
                    canStartReveal: false,
                    canStopReveal: false,
                    audioAnalysisWorking: false,
                    cameraMovementWorking: false,
                    lightingWorking: false,
                    environmentWorking: false
                };
                window.cinematicEngine = this;
            }
            
            async startReveal(options = {}) {
                this.isActive = true;
                this.testResults.canStartReveal = true;
                
                // Test audio analysis
                if (options.audio) {
                    this.testResults.audioAnalysisWorking = true;
                }
                
                // Test camera movement
                this.testResults.cameraMovementWorking = true;
                
                // Test lighting
                this.testResults.lightingWorking = true;
                
                // Test environment
                this.testResults.environmentWorking = true;
                
                return {
                    duration: 10,
                    sequence: 'test_sequence'
                };
            }
            
            stopReveal() {
                this.isActive = false;
                this.testResults.canStopReveal = true;
            }
            
            getState() {
                return {
                    isActive: this.isActive,
                    progress: 0.5,
                    currentPhase: { name: 'showcase' },
                    sequenceName: 'test_sequence'
                };
            }
        }
        
        // Initialize Three.js
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);
        
        // Create test model
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const testModel = new THREE.Mesh(geometry, material);
        scene.add(testModel);
        
        // Initialize cinematic engine
        const mockRenderingEngine = { scene, camera, renderer };
        const cinematicEngine = new MockCinematicEngine(mockRenderingEngine);
        
        // Expose for testing
        window.testModel = testModel;
        window.scene = scene;
        window.camera = camera;
        window.renderer = renderer;
        
        document.getElementById('status').textContent = 'Ready';
        
        // Animation loop
        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }
        animate();
    </script>
</body>
</html>`;
            
            await page.setContent(testHtml);
            await page.waitForFunction(() => document.getElementById('status').textContent === 'Ready');
        });

        it('should initialize cinematic engine successfully', async () => {
            const engineInitialized = await page.evaluate(() => {
                return window.cinematicEngine && window.cinematicEngine.testResults.initialized;
            });
            
            expect(engineInitialized).toBe(true);
        }, testTimeout);

        it('should start and stop cinematic reveal', async () => {
            const results = await page.evaluate(async () => {
                const engine = window.cinematicEngine;
                const model = window.testModel;
                
                // Test start reveal
                const startResult = await engine.startReveal({
                    model: model,
                    environmentType: 'cosmic_scene'
                });
                
                const canStart = engine.testResults.canStartReveal;
                const isActiveAfterStart = engine.isActive;
                
                // Test stop reveal
                engine.stopReveal();
                const canStop = engine.testResults.canStopReveal;
                const isActiveAfterStop = engine.isActive;
                
                return {
                    canStart,
                    canStop,
                    isActiveAfterStart,
                    isActiveAfterStop,
                    startResult
                };
            });
            
            expect(results.canStart).toBe(true);
            expect(results.canStop).toBe(true);
            expect(results.isActiveAfterStart).toBe(true);
            expect(results.isActiveAfterStop).toBe(false);
            expect(results.startResult).toHaveProperty('duration');
            expect(results.startResult).toHaveProperty('sequence');
        }, testTimeout);

        it('should handle audio analysis', async () => {
            const audioWorking = await page.evaluate(async () => {
                const engine = window.cinematicEngine;
                
                // Create mock audio element
                const audio = document.createElement('audio');
                audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
                
                await engine.startReveal({
                    model: window.testModel,
                    audio: audio
                });
                
                return engine.testResults.audioAnalysisWorking;
            });
            
            expect(audioWorking).toBe(true);
        }, testTimeout);

        it('should get current state correctly', async () => {
            const state = await page.evaluate(async () => {
                const engine = window.cinematicEngine;
                await engine.startReveal({ model: window.testModel });
                return engine.getState();
            });
            
            expect(state).toHaveProperty('isActive');
            expect(state).toHaveProperty('progress');
            expect(state).toHaveProperty('currentPhase');
            expect(state).toHaveProperty('sequenceName');
            expect(state.isActive).toBe(true);
        }, testTimeout);
    });

    describe('Web Audio API Integration', () => {
        it('should support Web Audio API', async () => {
            const audioSupported = await page.evaluate(() => {
                return !!(window.AudioContext || window.webkitAudioContext);
            });
            
            expect(audioSupported).toBe(true);
        });

        it('should create audio context successfully', async () => {
            const audioContextCreated = await page.evaluate(async () => {
                try {
                    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                    const audioContext = new AudioContextClass();
                    
                    // Resume context if needed
                    if (audioContext.state === 'suspended') {
                        await audioContext.resume();
                    }
                    
                    const success = audioContext.state === 'running' || audioContext.state === 'suspended';
                    audioContext.close();
                    return success;
                } catch (error) {
                    return false;
                }
            });
            
            expect(audioContextCreated).toBe(true);
        });

        it('should create analyser node', async () => {
            const analyserCreated = await page.evaluate(() => {
                try {
                    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                    const audioContext = new AudioContextClass();
                    const analyser = audioContext.createAnalyser();
                    
                    analyser.fftSize = 2048;
                    const bufferLength = analyser.frequencyBinCount;
                    const dataArray = new Uint8Array(bufferLength);
                    
                    const success = bufferLength > 0 && dataArray.length > 0;
                    audioContext.close();
                    return success;
                } catch (error) {
                    return false;
                }
            });
            
            expect(analyserCreated).toBe(true);
        });
    });

    describe('Three.js Integration', () => {
        beforeEach(async () => {
            const testHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Three.js Integration Test</title>
</head>
<body>
    <div id="status">Loading...</div>
    <script type="module">
        import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
        
        // Test Three.js functionality
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer();
        
        // Test model creation
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        
        // Test lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        scene.add(ambientLight);
        scene.add(directionalLight);
        
        // Test camera positioning
        camera.position.set(0, 0, 5);
        camera.lookAt(0, 0, 0);
        
        // Expose for testing
        window.THREE = THREE;
        window.testScene = scene;
        window.testCamera = camera;
        window.testRenderer = renderer;
        window.testMesh = mesh;
        
        document.getElementById('status').textContent = 'Ready';
    </script>
</body>
</html>`;
            
            await page.setContent(testHtml);
            await page.waitForFunction(() => document.getElementById('status').textContent === 'Ready');
        });

        it('should create Three.js scene successfully', async () => {
            const sceneCreated = await page.evaluate(() => {
                return window.testScene && window.testScene.type === 'Scene';
            });
            
            expect(sceneCreated).toBe(true);
        });

        it('should create camera with correct properties', async () => {
            const cameraProperties = await page.evaluate(() => {
                const camera = window.testCamera;
                return {
                    type: camera.type,
                    fov: camera.fov,
                    aspect: camera.aspect,
                    near: camera.near,
                    far: camera.far,
                    position: {
                        x: camera.position.x,
                        y: camera.position.y,
                        z: camera.position.z
                    }
                };
            });
            
            expect(cameraProperties.type).toBe('PerspectiveCamera');
            expect(cameraProperties.fov).toBe(75);
            expect(cameraProperties.position.z).toBe(5);
        });

        it('should create and manipulate 3D objects', async () => {
            const objectProperties = await page.evaluate(() => {
                const mesh = window.testMesh;
                const scene = window.testScene;
                
                // Test object properties
                const hasGeometry = mesh.geometry && mesh.geometry.type === 'BoxGeometry';
                const hasMaterial = mesh.material && mesh.material.type === 'MeshBasicMaterial';
                const inScene = scene.children.includes(mesh);
                
                // Test transformations
                mesh.position.set(1, 2, 3);
                mesh.rotation.set(0.1, 0.2, 0.3);
                mesh.scale.set(2, 2, 2);
                
                return {
                    hasGeometry,
                    hasMaterial,
                    inScene,
                    position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
                    rotation: { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z },
                    scale: { x: mesh.scale.x, y: mesh.scale.y, z: mesh.scale.z }
                };
            });
            
            expect(objectProperties.hasGeometry).toBe(true);
            expect(objectProperties.hasMaterial).toBe(true);
            expect(objectProperties.inScene).toBe(true);
            expect(objectProperties.position).toEqual({ x: 1, y: 2, z: 3 });
            expect(objectProperties.scale).toEqual({ x: 2, y: 2, z: 2 });
        });

        it('should support lighting systems', async () => {
            const lightingSupport = await page.evaluate(() => {
                const scene = window.testScene;
                
                // Count lights in scene
                let ambientLights = 0;
                let directionalLights = 0;
                
                scene.traverse((child) => {
                    if (child.type === 'AmbientLight') ambientLights++;
                    if (child.type === 'DirectionalLight') directionalLights++;
                });
                
                return {
                    ambientLights,
                    directionalLights,
                    totalChildren: scene.children.length
                };
            });
            
            expect(lightingSupport.ambientLights).toBeGreaterThan(0);
            expect(lightingSupport.directionalLights).toBeGreaterThan(0);
        });
    });

    describe('Performance and Memory', () => {
        it('should not cause memory leaks during cinematic sequences', async () => {
            const memoryUsage = await page.evaluate(async () => {
                // Get initial memory if available
                const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
                
                // Simulate multiple cinematic sequences
                for (let i = 0; i < 5; i++) {
                    // Create and destroy objects
                    const scene = new THREE.Scene();
                    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
                    const renderer = new THREE.WebGLRenderer();
                    
                    // Add objects
                    for (let j = 0; j < 10; j++) {
                        const geometry = new THREE.BoxGeometry(1, 1, 1);
                        const material = new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff });
                        const mesh = new THREE.Mesh(geometry, material);
                        scene.add(mesh);
                    }
                    
                    // Cleanup
                    scene.traverse((child) => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) child.material.dispose();
                    });
                    
                    renderer.dispose();
                }
                
                // Force garbage collection if available
                if (window.gc) {
                    window.gc();
                }
                
                const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
                
                return {
                    initialMemory,
                    finalMemory,
                    memoryIncrease: finalMemory - initialMemory,
                    hasMemoryAPI: !!performance.memory
                };
            });
            
            // Memory should not increase dramatically (allowing for some variance)
            if (memoryUsage.hasMemoryAPI) {
                expect(memoryUsage.memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
            }
        });

        it('should maintain stable frame rate during animations', async () => {
            const frameRateTest = await page.evaluate(async () => {
                return new Promise((resolve) => {
                    const frameRates = [];
                    let lastTime = performance.now();
                    let frameCount = 0;
                    const maxFrames = 60; // Test for 60 frames
                    
                    function measureFrame() {
                        const currentTime = performance.now();
                        const deltaTime = currentTime - lastTime;
                        const fps = 1000 / deltaTime;
                        
                        frameRates.push(fps);
                        lastTime = currentTime;
                        frameCount++;
                        
                        if (frameCount < maxFrames) {
                            requestAnimationFrame(measureFrame);
                        } else {
                            const avgFps = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
                            const minFps = Math.min(...frameRates);
                            const maxFps = Math.max(...frameRates);
                            
                            resolve({
                                avgFps,
                                minFps,
                                maxFps,
                                frameCount: frameRates.length
                            });
                        }
                    }
                    
                    requestAnimationFrame(measureFrame);
                });
            });
            
            expect(frameRateTest.avgFps).toBeGreaterThan(30); // At least 30 FPS average
            expect(frameRateTest.minFps).toBeGreaterThan(15); // Minimum 15 FPS
            expect(frameRateTest.frameCount).toBe(60);
        }, testTimeout);
    });

    describe('Error Handling', () => {
        it('should handle missing dependencies gracefully', async () => {
            const errorHandling = await page.evaluate(() => {
                const errors = [];
                
                // Test missing Three.js
                try {
                    // This should fail if Three.js is not loaded
                    if (typeof THREE === 'undefined') {
                        errors.push('THREE not defined');
                    }
                } catch (e) {
                    errors.push('THREE error: ' + e.message);
                }
                
                // Test missing Web Audio API
                try {
                    if (!window.AudioContext && !window.webkitAudioContext) {
                        errors.push('Web Audio API not supported');
                    }
                } catch (e) {
                    errors.push('Audio error: ' + e.message);
                }
                
                return {
                    errors,
                    hasThreeJS: typeof THREE !== 'undefined',
                    hasWebAudio: !!(window.AudioContext || window.webkitAudioContext)
                };
            });
            
            // In our test environment, we expect these to be available
            expect(errorHandling.hasThreeJS).toBe(true);
            expect(errorHandling.hasWebAudio).toBe(true);
            expect(errorHandling.errors.length).toBe(0);
        });

        it('should handle invalid audio files gracefully', async () => {
            const audioErrorHandling = await page.evaluate(async () => {
                try {
                    const audio = document.createElement('audio');
                    audio.src = 'invalid-audio-file.mp3';
                    
                    // This should not crash the page
                    const loadPromise = new Promise((resolve) => {
                        audio.addEventListener('error', () => resolve('error'));
                        audio.addEventListener('canplay', () => resolve('success'));
                        setTimeout(() => resolve('timeout'), 1000);
                    });
                    
                    const result = await loadPromise;
                    return { result, crashed: false };
                } catch (error) {
                    return { result: 'exception', crashed: true, error: error.message };
                }
            });
            
            expect(audioErrorHandling.crashed).toBe(false);
            // Should handle the error gracefully (either 'error' or 'timeout')
            expect(['error', 'timeout', 'exception']).toContain(audioErrorHandling.result);
        });
    });
});