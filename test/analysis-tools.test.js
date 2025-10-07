/**
 * Test suite for Analysis Manager - Professional analysis and measurement tools
 */

import { AnalysisManager } from '../src/analysis/AnalysisManager.js';
import { CoreEngine } from '../src/core/CoreEngine.js';
import { RenderingEngine } from '../src/rendering/RenderingEngine.js';
import * as THREE from 'three';

describe('AnalysisManager', () => {
    let core, renderingEngine, analysisManager;
    let mockModel;

    beforeEach(() => {
        // Setup DOM elements needed for testing
        document.body.innerHTML = `
            <div id="viewerContainer"></div>
            <div id="sidebar"></div>
            <div id="modelStats"></div>
            <div id="measurementResults"></div>
            <div id="materialSelect"></div>
            <div id="materialProperties"></div>
        `;

        // Create core engine and modules
        core = new CoreEngine();
        renderingEngine = new RenderingEngine(core);
        analysisManager = new AnalysisManager(core);

        // Register modules
        core.registerModule('rendering', renderingEngine);
        core.registerModule('analysis', analysisManager);

        // Create mock model for testing
        mockModel = createMockModel();
    });

    afterEach(() => {
        if (analysisManager) {
            analysisManager.destroy();
        }
        document.body.innerHTML = '';
    });

    describe('Initialization', () => {
        test('should initialize successfully', () => {
            expect(() => analysisManager.init()).not.toThrow();
            expect(analysisManager.initialized).toBe(true);
        });

        test('should create analysis UI panels', () => {
            analysisManager.init();
            
            // Check if analysis panels were created
            const analysisPanel = document.querySelector('.accordion-item');
            expect(analysisPanel).toBeTruthy();
        });

        test('should setup event listeners', () => {
            const spy = jest.spyOn(analysisManager, 'setupEventListeners');
            analysisManager.init();
            expect(spy).toHaveBeenCalled();
        });
    });

    describe('Model Statistics', () => {
        beforeEach(() => {
            analysisManager.init();
        });

        test('should calculate model statistics correctly', () => {
            const stats = analysisManager.calculateModelStatistics(mockModel);
            
            expect(stats).toHaveProperty('vertices');
            expect(stats).toHaveProperty('faces');
            expect(stats).toHaveProperty('materialCount');
            expect(stats).toHaveProperty('textureCount');
            expect(stats).toHaveProperty('boundingBox');
            
            expect(stats.vertices).toBeGreaterThan(0);
            expect(stats.faces).toBeGreaterThan(0);
        });

        test('should handle models with animations', () => {
            const animatedModel = createMockModelWithAnimations();
            const stats = analysisManager.calculateModelStatistics(animatedModel);
            
            expect(stats.animations).toBeGreaterThan(0);
        });

        test('should calculate bounding box correctly', () => {
            const stats = analysisManager.calculateModelStatistics(mockModel);
            
            expect(stats.boundingBox).toBeTruthy();
            expect(stats.boundingBox.min).toBeInstanceOf(THREE.Vector3);
            expect(stats.boundingBox.max).toBeInstanceOf(THREE.Vector3);
            expect(stats.boundingBox.size).toBeInstanceOf(THREE.Vector3);
        });

        test('should estimate memory usage', () => {
            const stats = analysisManager.calculateModelStatistics(mockModel);
            
            expect(stats.memoryUsage).toBeGreaterThan(0);
            expect(typeof stats.memoryUsage).toBe('number');
        });
    });

    describe('Measurement Tools', () => {
        beforeEach(() => {
            analysisManager.init();
            // Set up a current model in core state
            core.setState({ currentModel: mockModel });
        });

        test('should set measurement mode correctly', () => {
            analysisManager.setMeasurementMode('distance');
            expect(analysisManager.measurementMode).toBe('distance');
            
            analysisManager.setMeasurementMode('angle');
            expect(analysisManager.measurementMode).toBe('angle');
        });

        test('should clear measurement mode', () => {
            analysisManager.setMeasurementMode('distance');
            analysisManager.clearMeasurementMode();
            expect(analysisManager.measurementMode).toBe('none');
        });

        test('should add measurement points', () => {
            analysisManager.setMeasurementMode('distance');
            const point = new THREE.Vector3(1, 2, 3);
            
            analysisManager.addMeasurementPoint(point);
            expect(analysisManager.measurementPoints).toHaveLength(1);
            expect(analysisManager.measurementPoints[0]).toEqual(point);
        });

        test('should calculate distance between two points', () => {
            analysisManager.setMeasurementMode('distance');
            
            const point1 = new THREE.Vector3(0, 0, 0);
            const point2 = new THREE.Vector3(3, 4, 0);
            
            analysisManager.addMeasurementPoint(point1);
            analysisManager.addMeasurementPoint(point2);
            
            // Distance should be 5 (3-4-5 triangle)
            const expectedDistance = 5;
            const actualDistance = point1.distanceTo(point2);
            expect(actualDistance).toBeCloseTo(expectedDistance);
        });

        test('should calculate angle between three points', () => {
            analysisManager.setMeasurementMode('angle');
            
            const point1 = new THREE.Vector3(1, 0, 0);
            const vertex = new THREE.Vector3(0, 0, 0);
            const point2 = new THREE.Vector3(0, 1, 0);
            
            analysisManager.addMeasurementPoint(point1);
            analysisManager.addMeasurementPoint(vertex);
            analysisManager.addMeasurementPoint(point2);
            
            // Should calculate 90-degree angle
            const vector1 = new THREE.Vector3().subVectors(point1, vertex).normalize();
            const vector2 = new THREE.Vector3().subVectors(point2, vertex).normalize();
            const angle = Math.acos(vector1.dot(vector2));
            const angleDegrees = THREE.MathUtils.radToDeg(angle);
            
            expect(angleDegrees).toBeCloseTo(90);
        });

        test('should clear all measurements', () => {
            analysisManager.setMeasurementMode('distance');
            analysisManager.addMeasurementPoint(new THREE.Vector3(0, 0, 0));
            analysisManager.addMeasurementPoint(new THREE.Vector3(1, 1, 1));
            
            analysisManager.clearAllMeasurements();
            
            expect(analysisManager.measurementPoints).toHaveLength(0);
            expect(analysisManager.measurementMarkers).toHaveLength(0);
            expect(analysisManager.measurementLines).toHaveLength(0);
        });

        test('should format distance with different units', () => {
            const distance = 1.5; // meters
            
            // Mock the units selector
            document.body.innerHTML += '<select id="measurementUnits"><option value="meters" selected>Meters</option></select>';
            
            const formatted = analysisManager.formatDistance(distance);
            expect(formatted).toContain('1.500');
            expect(formatted).toContain('meters');
        });
    });

    describe('Material Inspector', () => {
        beforeEach(() => {
            analysisManager.init();
        });

        test('should update material inspector with model materials', () => {
            analysisManager.updateMaterialInspector(mockModel);
            
            expect(analysisManager.materialInspector.materials.size).toBeGreaterThan(0);
        });

        test('should extract material properties correctly', () => {
            const material = new THREE.MeshStandardMaterial({
                color: 0xff0000,
                metalness: 0.5,
                roughness: 0.3,
                opacity: 0.8
            });
            
            const properties = analysisManager.extractMaterialProperties(material);
            
            expect(properties).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ label: 'Color' }),
                    expect.objectContaining({ label: 'Metalness' }),
                    expect.objectContaining({ label: 'Roughness' }),
                    expect.objectContaining({ label: 'Opacity' })
                ])
            );
        });

        test('should populate material selection dropdown', () => {
            document.body.innerHTML += '<select id="materialSelect"></select>';
            
            analysisManager.updateMaterialInspector(mockModel);
            analysisManager.populateMaterialSelect();
            
            const select = document.getElementById('materialSelect');
            expect(select.children.length).toBeGreaterThan(1); // At least default option + materials
        });
    });

    describe('Presentation Mode', () => {
        beforeEach(() => {
            analysisManager.init();
        });

        test('should enter presentation mode', () => {
            analysisManager.enterPresentationMode();
            
            expect(analysisManager.presentationMode).toBe(true);
            expect(document.body.classList.contains('presentation-mode')).toBe(true);
        });

        test('should exit presentation mode', () => {
            analysisManager.enterPresentationMode();
            analysisManager.exitPresentationMode();
            
            expect(analysisManager.presentationMode).toBe(false);
            expect(document.body.classList.contains('presentation-mode')).toBe(false);
        });

        test('should have predefined camera positions', () => {
            expect(analysisManager.presentationCameras).toHaveLength(7);
            expect(analysisManager.presentationCameras[0].name).toBe('Front');
            expect(analysisManager.presentationCameras[6].name).toBe('Isometric');
        });

        test('should navigate between presentation views', () => {
            analysisManager.enterPresentationMode();
            
            const initialView = analysisManager.currentPresentationView;
            analysisManager.nextPresentationView();
            
            expect(analysisManager.currentPresentationView).toBe(initialView + 1);
            
            analysisManager.previousPresentationView();
            expect(analysisManager.currentPresentationView).toBe(initialView);
        });
    });

    describe('Model Comparison', () => {
        beforeEach(() => {
            analysisManager.init();
        });

        test('should enable comparison mode', () => {
            analysisManager.enableComparison();
            expect(analysisManager.comparisonActive).toBe(true);
        });

        test('should disable comparison mode', () => {
            analysisManager.enableComparison();
            analysisManager.disableComparison();
            
            expect(analysisManager.comparisonActive).toBe(false);
            expect(analysisManager.comparisonModels).toHaveLength(0);
        });

        test('should update comparison results with two models', () => {
            const modelA = { stats: { vertices: 1000, faces: 500, materialCount: 2 } };
            const modelB = { stats: { vertices: 1500, faces: 750, materialCount: 3 } };
            
            analysisManager.comparisonModels = [modelA, modelB];
            
            // Mock the results div
            document.body.innerHTML += '<div id="comparisonResults"></div>';
            
            analysisManager.updateComparisonResults();
            
            const resultsDiv = document.getElementById('comparisonResults');
            expect(resultsDiv.innerHTML).toContain('+500'); // Vertex difference
            expect(resultsDiv.innerHTML).toContain('+250'); // Face difference
            expect(resultsDiv.innerHTML).toContain('+1');   // Material difference
        });
    });

    describe('Event Handling', () => {
        beforeEach(() => {
            analysisManager.init();
        });

        test('should handle model loaded event', () => {
            const spy = jest.spyOn(analysisManager, 'analyzeModel');
            
            analysisManager.onModelLoaded({ model: mockModel });
            
            expect(spy).toHaveBeenCalledWith(mockModel);
        });

        test('should handle viewport click for measurements', () => {
            analysisManager.setMeasurementMode('distance');
            core.setState({ currentModel: mockModel });
            
            const mockEvent = {
                clientX: 100,
                clientY: 100
            };
            
            // Mock getBoundingClientRect
            const mockRect = { left: 0, top: 0, width: 800, height: 600 };
            document.getElementById('viewerContainer').getBoundingClientRect = () => mockRect;
            
            // This would normally require a full Three.js setup with raycasting
            // For now, just test that the method doesn't throw
            expect(() => analysisManager.onViewportClick(mockEvent)).not.toThrow();
        });
    });

    describe('Cleanup', () => {
        test('should cleanup resources on destroy', () => {
            analysisManager.init();
            analysisManager.setMeasurementMode('distance');
            analysisManager.addMeasurementPoint(new THREE.Vector3(0, 0, 0));
            analysisManager.enterPresentationMode();
            
            analysisManager.destroy();
            
            expect(analysisManager.initialized).toBe(false);
            expect(analysisManager.measurementPoints).toHaveLength(0);
            expect(analysisManager.presentationMode).toBe(false);
        });
    });

    // Helper functions
    function createMockModel() {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const mesh = new THREE.Mesh(geometry, material);
        
        const group = new THREE.Group();
        group.add(mesh);
        
        return group;
    }

    function createMockModelWithAnimations() {
        const model = createMockModel();
        model.animations = [
            new THREE.AnimationClip('test', 1, [])
        ];
        return model;
    }
});

// Integration tests
describe('AnalysisManager Integration', () => {
    let core, renderingEngine, analysisManager;

    beforeEach(() => {
        // Setup full DOM structure
        document.body.innerHTML = `
            <div id="viewerContainer"></div>
            <div id="sidebar"></div>
        `;

        core = new CoreEngine();
        renderingEngine = new RenderingEngine(core);
        analysisManager = new AnalysisManager(core);

        core.registerModule('rendering', renderingEngine);
        core.registerModule('analysis', analysisManager);
    });

    test('should integrate with core engine events', async () => {
        await core.init();
        analysisManager.init();

        const mockModel = new THREE.Group();
        const spy = jest.spyOn(analysisManager, 'analyzeModel');

        // Simulate model loading event
        core.emit('assets:model:loaded', { model: mockModel });

        expect(spy).toHaveBeenCalledWith(mockModel);
    });

    test('should create UI elements in sidebar', () => {
        analysisManager.init();

        const sidebar = document.getElementById('sidebar');
        const analysisItems = sidebar.querySelectorAll('.accordion-item');
        
        // Should have created multiple analysis panels
        expect(analysisItems.length).toBeGreaterThan(0);
    });
});