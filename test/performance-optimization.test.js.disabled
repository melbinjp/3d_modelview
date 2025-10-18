import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { LODManager } from '../src/performance/LODManager.js';
import { CullingManager } from '../src/performance/CullingManager.js';
import { AdaptiveQualityManager } from '../src/performance/AdaptiveQualityManager.js';
import { MemoryManager } from '../src/performance/MemoryManager.js';
import { ViewportOptimizer } from '../src/performance/ViewportOptimizer.js';

// Set test environment to prevent monitoring loops
process.env.NODE_ENV = 'test';

// Mock DOM and browser APIs
Object.defineProperty(window, 'devicePixelRatio', { value: 2.0 });
Object.defineProperty(window, 'performance', {
    value: {
        now: () => Date.now(),
        memory: { usedJSHeapSize: 50 * 1024 * 1024 }
    }
});

global.document = {
    createElement: () => ({
        clientWidth: 1920,
        clientHeight: 1080,
        getContext: () => ({})
    })
};

describe('Performance Optimization System', () => {
    let mockCore;
    let renderer;
    let scene;
    let camera;

    beforeEach(() => {
        mockCore = {
            emit: vi.fn(),
            on: vi.fn(),
            getModule: vi.fn()
        };

        renderer = new THREE.WebGLRenderer({ canvas: document.createElement('canvas') });
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        
        renderer.info = {
            render: { calls: 10, triangles: 1000 }
        };
    });

    afterEach(() => {
        renderer.dispose();
    });

    describe('LODManager', () => {
        let lodManager;

        beforeEach(() => {
            lodManager = new LODManager(mockCore, scene, camera);
        });

        afterEach(() => {
            if (lodManager) {
                lodManager.destroy();
            }
        });

        it('should create LODManager instance', () => {
            expect(lodManager).toBeDefined();
            expect(lodManager.config).toBeDefined();
            expect(lodManager.config.enabled).toBe(true);
        });

        it('should initialize without starting monitoring loops', () => {
            expect(() => lodManager.init()).not.toThrow();
            expect(lodManager.initialized).toBe(true);
        });

        it('should adjust LOD bias', () => {
            lodManager.init();
            const initialBias = lodManager.config.bias;
            lodManager.increaseLODBias();
            expect(lodManager.config.bias).toBeGreaterThan(initialBias);
        });

        it('should set quality levels', () => {
            lodManager.setQualityLevel('low');
            expect(lodManager.config.bias).toBe(2.0);
            
            lodManager.setQualityLevel('high');
            expect(lodManager.config.bias).toBe(1.0);
        });
    });

    describe('CullingManager', () => {
        let cullingManager;

        beforeEach(() => {
            cullingManager = new CullingManager(mockCore, scene, camera);
        });

        afterEach(() => {
            if (cullingManager) {
                cullingManager.destroy();
            }
        });

        it('should create CullingManager instance', () => {
            expect(cullingManager).toBeDefined();
            expect(cullingManager.config).toBeDefined();
            expect(cullingManager.config.enabled).toBe(true);
        });

        it('should initialize without starting monitoring loops', () => {
            expect(() => cullingManager.init()).not.toThrow();
            expect(cullingManager.initialized).toBe(true);
        });

        it('should adjust culling aggressiveness', () => {
            cullingManager.init();
            const initialAggressiveness = cullingManager.config.aggressiveness;
            cullingManager.increaseCullingAggressiveness();
            expect(cullingManager.config.aggressiveness).toBeGreaterThan(initialAggressiveness);
        });

        it('should provide culling statistics', () => {
            cullingManager.init();
            const stats = cullingManager.getStats();
            expect(stats).toHaveProperty('totalObjects');
            expect(stats).toHaveProperty('frustumCulled');
            expect(stats).toHaveProperty('occlusionCulled');
            expect(stats).toHaveProperty('visible');
        });
    });

    describe('AdaptiveQualityManager', () => {
        let adaptiveQualityManager;

        beforeEach(() => {
            adaptiveQualityManager = new AdaptiveQualityManager(mockCore, renderer);
        });

        afterEach(() => {
            if (adaptiveQualityManager) {
                adaptiveQualityManager.destroy();
            }
        });

        it('should create AdaptiveQualityManager instance', () => {
            expect(adaptiveQualityManager).toBeDefined();
            expect(adaptiveQualityManager.config).toBeDefined();
            expect(adaptiveQualityManager.config.enabled).toBe(true);
        });

        it('should have quality levels defined', () => {
            expect(adaptiveQualityManager.config.qualityLevels).toHaveProperty('ultra');
            expect(adaptiveQualityManager.config.qualityLevels).toHaveProperty('high');
            expect(adaptiveQualityManager.config.qualityLevels).toHaveProperty('medium');
            expect(adaptiveQualityManager.config.qualityLevels).toHaveProperty('low');
            expect(adaptiveQualityManager.config.qualityLevels).toHaveProperty('potato');
        });

        it('should initialize without starting monitoring loops', () => {
            expect(() => adaptiveQualityManager.init()).not.toThrow();
            expect(adaptiveQualityManager.initialized).toBe(true);
        });

        it('should set base quality level', () => {
            adaptiveQualityManager.init();
            adaptiveQualityManager.setBaseQuality('medium');
            expect(adaptiveQualityManager.baseQuality).toBe('medium');
        });
    });

    describe('MemoryManager', () => {
        let memoryManager;

        beforeEach(() => {
            memoryManager = new MemoryManager(mockCore);
        });

        afterEach(() => {
            if (memoryManager) {
                memoryManager.destroy();
            }
        });

        it('should create MemoryManager instance', () => {
            expect(memoryManager).toBeDefined();
            expect(memoryManager.config).toBeDefined();
            expect(memoryManager.config.enabled).toBe(true);
        });

        it('should initialize without starting monitoring loops', () => {
            expect(() => memoryManager.init()).not.toThrow();
            expect(memoryManager.initialized).toBe(true);
        });

        it('should track textures', () => {
            memoryManager.init();
            const texture = new THREE.Texture();
            texture.image = { width: 512, height: 512 };
            
            memoryManager.trackTexture(texture);
            expect(memoryManager.trackedTextures.has(texture)).toBe(true);
        });

        it('should track geometries', () => {
            memoryManager.init();
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            
            memoryManager.trackGeometry(geometry);
            expect(memoryManager.trackedGeometries.has(geometry)).toBe(true);
        });
    });

    describe('ViewportOptimizer', () => {
        let viewportOptimizer;

        beforeEach(() => {
            const canvas = document.createElement('canvas');
            canvas.clientWidth = 1920;
            canvas.clientHeight = 1080;
            renderer.domElement = canvas;
            
            viewportOptimizer = new ViewportOptimizer(mockCore, renderer, camera);
        });

        afterEach(() => {
            if (viewportOptimizer) {
                viewportOptimizer.destroy();
            }
        });

        it('should create ViewportOptimizer instance', () => {
            expect(viewportOptimizer).toBeDefined();
            expect(viewportOptimizer.config).toBeDefined();
            expect(viewportOptimizer.config.enabled).toBe(true);
        });

        it('should initialize without starting monitoring loops', () => {
            expect(() => viewportOptimizer.init()).not.toThrow();
            expect(viewportOptimizer.initialized).toBe(true);
        });

        it('should handle viewport resize', () => {
            viewportOptimizer.init();
            viewportOptimizer.onResize(1280, 720);
            
            expect(viewportOptimizer.viewportSize.width).toBe(1280);
            expect(viewportOptimizer.viewportSize.height).toBe(720);
        });

        it('should set quality levels', () => {
            viewportOptimizer.init();
            
            viewportOptimizer.setQualityLevel('low');
            expect(viewportOptimizer.currentResolution).toBe(0.5);
            expect(viewportOptimizer.pixelRatio).toBe(0.5);
        });
    });
});