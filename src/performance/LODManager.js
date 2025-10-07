import * as THREE from 'three';

/**
 * LODManager - Automatic Level of Detail system for large models
 * Manages multiple detail levels and switches based on distance and performance
 */
export class LODManager {
    constructor(core, scene, camera) {
        this.core = core;
        this.scene = scene;
        this.camera = camera;
        
        // LOD configuration
        this.config = {
            enabled: true,
            maxDistance: 100,
            lodLevels: [
                { distance: 0, quality: 1.0 },      // High detail (0-20 units)
                { distance: 20, quality: 0.7 },     // Medium detail (20-50 units)
                { distance: 50, quality: 0.4 },     // Low detail (50-100 units)
                { distance: 100, quality: 0.1 }     // Very low detail (100+ units)
            ],
            bias: 1.0, // Multiplier for LOD distances
            hysteresis: 0.1 // Prevent LOD flickering
        };
        
        // LOD objects and state
        this.lodObjects = new Map(); // model -> LOD object
        this.modelLODs = new Map();  // model -> { levels: [], currentLevel: 0 }
        this.lastCameraPosition = new THREE.Vector3();
        this.updateThrottle = 0;
        this.updateInterval = 100; // Update every 100ms
        
        this.initialized = false;
    }

    /**
     * Initialize the LOD manager
     */
    init() {
        if (this.initialized) {
            console.warn('LODManager already initialized');
            return;
        }

        this.setupEventListeners();
        this.initialized = true;
        
        // Silent initialization
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for camera movement
        this.core.on('camera:moved', () => this.onCameraChanged());
        
        // Listen for performance issues
        this.core.on('performance:optimization_triggered', (data) => {
            if (data.issueType === 'low_fps' || data.issueType === 'high_frame_time') {
                this.increaseLODBias();
            }
        });
    }

    /**
     * Setup LOD for a model
     */
    setupModelLOD(model) {
        if (!this.config.enabled) return;
        
        // Create LOD levels for the model
        const lodLevels = this.generateLODLevels(model);
        
        if (lodLevels.length <= 1) {
            console.log('Model too simple for LOD optimization');
            return;
        }
        
        // Create THREE.LOD object
        const lodObject = new THREE.LOD();
        
        // Add LOD levels
        lodLevels.forEach((levelModel, index) => {
            const distance = this.config.lodLevels[index]?.distance || (index * 25);
            lodObject.addLevel(levelModel, distance * this.config.bias);
        });
        
        // Replace original model with LOD object
        const parent = model.parent;
        if (parent) {
            parent.remove(model);
            parent.add(lodObject);
        } else {
            this.scene.remove(model);
            this.scene.add(lodObject);
        }
        
        // Store LOD information
        this.lodObjects.set(model, lodObject);
        this.modelLODs.set(model, {
            levels: lodLevels,
            currentLevel: 0,
            originalModel: model
        });
        
        // Silent LOD setup
    }

    /**
     * Generate LOD levels for a model
     */
    generateLODLevels(model) {
        const levels = [];
        
        // Level 0: Original model (highest detail)
        levels.push(model.clone());
        
        // Generate simplified versions
        this.config.lodLevels.slice(1).forEach((levelConfig, index) => {
            const simplifiedModel = this.simplifyModel(model, levelConfig.quality);
            if (simplifiedModel) {
                levels.push(simplifiedModel);
            }
        });
        
        return levels;
    }

    /**
     * Simplify a model based on quality factor
     */
    simplifyModel(model, qualityFactor) {
        const simplified = model.clone();
        
        simplified.traverse((child) => {
            if (child.isMesh && child.geometry) {
                // Simplify geometry
                const originalGeometry = child.geometry;
                const simplifiedGeometry = this.simplifyGeometry(originalGeometry, qualityFactor);
                
                if (simplifiedGeometry) {
                    child.geometry = simplifiedGeometry;
                }
                
                // Reduce texture resolution for lower LOD levels
                if (child.material && qualityFactor < 0.7) {
                    child.material = this.simplifyMaterial(child.material, qualityFactor);
                }
            }
        });
        
        return simplified;
    }

    /**
     * Simplify geometry by reducing vertex count
     */
    simplifyGeometry(geometry, qualityFactor) {
        // For now, we'll use a simple approach of reducing indices
        // In a production system, you might want to use more sophisticated
        // mesh simplification algorithms like edge collapse
        
        if (!geometry.index) {
            // Convert to indexed geometry first
            geometry = geometry.toNonIndexed();
        }
        
        const originalIndices = geometry.index.array;
        const targetCount = Math.floor(originalIndices.length * qualityFactor);
        
        // Simple decimation - keep every nth triangle
        const step = Math.max(1, Math.floor(originalIndices.length / targetCount));
        const newIndices = [];
        
        for (let i = 0; i < originalIndices.length; i += step * 3) {
            if (i + 2 < originalIndices.length) {
                newIndices.push(originalIndices[i], originalIndices[i + 1], originalIndices[i + 2]);
            }
        }
        
        if (newIndices.length === 0) return null;
        
        const simplifiedGeometry = geometry.clone();
        simplifiedGeometry.setIndex(newIndices);
        simplifiedGeometry.computeVertexNormals();
        
        return simplifiedGeometry;
    }

    /**
     * Simplify material for lower LOD levels
     */
    simplifyMaterial(material, qualityFactor) {
        const simplified = material.clone();
        
        // Reduce texture resolution for very low quality
        if (qualityFactor < 0.5) {
            // Replace complex materials with simpler ones
            if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
                const basicMaterial = new THREE.MeshLambertMaterial({
                    color: material.color,
                    map: material.map
                });
                return basicMaterial;
            }
        }
        
        return simplified;
    }

    /**
     * Update LOD system
     */
    update(deltaTime) {
        if (!this.config.enabled || !this.initialized) return;
        
        // Throttle updates for performance
        this.updateThrottle += deltaTime * 1000;
        if (this.updateThrottle < this.updateInterval) return;
        this.updateThrottle = 0;
        
        // Check if camera moved significantly
        const cameraPosition = this.camera.position;
        const distance = cameraPosition.distanceTo(this.lastCameraPosition);
        
        if (distance > 1.0) { // Only update if camera moved more than 1 unit
            this.updateLODLevels();
            this.lastCameraPosition.copy(cameraPosition);
        }
    }

    /**
     * Update LOD levels based on camera position
     */
    updateLODLevels() {
        this.lodObjects.forEach((lodObject, originalModel) => {
            // THREE.LOD automatically handles level switching based on distance
            // We just need to update the LOD object
            lodObject.update(this.camera);
            
            // Track current level for debugging/analytics
            const modelData = this.modelLODs.get(originalModel);
            if (modelData) {
                const currentLevel = this.getCurrentLODLevel(lodObject);
                if (currentLevel !== modelData.currentLevel) {
                    modelData.currentLevel = currentLevel;
                    this.core.emit('lod:level_changed', {
                        model: originalModel,
                        level: currentLevel,
                        totalLevels: modelData.levels.length
                    });
                }
            }
        });
    }

    /**
     * Get current LOD level for a LOD object
     */
    getCurrentLODLevel(lodObject) {
        // Find which level is currently active
        for (let i = 0; i < lodObject.levels.length; i++) {
            const level = lodObject.levels[i];
            if (level.object.visible) {
                return i;
            }
        }
        return 0;
    }

    /**
     * Handle camera position changes
     */
    updateCameraPosition() {
        // This will be called on next update cycle
        this.updateThrottle = this.updateInterval; // Force immediate update
    }

    /**
     * Increase LOD bias to improve performance
     */
    increaseLODBias() {
        this.config.bias = Math.min(this.config.bias * 1.2, 3.0);
        this.updateLODDistances();
        
        console.log(`LOD bias increased to ${this.config.bias.toFixed(2)}`);
    }

    /**
     * Decrease LOD bias to improve quality
     */
    decreaseLODBias() {
        this.config.bias = Math.max(this.config.bias * 0.8, 0.5);
        this.updateLODDistances();
        
        console.log(`LOD bias decreased to ${this.config.bias.toFixed(2)}`);
    }

    /**
     * Update LOD distances for all objects
     */
    updateLODDistances() {
        this.lodObjects.forEach((lodObject) => {
            lodObject.levels.forEach((level, index) => {
                const baseDistance = this.config.lodLevels[index]?.distance || (index * 25);
                level.distance = baseDistance * this.config.bias;
            });
        });
    }

    /**
     * Reduce LOD levels to improve performance
     */
    reduceLODLevels() {
        this.lodObjects.forEach((lodObject) => {
            // Remove highest detail levels, keeping only lower detail ones
            if (lodObject.levels.length > 2) {
                const levelsToRemove = Math.floor(lodObject.levels.length * 0.3);
                for (let i = 0; i < levelsToRemove; i++) {
                    lodObject.levels.shift(); // Remove highest detail levels
                }
            }
        });
        
        console.log('LOD levels reduced for better performance');
    }

    /**
     * Reduce memory usage by LOD system
     */
    reduceMemoryUsage() {
        this.modelLODs.forEach((modelData) => {
            // Dispose of unused geometry and materials in higher detail levels
            modelData.levels.forEach((level, index) => {
                if (index > 1) { // Keep only first two levels
                    level.traverse((child) => {
                        if (child.isMesh) {
                            if (child.geometry) {
                                child.geometry.dispose();
                            }
                            if (child.material) {
                                if (Array.isArray(child.material)) {
                                    child.material.forEach(mat => mat.dispose());
                                } else {
                                    child.material.dispose();
                                }
                            }
                        }
                    });
                }
            });
        });
        
        console.log('LOD memory usage reduced');
    }

    /**
     * Set quality level
     */
    setQualityLevel(quality) {
        switch (quality) {
            case 'low':
                this.config.bias = 2.0;
                break;
            case 'medium':
                this.config.bias = 1.5;
                break;
            case 'high':
                this.config.bias = 1.0;
                break;
            case 'ultra':
                this.config.bias = 0.7;
                break;
        }
        
        this.updateLODDistances();
    }

    /**
     * Enable/disable LOD system
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
        
        if (!enabled) {
            // Show original models
            this.lodObjects.forEach((lodObject, originalModel) => {
                const parent = lodObject.parent;
                if (parent) {
                    parent.remove(lodObject);
                    parent.add(originalModel);
                }
            });
        } else {
            // Show LOD objects
            this.lodObjects.forEach((lodObject, originalModel) => {
                const parent = originalModel.parent;
                if (parent) {
                    parent.remove(originalModel);
                    parent.add(lodObject);
                }
            });
        }
    }

    /**
     * Handle camera changed event
     */
    onCameraChanged() {
        this.updateCameraPosition();
    }

    /**
     * Get LOD statistics
     */
    getStats() {
        const stats = {
            totalLODObjects: this.lodObjects.size,
            averageLevels: 0,
            currentBias: this.config.bias,
            memoryUsage: 0
        };
        
        if (this.modelLODs.size > 0) {
            let totalLevels = 0;
            this.modelLODs.forEach((modelData) => {
                totalLevels += modelData.levels.length;
            });
            stats.averageLevels = totalLevels / this.modelLODs.size;
        }
        
        return stats;
    }

    /**
     * Cleanup LOD system
     */
    cleanup() {
        // Restore original models
        this.lodObjects.forEach((lodObject, originalModel) => {
            const parent = lodObject.parent;
            if (parent) {
                parent.remove(lodObject);
                parent.add(originalModel);
            }
        });
        
        // Dispose of LOD geometries and materials
        this.modelLODs.forEach((modelData) => {
            modelData.levels.forEach((level) => {
                level.traverse((child) => {
                    if (child.isMesh) {
                        if (child.geometry) {
                            child.geometry.dispose();
                        }
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => mat.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    }
                });
            });
        });
        
        this.lodObjects.clear();
        this.modelLODs.clear();
        
        console.log('LOD system cleaned up');
    }

    /**
     * Destroy LOD manager
     */
    destroy() {
        this.cleanup();
        this.initialized = false;
        console.log('LODManager destroyed');
    }
}