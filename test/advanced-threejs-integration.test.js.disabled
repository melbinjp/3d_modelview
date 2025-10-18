import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { JSDOM } from 'jsdom';
import * as THREE from 'three';
import { CoreEngine } from '../src/core/CoreEngine.js';
import { RenderingEngine } from '../src/rendering/RenderingEngine.js';
import { PostProcessingManager } from '../src/rendering/PostProcessingManager.js';
import { ShaderManager } from '../src/rendering/ShaderManager.js';
import { AdvancedRenderingManager } from '../src/rendering/AdvancedRenderingManager.js';
import { PhysicsEngine } from '../src/physics/PhysicsEngine.js';
import { WebXRManager } from '../src/xr/WebXRManager.js';

// Mock WebGL context
const mockWebGLContext = {
    canvas: {},
    drawingBufferWidth: 1024,
    drawingBufferHeight: 768,
    getExtension: () => null,
    getParameter: () => null,
    createShader: () => ({}),
    shaderSource: () => {},
    compileShader: () => {},
    getShaderParameter: () => true,
    createProgram: () => ({}),
    attachShader: () => {},
    linkProgram: () => {},
    getProgramParameter: () => true,
    useProgram: () => {},
    getAttribLocation: () => 0,
    getUniformLocation: () => ({}),
    enableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    createBuffer: () => ({}),
    bindBuffer: () => {},
    bufferData: () => {},
    createTexture: () => ({}),
    bindTexture: () => {},
    texImage2D: () => {},
    texParameteri: () => {},
    createFramebuffer: () => ({}),
    bindFramebuffer: () => {},
    framebufferTexture2D: () => {},
    checkFramebufferStatus: () => 36053, // FRAMEBUFFER_COMPLETE
    viewport: () => {},
    clear: () => {},
    clearColor: () => {},
    enable: () => {},
    disable: () => {},
    blendFunc: () => {},
    drawElements: () => {},
    drawArrays: () => {},
    uniform1f: () => {},
    uniform1i: () => {},
    uniform2f: () => {},
    uniform3f: () => {},
    uniform4f: () => {},
    uniformMatrix4fv: () => {},
    activeTexture: () => {},
    generateMipmap: () => {},
    pixelStorei: () => {},
    readPixels: () => {},
    deleteTexture: () => {},
    deleteBuffer: () => {},
    deleteFramebuffer: () => {},
    deleteProgram: () => {},
    deleteShader: () => {},
    isContextLost: () => false
};

describe('Advanced Three.js Feature Integration', () => {
    let dom;
    let core;
    let renderingEngine;
    let container;

    beforeEach(() => {
        // Setup JSDOM
        dom = new JSDOM('<!DOCTYPE html><html><body><div id="container"></div></body></html>', {
            pretendToBeVisual: true,
            resources: 'usable'
        });
        
        global.window = dom.window;
        global.document = dom.window.document;
        global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
        global.WebGLRenderingContext = dom.window.WebGLRenderingContext || function() {};
        global.WebGL2RenderingContext = dom.window.WebGL2RenderingContext || function() {};
        global.navigator = dom.window.navigator;
        
        // Mock canvas getContext
        dom.window.HTMLCanvasElement.prototype.getContext = function(contextType) {
            if (contextType === 'webgl' || contextType === 'webgl2') {
                return mockWebGLContext;
            }
            return null;
        };

        // Mock WebXR
        global.navigator.xr = {
            isSessionSupported: () => Promise.resolve(false)
        };

        container = document.getElementById('container');
        container.clientWidth = 1024;
        container.clientHeight = 768;

        // Initialize core engine
        core = new CoreEngine();
        renderingEngine = new RenderingEngine(core);
    });

    afterEach(() => {
        if (renderingEngine) {
            renderingEngine.destroy();
        }
        if (core) {
            core.destroy();
        }
        dom.window.close();
    });

    describe('PostProcessingManager', () => {
        let postProcessingManager;

        beforeEach(() => {
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera();
            const renderer = new THREE.WebGLRenderer();
            postProcessingManager = new PostProcessingManager(renderer, scene, camera);
        });

        it('should initialize with all post-processing passes', () => {
            expect(postProcessingManager.initialized).toBe(true);
            expect(postProcessingManager.getAvailablePasses()).toContain('ssao');
            expect(postProcessingManager.getAvailablePasses()).toContain('ssr');
            expect(postProcessingManager.getAvailablePasses()).toContain('bokeh');
            expect(postProcessingManager.getAvailablePasses()).toContain('bloom');
            expect(postProcessingManager.getAvailablePasses()).toContain('gtao');
            expect(postProcessingManager.getAvailablePasses()).toContain('sao');
        });

        it('should enable and disable passes correctly', () => {
            postProcessingManager.enablePass('ssao');
            expect(postProcessingManager.getEnabledPasses()).toContain('ssao');
            expect(postProcessingManager.enabled).toBe(true);

            postProcessingManager.disablePass('ssao');
            expect(postProcessingManager.getEnabledPasses()).not.toContain('ssao');
        });

        it('should configure SSAO pass', () => {
            const ssaoPass = postProcessingManager.getPass('ssao');
            expect(ssaoPass).toBeDefined();

            postProcessingManager.configureSSAO({
                kernelRadius: 16,
                minDistance: 0.01,
                maxDistance: 0.2
            });

            expect(ssaoPass.kernelRadius).toBe(16);
            expect(ssaoPass.minDistance).toBe(0.01);
            expect(ssaoPass.maxDistance).toBe(0.2);
        });

        it('should configure SSR pass', () => {
            const ssrPass = postProcessingManager.getPass('ssr');
            expect(ssrPass).toBeDefined();

            postProcessingManager.configureSSR({
                opacity: 0.8,
                maxDistance: 50,
                thickness: 0.2
            });

            expect(ssrPass.opacity).toBe(0.8);
            expect(ssrPass.maxDistance).toBe(50);
            expect(ssrPass.thickness).toBe(0.2);
        });

        it('should create and manage effect chains', () => {
            const chain = postProcessingManager.createEffectChain('cinematic', ['bloom', 'film', 'vignette']);
            expect(chain).toBeDefined();
            expect(chain.name).toBe('cinematic');
            expect(chain.passes.length).toBe(3);

            postProcessingManager.enableEffectChain('cinematic');
            expect(chain.enabled).toBe(true);

            postProcessingManager.disableEffectChain('cinematic');
            expect(chain.enabled).toBe(false);
        });

        it('should handle window resize', () => {
            expect(() => {
                postProcessingManager.onResize(1920, 1080);
            }).not.toThrow();
        });
    });

    describe('ShaderManager', () => {
        let shaderManager;

        beforeEach(() => {
            shaderManager = new ShaderManager(core);
        });

        it('should initialize with built-in shaders', () => {
            expect(shaderManager.initialized).toBe(true);
            expect(shaderManager.getAvailableShaders()).toContain('vertexDisplacement');
            expect(shaderManager.getAvailableShaders()).toContain('holographic');
            expect(shaderManager.getAvailableShaders()).toContain('toon');
            expect(shaderManager.getAvailableShaders()).toContain('water');
            expect(shaderManager.getAvailableShaders()).toContain('dissolve');
        });

        it('should create materials from shaders', () => {
            const material = shaderManager.createMaterial('vertexDisplacement', {
                amplitude: { value: 0.2 },
                frequency: { value: 2.0 }
            });

            expect(material).toBeInstanceOf(THREE.ShaderMaterial);
            expect(material.uniforms.amplitude.value).toBe(0.2);
            expect(material.uniforms.frequency.value).toBe(2.0);
        });

        it('should register custom shaders', () => {
            const customShader = {
                vertexShader: 'void main() { gl_Position = vec4(0.0); }',
                fragmentShader: 'void main() { gl_FragColor = vec4(1.0); }',
                uniforms: {}
            };

            shaderManager.registerShader('custom', customShader);
            expect(shaderManager.getAvailableShaders()).toContain('custom');
        });

        it('should update shader uniforms', () => {
            const material = shaderManager.createMaterial('vertexDisplacement');
            
            shaderManager.updateUniforms(material, {
                time: 5.0,
                amplitude: 0.5
            });

            expect(material.uniforms.time.value).toBe(5.0);
            expect(material.uniforms.amplitude.value).toBe(0.5);
        });

        it('should apply geometry modifiers', () => {
            const geometry = new THREE.BoxGeometry();
            const originalVertexCount = geometry.attributes.position.count;

            const modifiedGeometry = shaderManager.applyGeometryModifier(geometry, 'noise', 0.1, 1);
            expect(modifiedGeometry.attributes.position.count).toBe(originalVertexCount);
        });

        it('should create custom geometry', () => {
            const parametricFunc = (u, v, target) => {
                target.set(u, v, Math.sin(u * Math.PI) * Math.cos(v * Math.PI));
            };

            const geometry = shaderManager.createCustomGeometry('parametric', {
                func: parametricFunc,
                slices: 16,
                stacks: 16
            });

            expect(geometry).toBeInstanceOf(THREE.BufferGeometry);
        });

        it('should initialize compute shaders', () => {
            expect(shaderManager.getAvailableComputeShaders()).toContain('particles');
            expect(shaderManager.getAvailableComputeShaders()).toContain('fluid');
        });
    });

    describe('PhysicsEngine', () => {
        let physicsEngine;

        beforeEach(() => {
            physicsEngine = new PhysicsEngine(core);
        });

        it('should initialize physics world', () => {
            expect(physicsEngine.initialized).toBe(true);
            expect(physicsEngine.world).toBeDefined();
            expect(physicsEngine.materials.has('default')).toBe(true);
            expect(physicsEngine.materials.has('metal')).toBe(true);
            expect(physicsEngine.materials.has('wood')).toBe(true);
        });

        it('should add and remove rigid bodies', () => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
            
            const body = physicsEngine.addRigidBody(mesh, {
                type: 'dynamic',
                mass: 1,
                material: 'metal'
            });

            expect(body).toBeDefined();
            expect(physicsEngine.bodies.has(mesh.uuid)).toBe(true);
            expect(physicsEngine.world.bodies).toContain(body);

            physicsEngine.removeRigidBody(mesh);
            expect(physicsEngine.bodies.has(mesh.uuid)).toBe(false);
        });

        it('should apply forces and impulses', () => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
            const body = physicsEngine.addRigidBody(mesh, { type: 'dynamic', mass: 1 });

            const force = new THREE.Vector3(10, 0, 0);
            physicsEngine.applyForce(mesh, force);
            expect(body.force.x).toBe(10);

            const impulse = new THREE.Vector3(5, 0, 0);
            physicsEngine.applyImpulse(mesh, impulse);
            expect(body.velocity.x).toBe(5);
        });

        it('should perform collision detection', () => {
            const mesh1 = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
            const mesh2 = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
            
            mesh1.position.set(0, 0, 0);
            mesh2.position.set(0.5, 0, 0); // Overlapping

            physicsEngine.addRigidBody(mesh1, { type: 'dynamic' });
            physicsEngine.addRigidBody(mesh2, { type: 'dynamic' });

            const collisions = physicsEngine.detectCollisions();
            expect(collisions.length).toBeGreaterThan(0);
        });

        it('should step physics simulation', () => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
            const body = physicsEngine.addRigidBody(mesh, { type: 'dynamic', mass: 1 });
            
            physicsEngine.enable();
            physicsEngine.step(1/60);

            // Gravity should affect the body
            expect(body.velocity.y).toBeLessThan(0);
        });

        it('should perform raycasting', () => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
            physicsEngine.addRigidBody(mesh, { type: 'static' });

            const origin = new THREE.Vector3(0, 5, 0);
            const direction = new THREE.Vector3(0, -1, 0);
            
            const intersects = physicsEngine.raycast(origin, direction, 10);
            expect(intersects).toBeDefined();
        });
    });

    describe('WebXRManager', () => {
        let webXRManager;
        let renderer;

        beforeEach(async () => {
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera();
            renderer = new THREE.WebGLRenderer();
            renderer.xr = {
                enabled: false,
                isPresenting: false,
                getController: () => new THREE.Group(),
                getControllerGrip: () => new THREE.Group(),
                getHand: () => new THREE.Group(),
                addEventListener: () => {},
                getSession: () => null,
                getCamera: () => camera
            };

            webXRManager = new WebXRManager(core, renderer, scene, camera);
            await webXRManager.init();
        });

        it('should initialize WebXR support', () => {
            expect(webXRManager.initialized).toBe(true);
            expect(webXRManager.controllers.length).toBe(2);
            expect(webXRManager.hands.length).toBe(2);
        });

        it('should check WebXR support', async () => {
            // Mock navigator.xr for testing
            global.navigator.xr = {
                isSessionSupported: (mode) => Promise.resolve(mode === 'immersive-vr')
            };

            await webXRManager.checkWebXRSupport();
            expect(webXRManager.vrSupported).toBe(true);
            expect(webXRManager.arSupported).toBe(false);
        });

        it('should handle controller interactions', () => {
            const controller = webXRManager.getController(0);
            expect(controller).toBeDefined();

            // Simulate controller select
            const mockEvent = { type: 'select' };
            webXRManager.onSelectStart(mockEvent, 0);
            expect(controller.userData.lastEvent).toBe(mockEvent);
        });

        it('should manage teleportation', () => {
            expect(webXRManager.teleportMarker).toBeDefined();
            expect(webXRManager.teleportMarker.visible).toBe(false);

            const position = new THREE.Vector3(5, 0, 5);
            webXRManager.teleportUser(position);
            // Teleportation logic would be tested with actual XR session
        });

        it('should provide XR state information', () => {
            expect(webXRManager.isInVR()).toBe(false);
            expect(webXRManager.isInAR()).toBe(false);
        });
    });

    describe('AdvancedRenderingManager', () => {
        let advancedRenderingManager;

        beforeEach(() => {
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera();
            const renderer = new THREE.WebGLRenderer();
            advancedRenderingManager = new AdvancedRenderingManager(core, renderer, scene, camera);
        });

        it('should initialize advanced rendering techniques', () => {
            expect(advancedRenderingManager.initialized).toBe(true);
            expect(advancedRenderingManager.getAvailableTechniques()).toContain('deferred');
            expect(advancedRenderingManager.getAvailableTechniques()).toContain('ssr');
            expect(advancedRenderingManager.getAvailableTechniques()).toContain('volumetric');
            expect(advancedRenderingManager.getAvailableTechniques()).toContain('taa');
            expect(advancedRenderingManager.getAvailableTechniques()).toContain('vrs');
            expect(advancedRenderingManager.getAvailableTechniques()).toContain('gpuDriven');
        });

        it('should enable and disable techniques', () => {
            advancedRenderingManager.enableTechnique('deferred');
            expect(advancedRenderingManager.getEnabledTechniques()).toContain('deferred');

            advancedRenderingManager.disableTechnique('deferred');
            expect(advancedRenderingManager.getEnabledTechniques()).not.toContain('deferred');
        });

        it('should create render targets', () => {
            expect(advancedRenderingManager.renderTargets.has('gBuffer')).toBe(true);
            expect(advancedRenderingManager.renderTargets.has('shadowCascade')).toBe(true);
            expect(advancedRenderingManager.renderTargets.has('reflectionProbe')).toBe(true);
            expect(advancedRenderingManager.renderTargets.has('ssrBuffer')).toBe(true);
            expect(advancedRenderingManager.renderTargets.has('volumetricBuffer')).toBe(true);
        });

        it('should handle resize events', () => {
            expect(() => {
                advancedRenderingManager.onResize(1920, 1080);
            }).not.toThrow();
        });
    });

    describe('RenderingEngine Integration', () => {
        beforeEach(async () => {
            await core.init();
            renderingEngine.init(container);
        });

        it('should initialize all advanced systems', () => {
            expect(renderingEngine.postProcessingManager).toBeDefined();
            expect(renderingEngine.shaderManager).toBeDefined();
            expect(renderingEngine.advancedRenderingManager).toBeDefined();
            expect(renderingEngine.physicsEngine).toBeDefined();
            expect(renderingEngine.webXRManager).toBeDefined();
        });

        it('should register modules with core', () => {
            expect(core.getModule('postProcessing')).toBe(renderingEngine.postProcessingManager);
            expect(core.getModule('shader')).toBe(renderingEngine.shaderManager);
            expect(core.getModule('advancedRendering')).toBe(renderingEngine.advancedRenderingManager);
            expect(core.getModule('physics')).toBe(renderingEngine.physicsEngine);
            expect(core.getModule('webxr')).toBe(renderingEngine.webXRManager);
        });

        it('should provide access methods for advanced systems', () => {
            expect(renderingEngine.getPostProcessingManager()).toBe(renderingEngine.postProcessingManager);
            expect(renderingEngine.getShaderManager()).toBe(renderingEngine.shaderManager);
            expect(renderingEngine.getAdvancedRenderingManager()).toBe(renderingEngine.advancedRenderingManager);
            expect(renderingEngine.getPhysicsEngine()).toBe(renderingEngine.physicsEngine);
            expect(renderingEngine.getWebXRManager()).toBe(renderingEngine.webXRManager);
        });

        it('should enable/disable physics', () => {
            renderingEngine.enablePhysics();
            expect(renderingEngine.physicsEngine.enabled).toBe(true);

            renderingEngine.disablePhysics();
            expect(renderingEngine.physicsEngine.enabled).toBe(false);
        });

        it('should add physics bodies to meshes', () => {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
            const body = renderingEngine.addPhysicsBody(mesh, { type: 'dynamic', mass: 1 });
            
            expect(body).toBeDefined();
            expect(renderingEngine.physicsEngine.bodies.has(mesh.uuid)).toBe(true);
        });

        it('should enable/disable post-processing effects', () => {
            renderingEngine.enablePostProcessingEffect('bloom');
            expect(renderingEngine.postProcessingManager.getEnabledPasses()).toContain('bloom');

            renderingEngine.disablePostProcessingEffect('bloom');
            expect(renderingEngine.postProcessingManager.getEnabledPasses()).not.toContain('bloom');
        });

        it('should create shader materials', () => {
            const material = renderingEngine.createShaderMaterial('holographic', {
                color1: { value: new THREE.Color(0xff0000) }
            });

            expect(material).toBeInstanceOf(THREE.ShaderMaterial);
            expect(material.uniforms.color1.value.getHex()).toBe(0xff0000);
        });

        it('should enable/disable advanced rendering techniques', () => {
            renderingEngine.enableAdvancedTechnique('deferred');
            expect(renderingEngine.advancedRenderingManager.getEnabledTechniques()).toContain('deferred');

            renderingEngine.disableAdvancedTechnique('deferred');
            expect(renderingEngine.advancedRenderingManager.getEnabledTechniques()).not.toContain('deferred');
        });

        it('should update all systems in render loop', () => {
            const updateSpy = jest.spyOn(renderingEngine.physicsEngine, 'step');
            const timeSpy = jest.spyOn(renderingEngine.shaderManager, 'updateTime');

            renderingEngine.enablePhysics();
            renderingEngine.update();

            expect(updateSpy).toHaveBeenCalled();
            expect(timeSpy).toHaveBeenCalled();
        });

        it('should handle window resize for all systems', () => {
            const postProcessingSpy = jest.spyOn(renderingEngine.postProcessingManager, 'onResize');
            const advancedSpy = jest.spyOn(renderingEngine.advancedRenderingManager, 'onResize');

            renderingEngine.onWindowResize();

            expect(postProcessingSpy).toHaveBeenCalled();
            expect(advancedSpy).toHaveBeenCalled();
        });
    });

    describe('GPU Compute Shader Support', () => {
        let shaderManager;

        beforeEach(() => {
            shaderManager = new ShaderManager(core);
        });

        it('should register compute shaders', () => {
            const computeShader = {
                computeShader: '#version 300 es\nvoid main() {}',
                uniforms: { time: { value: 0.0 } }
            };

            shaderManager.registerComputeShader('test', computeShader);
            expect(shaderManager.getAvailableComputeShaders()).toContain('test');
        });

        it('should create compute shader renderers', () => {
            const renderer = shaderManager.createComputeRenderer('particles', {});
            expect(renderer).toBeDefined();
            expect(typeof renderer.compute).toBe('function');
            expect(typeof renderer.dispose).toBe('function');
        });
    });

    describe('Advanced Rendering Techniques', () => {
        let advancedRenderingManager;

        beforeEach(() => {
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera();
            const renderer = new THREE.WebGLRenderer();
            advancedRenderingManager = new AdvancedRenderingManager(core, renderer, scene, camera);
        });

        it('should create G-Buffer material for deferred rendering', () => {
            const technique = advancedRenderingManager.techniques.get('deferred');
            expect(technique.gBufferMaterial).toBeInstanceOf(THREE.ShaderMaterial);
            expect(technique.lightingMaterial).toBeInstanceOf(THREE.ShaderMaterial);
        });

        it('should create SSR material', () => {
            const technique = advancedRenderingManager.techniques.get('ssr');
            expect(technique.material).toBeInstanceOf(THREE.ShaderMaterial);
            expect(technique.material.uniforms.maxDistance).toBeDefined();
            expect(technique.material.uniforms.maxSteps).toBeDefined();
        });

        it('should create volumetric lighting material', () => {
            const technique = advancedRenderingManager.techniques.get('volumetric');
            expect(technique.material).toBeInstanceOf(THREE.ShaderMaterial);
            expect(technique.material.uniforms.scattering).toBeDefined();
            expect(technique.material.uniforms.samples).toBeDefined();
        });

        it('should create GPU culling compute shader', () => {
            const technique = advancedRenderingManager.techniques.get('gpuDriven');
            expect(technique.cullingCompute).toBeDefined();
            expect(typeof technique.cullingCompute).toBe('string');
            expect(technique.cullingCompute).toContain('#version 300 es');
        });
    });
});