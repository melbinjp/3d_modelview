/**
 * Test suite for the comprehensive export system
 */

import { ExportSystem } from '../src/export/ExportSystem.js';
import { CoreEngine } from '../src/core/CoreEngine.js';
import * as THREE from 'three';

describe('ExportSystem', () => {
    let core;
    let exportSystem;
    let testModel;

    beforeEach(() => {
        // Create mock core engine
        core = new CoreEngine();
        core.init();
        
        // Create export system
        exportSystem = new ExportSystem(core);
        exportSystem.init();
        
        // Create test model
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        testModel = new THREE.Mesh(geometry, material);
        testModel.name = 'TestCube';
        
        // Set as current model
        core.setState({ currentModel: testModel });
    });

    afterEach(() => {
        exportSystem.destroy();
        core.destroy();
    });

    describe('Initialization', () => {
        test('should initialize with all exporters', () => {
            const formats = exportSystem.getAvailableFormats();
            expect(formats).toContain('glb');
            expect(formats).toContain('gltf');
            expect(formats).toContain('obj');
            expect(formats).toContain('stl');
            expect(formats).toContain('ply');
            expect(formats).toContain('dae');
            expect(formats).toContain('fbx');
            expect(formats).toContain('usd');
            expect(formats).toContain('x3d');
        });

        test('should initialize with all presets', () => {
            const presets = exportSystem.getAvailablePresets();
            expect(presets).toContain('unity');
            expect(presets).toContain('unreal');
            expect(presets).toContain('blender');
            expect(presets).toContain('web');
            expect(presets).toContain('3d-printing');
            expect(presets).toContain('cad');
            expect(presets).toContain('archive');
        });
    });

    describe('Model Export', () => {
        test('should export GLB format', async () => {
            const mockDownload = jest.spyOn(exportSystem, 'downloadFile').mockImplementation(() => {});
            
            const result = await exportSystem.exportModel('glb', { filename: 'test.glb' });
            
            expect(result.success).toBe(true);
            expect(result.format).toBe('glb');
            expect(result.filename).toBe('test.glb');
            expect(mockDownload).toHaveBeenCalled();
            
            mockDownload.mockRestore();
        });

        test('should export GLTF format', async () => {
            const mockDownload = jest.spyOn(exportSystem, 'downloadFile').mockImplementation(() => {});
            
            const result = await exportSystem.exportModel('gltf', { filename: 'test.gltf' });
            
            expect(result.success).toBe(true);
            expect(result.format).toBe('gltf');
            expect(result.filename).toBe('test.gltf');
            
            mockDownload.mockRestore();
        });

        test('should export with preset', async () => {
            const mockDownload = jest.spyOn(exportSystem, 'downloadFile').mockImplementation(() => {});
            
            await exportSystem.exportWithPreset('unity');
            
            expect(mockDownload).toHaveBeenCalled();
            
            mockDownload.mockRestore();
        });

        test('should handle export errors', async () => {
            // Set invalid model
            core.setState({ currentModel: null });
            
            await expect(exportSystem.exportModel('glb')).rejects.toThrow('No model to export');
        });

        test('should handle unsupported format', async () => {
            await expect(exportSystem.exportModel('invalid')).rejects.toThrow('Unsupported export format');
        });
    });

    describe('Model Optimization', () => {
        test('should optimize model when requested', async () => {
            const mockDownload = jest.spyOn(exportSystem, 'downloadFile').mockImplementation(() => {});
            
            const result = await exportSystem.exportModel('glb', {
                optimize: true,
                mergeVertices: true,
                compressTextures: true
            });
            
            expect(result.success).toBe(true);
            expect(mockDownload).toHaveBeenCalled();
            
            mockDownload.mockRestore();
        });
    });

    describe('Model Validation', () => {
        test('should validate model when requested', async () => {
            const mockDownload = jest.spyOn(exportSystem, 'downloadFile').mockImplementation(() => {});
            
            const result = await exportSystem.exportModel('stl', {
                validate: true
            });
            
            expect(result.success).toBe(true);
            
            mockDownload.mockRestore();
        });

        test('should fail with strict validation on invalid model', async () => {
            // Create invalid geometry
            const invalidGeometry = new THREE.BufferGeometry();
            const invalidMaterial = new THREE.MeshBasicMaterial();
            const invalidModel = new THREE.Mesh(invalidGeometry, invalidMaterial);
            
            core.setState({ currentModel: invalidModel });
            
            await expect(exportSystem.exportModel('stl', {
                validate: true,
                strictValidation: true
            })).rejects.toThrow('Model validation failed');
        });
    });

    describe('Screenshot Export', () => {
        test('should export screenshot', async () => {
            // Mock rendering engine
            const mockRenderer = {
                domElement: document.createElement('canvas'),
                render: jest.fn()
            };
            
            core.modules.set('rendering', {
                renderer: mockRenderer,
                render: jest.fn()
            });
            
            const mockDownload = jest.spyOn(exportSystem, 'downloadDataURL').mockImplementation(() => {});
            
            const result = await exportSystem.exportScreenshot({
                width: 800,
                height: 600,
                format: 'png'
            });
            
            expect(result.width).toBe(800);
            expect(result.height).toBe(600);
            expect(result.format).toBe('png');
            expect(mockDownload).toHaveBeenCalled();
            
            mockDownload.mockRestore();
        });
    });

    describe('Batch Export', () => {
        test('should export multiple models', async () => {
            const models = [testModel, testModel.clone(), testModel.clone()];
            const mockDownload = jest.spyOn(exportSystem, 'downloadFile').mockImplementation(() => {});
            
            const result = await exportSystem.batchExport(models, 'glb');
            
            expect(result.total).toBe(3);
            expect(result.successful).toBe(3);
            expect(result.failed).toBe(0);
            expect(mockDownload).toHaveBeenCalledTimes(3);
            
            mockDownload.mockRestore();
        });

        test('should handle batch export errors gracefully', async () => {
            const models = [testModel, null, testModel.clone()]; // One invalid model
            const mockDownload = jest.spyOn(exportSystem, 'downloadFile').mockImplementation(() => {});
            
            const result = await exportSystem.batchExport(models, 'glb');
            
            expect(result.total).toBe(3);
            expect(result.successful).toBe(2);
            expect(result.failed).toBe(1);
            
            mockDownload.mockRestore();
        });
    });

    describe('X3D Export', () => {
        test('should generate X3D content', () => {
            const scene = new THREE.Scene();
            scene.add(testModel);
            
            const x3dContent = exportSystem.generateX3D(scene);
            
            expect(x3dContent).toContain('<?xml version="1.0"');
            expect(x3dContent).toContain('<X3D profile=');
            expect(x3dContent).toContain('<Shape>');
            expect(x3dContent).toContain('<IndexedFaceSet');
            expect(x3dContent).toContain('<Coordinate point=');
        });
    });

    describe('Mesh Validation', () => {
        test('should detect manifold mesh', () => {
            const isManifold = exportSystem.isManifold(testModel.geometry);
            expect(typeof isManifold).toBe('boolean');
        });

        test('should calculate minimum thickness', () => {
            const thickness = exportSystem.calculateMinThickness(testModel.geometry);
            expect(thickness).toBeGreaterThan(0);
        });

        test('should detect overhangs', () => {
            const overhangs = exportSystem.detectOverhangs(testModel.geometry);
            expect(Array.isArray(overhangs)).toBe(true);
        });

        test('should count degenerate triangles', () => {
            const count = exportSystem.countDegenerateTriangles(testModel.geometry);
            expect(typeof count).toBe('number');
            expect(count).toBeGreaterThanOrEqual(0);
        });

        test('should count duplicate vertices', () => {
            const count = exportSystem.countDuplicateVertices(testModel.geometry);
            expect(typeof count).toBe('number');
            expect(count).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Statistics', () => {
        test('should provide export statistics', () => {
            const stats = exportSystem.getExportStatistics();
            
            expect(stats).toHaveProperty('availableFormats');
            expect(stats).toHaveProperty('availablePresets');
            expect(stats).toHaveProperty('supportedOptimizations');
            expect(stats).toHaveProperty('supportedValidations');
            expect(stats).toHaveProperty('isProcessingBatch');
            expect(stats).toHaveProperty('queueLength');
        });
    });
});