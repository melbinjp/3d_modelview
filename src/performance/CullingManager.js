import * as THREE from 'three';

/**
 * CullingManager - Implements frustum culling and occlusion culling for better performance
 * Hides objects that are not visible to improve rendering performance
 */
export class CullingManager {
    constructor(core, scene, camera) {
        this.core = core;
        this.scene = scene;
        this.camera = camera;
        
        // Culling configuration
        this.config = {
            enabled: true,
            frustumCulling: true,
            occlusionCulling: true,
            aggressiveness: 1.0, // Multiplier for culling thresholds
            updateInterval: 50, // Update every 50ms
            occlusionTestInterval: 200, // Occlusion tests every 200ms
            minObjectSize: 0.01, // Minimum object size to consider for culling
            maxCullingDistance: 1000 // Maximum distance for culling calculations
        };
        
        // Culling state
        this.cullableObjects = new Set();
        this.frustumCulledObjects = new Set();
        this.occlusionCulledObjects = new Set();
        this.objectBounds = new Map(); // object -> bounding box
        this.objectDistances = new Map(); // object -> distance from camera
        
        // Frustum culling
        this.frustum = new THREE.Frustum();
        this.cameraMatrix = new THREE.Matrix4();
        
        // Occlusion culling
        this.occlusionRenderer = null;
        this.occlusionRenderTarget = null;
        this.occlusionScene = new THREE.Scene();
        this.occlusionCamera = null;
        this.occlusionMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        
        // Update throttling
        this.lastFrustumUpdate = 0;
        this.lastOcclusionUpdate = 0;
        
        this.initialized = false;
    }

    /**
     * Initialize the culling manager
     */
    init() {
        if (this.initialized) {
            console.warn('CullingManager already initialized');
            return;
        }

        this.setupOcclusionCulling();
        this.setupEventListeners();
        this.initialized = true;
        
        // Silent initialization
    }

    /**
     * Setup occlusion culling system
     */
    setupOcclusionCulling() {
        if (!this.config.occlusionCulling) return;
        
        // Create low-resolution render target for occlusion tests
        this.occlusionRenderTarget = new THREE.WebGLRenderTarget(64, 64, {
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.UnsignedByteType
        });
        
        // Create occlusion camera (copy of main camera)
        if (this.camera && typeof this.camera.clone === 'function') {
            this.occlusionCamera = this.camera.clone();
        } else {
            // Fallback: create a basic camera if clone is not available
            this.occlusionCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
            if (this.camera) {
                if (this.camera.position) {
                    this.occlusionCamera.position.copy(this.camera.position);
                }
                if (this.camera.rotation) {
                    this.occlusionCamera.rotation.copy(this.camera.rotation);
                }
                if (this.camera.fov) this.occlusionCamera.fov = this.camera.fov;
                if (this.camera.aspect) this.occlusionCamera.aspect = this.camera.aspect;
                if (this.camera.near) this.occlusionCamera.near = this.camera.near;
                if (this.camera.far) this.occlusionCamera.far = this.camera.far;
            }
        }
        
        // Silent occlusion culling setup
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for camera movement
        this.core.on('camera:moved', () => this.onCameraChanged());
        
        // Listen for performance issues
        this.core.on('performance:optimization_triggered', (data) => {
            if (data.issueType === 'high_draw_calls') {
                this.increaseCullingAggressiveness();
            }
        });
    }

    /**
     * Setup culling for a model
     */
    setupModelCulling(model) {
        if (!this.config.enabled) return;
        
        // Traverse model and add cullable objects
        model.traverse((child) => {
            if (child.isMesh && this.shouldCullObject(child)) {
                this.addCullableObject(child);
            }
        });
        
        console.log(`Culling setup for model with ${this.cullableObjects.size} cullable objects`);
    }

    /**
     * Check if an object should be considered for culling
     */
    shouldCullObject(object) {
        if (!object.isMesh || !object.geometry) return false;
        
        // Calculate object size
        const boundingBox = new THREE.Box3().setFromObject(object);
        const size = boundingBox.getSize(new THREE.Vector3()).length();
        
        return size >= this.config.minObjectSize;
    }

    /**
     * Add an object to the cullable objects list
     */
    addCullableObject(object) {
        this.cullableObjects.add(object);
        
        // Calculate and store bounding box
        const boundingBox = new THREE.Box3().setFromObject(object);
        this.objectBounds.set(object, boundingBox);
        
        // Store original visibility state
        if (!object.userData.originalVisible) {
            object.userData.originalVisible = object.visible;
        }
    }

    /**
     * Remove an object from culling
     */
    removeCullableObject(object) {
        this.cullableObjects.delete(object);
        this.frustumCulledObjects.delete(object);
        this.occlusionCulledObjects.delete(object);
        this.objectBounds.delete(object);
        this.objectDistances.delete(object);
        
        // Restore original visibility
        if (object.userData.originalVisible !== undefined) {
            object.visible = object.userData.originalVisible;
        }
    }

    /**
     * Update culling system
     */
    update(deltaTime) {
        if (!this.config.enabled || !this.initialized) return;
        
        const now = performance.now();
        
        // Update frustum culling
        if (now - this.lastFrustumUpdate >= this.config.updateInterval) {
            this.updateFrustumCulling();
            this.lastFrustumUpdate = now;
        }
        
        // Update occlusion culling (less frequently)
        if (this.config.occlusionCulling && 
            now - this.lastOcclusionUpdate >= this.config.occlusionTestInterval) {
            this.updateOcclusionCulling();
            this.lastOcclusionUpdate = now;
        }
    }

    /**
     * Update frustum culling
     */
    updateFrustumCulling() {
        if (!this.config.frustumCulling) return;
        
        // Update camera frustum
        this.cameraMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
        this.frustum.setFromProjectionMatrix(this.cameraMatrix);
        
        let culledCount = 0;
        let visibleCount = 0;
        
        this.cullableObjects.forEach((object) => {
            const boundingBox = this.objectBounds.get(object);
            if (!boundingBox) return;
            
            // Update bounding box to world coordinates
            const worldBoundingBox = boundingBox.clone();
            worldBoundingBox.applyMatrix4(object.matrixWorld);
            
            // Test against frustum
            const isInFrustum = this.frustum.intersectsBox(worldBoundingBox);
            
            if (isInFrustum) {
                // Object is visible, remove from culled set
                if (this.frustumCulledObjects.has(object)) {
                    this.frustumCulledObjects.delete(object);
                    this.updateObjectVisibility(object);
                }
                visibleCount++;
                
                // Update distance for LOD and other systems
                const distance = this.camera.position.distanceTo(object.position);
                this.objectDistances.set(object, distance);
            } else {
                // Object is outside frustum, add to culled set
                if (!this.frustumCulledObjects.has(object)) {
                    this.frustumCulledObjects.add(object);
                    this.updateObjectVisibility(object);
                }
                culledCount++;
            }
        });
        
        // Emit culling statistics
        this.core.emit('culling:frustum_updated', {
            total: this.cullableObjects.size,
            visible: visibleCount,
            culled: culledCount
        });
    }

    /**
     * Update occlusion culling
     */
    updateOcclusionCulling() {
        if (!this.config.occlusionCulling || !this.occlusionRenderTarget) return;
        
        // Only test objects that passed frustum culling
        const visibleObjects = Array.from(this.cullableObjects).filter(obj => 
            !this.frustumCulledObjects.has(obj)
        );
        
        if (visibleObjects.length === 0) return;
        
        let occludedCount = 0;
        
        // Sort objects by distance (test closer objects first)
        visibleObjects.sort((a, b) => {
            const distA = this.objectDistances.get(a) || 0;
            const distB = this.objectDistances.get(b) || 0;
            return distA - distB;
        });
        
        // Test each object for occlusion
        visibleObjects.forEach((object, index) => {
            // Skip occlusion test for very close objects
            const distance = this.objectDistances.get(object) || 0;
            if (distance < 5.0) return;
            
            // Perform occlusion test
            const isOccluded = this.performOcclusionTest(object, visibleObjects.slice(0, index));
            
            if (isOccluded) {
                if (!this.occlusionCulledObjects.has(object)) {
                    this.occlusionCulledObjects.add(object);
                    this.updateObjectVisibility(object);
                }
                occludedCount++;
            } else {
                if (this.occlusionCulledObjects.has(object)) {
                    this.occlusionCulledObjects.delete(object);
                    this.updateObjectVisibility(object);
                }
            }
        });
        
        // Emit occlusion culling statistics
        this.core.emit('culling:occlusion_updated', {
            tested: visibleObjects.length,
            occluded: occludedCount
        });
    }

    /**
     * Perform occlusion test for an object
     */
    performOcclusionTest(testObject, occluders) {
        if (occluders.length === 0) return false;
        
        // Clear occlusion scene
        this.occlusionScene.clear();
        
        // Add occluders to occlusion scene
        occluders.forEach((occluder) => {
            const occluderClone = occluder.clone();
            occluderClone.material = this.occlusionMaterial;
            this.occlusionScene.add(occluderClone);
        });
        
        // Update occlusion camera
        this.occlusionCamera.copy(this.camera);
        
        // Render occluders
        const renderer = this.core.getModule('rendering')?.renderer;
        if (!renderer) return false;
        
        const originalRenderTarget = renderer.getRenderTarget();
        renderer.setRenderTarget(this.occlusionRenderTarget);
        renderer.clear();
        renderer.render(this.occlusionScene, this.occlusionCamera);
        
        // Test if test object would be visible
        const testObjectClone = testObject.clone();
        testObjectClone.material = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.occlusionScene.add(testObjectClone);
        
        renderer.render(this.occlusionScene, this.occlusionCamera);
        
        // Read pixels to determine occlusion
        const pixels = new Uint8Array(4);
        renderer.readRenderTargetPixels(
            this.occlusionRenderTarget, 
            32, 32, 1, 1, // Center pixel
            pixels
        );
        
        // Restore original render target
        renderer.setRenderTarget(originalRenderTarget);
        
        // If pixel is black, object is occluded
        return pixels[0] === 0 && pixels[1] === 0 && pixels[2] === 0;
    }

    /**
     * Update object visibility based on culling results
     */
    updateObjectVisibility(object) {
        const isFrustumCulled = this.frustumCulledObjects.has(object);
        const isOcclusionCulled = this.occlusionCulledObjects.has(object);
        
        // Object is visible if it's not culled by either system
        const shouldBeVisible = !isFrustumCulled && !isOcclusionCulled;
        
        if (object.visible !== shouldBeVisible) {
            object.visible = shouldBeVisible;
            
            // Emit visibility change event
            this.core.emit('culling:visibility_changed', {
                object,
                visible: shouldBeVisible,
                frustumCulled: isFrustumCulled,
                occlusionCulled: isOcclusionCulled
            });
        }
    }

    /**
     * Handle camera changed event
     */
    onCameraChanged() {
        // Force immediate frustum culling update
        this.lastFrustumUpdate = 0;
    }

    /**
     * Update camera frustum for culling
     */
    updateCameraFrustum() {
        this.onCameraChanged();
    }

    /**
     * Increase culling aggressiveness for better performance
     */
    increaseCullingAggressiveness() {
        this.config.aggressiveness = Math.min(this.config.aggressiveness * 1.2, 2.0);
        this.config.minObjectSize *= 0.8; // Cull smaller objects
        this.config.updateInterval = Math.max(this.config.updateInterval * 0.8, 25); // Update more frequently
        
        console.log(`Culling aggressiveness increased to ${this.config.aggressiveness.toFixed(2)}`);
    }

    /**
     * Decrease culling aggressiveness for better quality
     */
    decreaseCullingAggressiveness() {
        this.config.aggressiveness = Math.max(this.config.aggressiveness * 0.8, 0.5);
        this.config.minObjectSize *= 1.2; // Cull fewer small objects
        this.config.updateInterval = Math.min(this.config.updateInterval * 1.2, 100); // Update less frequently
        
        console.log(`Culling aggressiveness decreased to ${this.config.aggressiveness.toFixed(2)}`);
    }

    /**
     * Set quality level
     */
    setQualityLevel(quality) {
        switch (quality) {
            case 'low':
                this.config.aggressiveness = 2.0;
                this.config.minObjectSize = 0.005;
                this.config.updateInterval = 25;
                break;
            case 'medium':
                this.config.aggressiveness = 1.5;
                this.config.minObjectSize = 0.01;
                this.config.updateInterval = 50;
                break;
            case 'high':
                this.config.aggressiveness = 1.0;
                this.config.minObjectSize = 0.02;
                this.config.updateInterval = 75;
                break;
            case 'ultra':
                this.config.aggressiveness = 0.7;
                this.config.minObjectSize = 0.05;
                this.config.updateInterval = 100;
                break;
        }
    }

    /**
     * Enable/disable culling system
     */
    setEnabled(enabled) {
        this.config.enabled = enabled;
        
        if (!enabled) {
            // Restore visibility for all objects
            this.cullableObjects.forEach((object) => {
                if (object.userData.originalVisible !== undefined) {
                    object.visible = object.userData.originalVisible;
                }
            });
            
            // Clear culled sets
            this.frustumCulledObjects.clear();
            this.occlusionCulledObjects.clear();
        }
    }

    /**
     * Get culling statistics
     */
    getStats() {
        return {
            totalObjects: this.cullableObjects.size,
            frustumCulled: this.frustumCulledObjects.size,
            occlusionCulled: this.occlusionCulledObjects.size,
            visible: this.cullableObjects.size - this.frustumCulledObjects.size - this.occlusionCulledObjects.size,
            aggressiveness: this.config.aggressiveness,
            minObjectSize: this.config.minObjectSize
        };
    }

    /**
     * Cleanup culling system
     */
    cleanup() {
        // Restore visibility for all objects
        this.cullableObjects.forEach((object) => {
            if (object.userData.originalVisible !== undefined) {
                object.visible = object.userData.originalVisible;
                delete object.userData.originalVisible;
            }
        });
        
        // Clear all sets and maps
        this.cullableObjects.clear();
        this.frustumCulledObjects.clear();
        this.occlusionCulledObjects.clear();
        this.objectBounds.clear();
        this.objectDistances.clear();
        
        console.log('Culling system cleaned up');
    }

    /**
     * Destroy culling manager
     */
    destroy() {
        this.cleanup();
        
        // Dispose of occlusion culling resources
        if (this.occlusionRenderTarget) {
            this.occlusionRenderTarget.dispose();
        }
        
        if (this.occlusionMaterial) {
            this.occlusionMaterial.dispose();
        }
        
        this.initialized = false;
        console.log('CullingManager destroyed');
    }
}