// Mock document and window before importing script.js
global.document = {
    addEventListener: jest.fn(),
    getElementById: jest.fn().mockReturnValue({
        appendChild: jest.fn(),
        addEventListener: jest.fn(),
        querySelector: jest.fn().mockReturnValue({
            addEventListener: jest.fn()
        })
    }),
    createElement: jest.fn().mockReturnValue({
        style: {},
        appendChild: jest.fn(),
        addEventListener: jest.fn()
    }),
    querySelector: jest.fn().mockReturnValue({
        addEventListener: jest.fn()
    }),
    querySelectorAll: jest.fn().mockReturnValue([])
};

global.window = {
    AudioContext: jest.fn().mockImplementation(() => ({
        createGain: jest.fn().mockReturnValue({
            connect: jest.fn()
        })
    })),
    webkitAudioContext: undefined,
    location: {
        hostname: 'localhost'
    }
};

const { ModelViewer } = require('../script.js');

describe('updateModelStats', () => {
    let viewer;

    beforeEach(() => {
        // Mock THREE.js context since we're in Node
        global.THREE = {
            Clock: jest.fn().mockImplementation(() => ({
                getDelta: jest.fn().mockReturnValue(0.016)
            }))
        };

        // Create an instance without calling the constructor fully if it depends on DOM too much
        viewer = Object.create(ModelViewer.prototype);
        viewer.stats = { vertices: 0, faces: 0 };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should correctly calculate vertices and faces for a simple mesh', () => {
        const mockModel = {
            traverse: jest.fn(callback => {
                const child = {
                    isMesh: true,
                    geometry: {
                        attributes: {
                            position: { count: 24 } // 24 vertices
                        },
                        index: { count: 36 } // 36 indices = 12 faces
                    }
                };
                callback(child);
            })
        };

        viewer.updateModelStats(mockModel);

        expect(viewer.stats.vertices).toBe(24);
        expect(viewer.stats.faces).toBe(12); // 36 / 3
    });

    it('should calculate faces correctly when geometry has no index', () => {
        const mockModel = {
            traverse: jest.fn(callback => {
                const child = {
                    isMesh: true,
                    geometry: {
                        attributes: {
                            position: { count: 30 } // 30 vertices = 10 faces (without index)
                        }
                    }
                };
                callback(child);
            })
        };

        viewer.updateModelStats(mockModel);

        expect(viewer.stats.vertices).toBe(30);
        expect(viewer.stats.faces).toBe(10); // 30 / 3
    });

    it('should aggregate stats across multiple meshes', () => {
        const mockModel = {
            traverse: jest.fn(callback => {
                const child1 = {
                    isMesh: true,
                    geometry: {
                        attributes: { position: { count: 12 } },
                        index: { count: 18 } // 6 faces
                    }
                };
                const child2 = {
                    isMesh: true,
                    geometry: {
                        attributes: { position: { count: 15 } } // 5 faces (no index)
                    }
                };
                const notAMesh = { isMesh: false };
                const meshNoGeo = { isMesh: true, geometry: null };

                callback(child1);
                callback(child2);
                callback(notAMesh);
                callback(meshNoGeo);
            })
        };

        viewer.updateModelStats(mockModel);

        expect(viewer.stats.vertices).toBe(27); // 12 + 15
        expect(viewer.stats.faces).toBe(11); // 6 + 5
    });

    it('should handle zero vertices and faces correctly', () => {
        const mockModel = {
            traverse: jest.fn(callback => {
                const child = {
                    isMesh: true,
                    geometry: {
                        attributes: { position: { count: 0 } },
                        index: { count: 0 }
                    }
                };
                callback(child);
            })
        };

        viewer.updateModelStats(mockModel);

        expect(viewer.stats.vertices).toBe(0);
        expect(viewer.stats.faces).toBe(0);
    });

    it('should round down faces if calculation results in a fraction', () => {
        const mockModel = {
            traverse: jest.fn(callback => {
                const child = {
                    isMesh: true,
                    geometry: {
                        attributes: { position: { count: 10 } } // 10 / 3 = 3.33...
                    }
                };
                callback(child);
            })
        };

        viewer.updateModelStats(mockModel);

        expect(viewer.stats.vertices).toBe(10);
        expect(viewer.stats.faces).toBe(3); // Math.floor(10 / 3)
    });
});