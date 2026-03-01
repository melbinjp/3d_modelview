import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';
import { XRHandModelFactory } from 'three/examples/jsm/webxr/XRHandModelFactory.js';

/**
 * WebXRManager - Manages VR/AR experiences using WebXR
 */
export class WebXRManager {
    constructor(core, renderer, scene, camera) {
        this.core = core;
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        this.xrSession = null;
        this.xrReferenceSpace = null;
        this.controllers = [];
        this.hands = [];
        this.controllerGrips = [];
        
        this.vrButton = null;
        this.arButton = null;
        
        this.controllerModelFactory = new XRControllerModelFactory();
        this.handModelFactory = new XRHandModelFactory();
        
        this.teleportMarker = null;
        this.intersectionPoint = new THREE.Vector3();
        
        this.initialized = false;
        this.vrSupported = false;
        this.arSupported = false;
        
        this.init();
    }

    /**
     * Initialize WebXR support
     */
    async init() {
        if (this.initialized) return;

        try {
            // Check WebXR support
            await this.checkWebXRSupport();
            
            if (this.vrSupported || this.arSupported) {
                this.setupWebXR();
                this.setupControllers();
                this.setupHands();
                this.setupTeleportation();
                this.setupEventListeners();
            }
            
            this.initialized = true;
            this.core.emit('webxr:initialized', {
                vrSupported: this.vrSupported,
                arSupported: this.arSupported
            });
        } catch (error) {
            console.error('Failed to initialize WebXRManager:', error);
            throw error;
        }
    }

    /**
     * Check WebXR support
     */
    async checkWebXRSupport() {
        if ('xr' in navigator) {
            try {
                this.vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
                this.arSupported = await navigator.xr.isSessionSupported('immersive-ar');
            } catch (error) {
                console.warn('Error checking WebXR support:', error);
            }
        }
    }

    /**
     * Setup WebXR renderer
     */
    setupWebXR() {
        this.renderer.xr.enabled = true;
        
        // Create VR button if supported
        if (this.vrSupported) {
            this.vrButton = VRButton.createButton(this.renderer);
            this.vrButton.style.position = 'fixed';
            this.vrButton.style.bottom = '20px';
            this.vrButton.style.left = '20px';
            this.vrButton.style.zIndex = '1000';
        }
        
        // Create AR button if supported
        if (this.arSupported) {
            this.arButton = ARButton.createButton(this.renderer, {
                requiredFeatures: ['hit-test'],
                optionalFeatures: ['dom-overlay', 'dom-overlay-for-handheld-ar'],
                domOverlay: { root: document.body }
            });
            this.arButton.style.position = 'fixed';
            this.arButton.style.bottom = '20px';
            this.arButton.style.right = '20px';
            this.arButton.style.zIndex = '1000';
        }
    }

    /**
     * Setup XR controllers
     */
    setupControllers() {
        // Controller 0 (right hand)
        const controller0 = this.renderer.xr.getController(0);
        controller0.addEventListener('selectstart', (event) => this.onSelectStart(event, 0));
        controller0.addEventListener('selectend', (event) => this.onSelectEnd(event, 0));
        controller0.addEventListener('select', (event) => this.onSelect(event, 0));
        this.scene.add(controller0);
        this.controllers.push(controller0);

        // Controller 1 (left hand)
        const controller1 = this.renderer.xr.getController(1);
        controller1.addEventListener('selectstart', (event) => this.onSelectStart(event, 1));
        controller1.addEventListener('selectend', (event) => this.onSelectEnd(event, 1));
        controller1.addEventListener('select', (event) => this.onSelect(event, 1));
        this.scene.add(controller1);
        this.controllers.push(controller1);

        // Controller grips
        const controllerGrip0 = this.renderer.xr.getControllerGrip(0);
        controllerGrip0.add(this.controllerModelFactory.createControllerModel(controllerGrip0));
        this.scene.add(controllerGrip0);
        this.controllerGrips.push(controllerGrip0);

        const controllerGrip1 = this.renderer.xr.getControllerGrip(1);
        controllerGrip1.add(this.controllerModelFactory.createControllerModel(controllerGrip1));
        this.scene.add(controllerGrip1);
        this.controllerGrips.push(controllerGrip1);

        // Add ray visualization
        this.controllers.forEach(controller => {
            const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0, 0, -1)
            ]);
            const line = new THREE.Line(geometry);
            line.name = 'ray';
            line.scale.z = 5;
            controller.add(line);
        });
    }

    /**
     * Setup hand tracking
     */
    setupHands() {
        // Hand 0 (right hand)
        const hand0 = this.renderer.xr.getHand(0);
        hand0.add(this.handModelFactory.createHandModel(hand0, 'mesh'));
        this.scene.add(hand0);
        this.hands.push(hand0);

        // Hand 1 (left hand)
        const hand1 = this.renderer.xr.getHand(1);
        hand1.add(this.handModelFactory.createHandModel(hand1, 'mesh'));
        this.scene.add(hand1);
        this.hands.push(hand1);
    }

    /**
     * Setup teleportation system
     */
    setupTeleportation() {
        // Create teleport marker
        const geometry = new THREE.RingGeometry(0.1, 0.2, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.7
        });
        this.teleportMarker = new THREE.Mesh(geometry, material);
        this.teleportMarker.rotation.x = -Math.PI / 2;
        this.teleportMarker.visible = false;
        this.scene.add(this.teleportMarker);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.renderer.xr.addEventListener('sessionstart', () => {
            this.onSessionStart();
        });

        this.renderer.xr.addEventListener('sessionend', () => {
            this.onSessionEnd();
        });
    }

    /**
     * Handle XR session start
     */
    onSessionStart() {
        this.xrSession = this.renderer.xr.getSession();
        this.core.emit('webxr:session:start', { session: this.xrSession });
    }

    /**
     * Handle XR session end
     */
    onSessionEnd() {
        this.xrSession = null;
        this.core.emit('webxr:session:end');
    }

    /**
     * Handle controller select start
     */
    onSelectStart(event, controllerIndex) {
        const controller = this.controllers[controllerIndex];
        
        // Store event data for potential use
        controller.userData.lastEvent = event;
        
        // Perform raycast for teleportation
        const intersections = this.getIntersections(controller);
        
        if (intersections.length > 0) {
            const intersection = intersections[0];
            this.intersectionPoint.copy(intersection.point);
            this.teleportMarker.position.copy(intersection.point);
            this.teleportMarker.visible = true;
        }
        
        this.core.emit('webxr:controller:selectstart', {
            controllerIndex,
            controller,
            intersections
        });
    }

    /**
     * Handle controller select end
     */
    onSelectEnd(event, controllerIndex) {
        const controller = this.controllers[controllerIndex];
        
        // Store event data for potential use
        controller.userData.lastEvent = event;
        
        if (this.teleportMarker.visible) {
            // Perform teleportation
            this.teleportUser(this.intersectionPoint);
            this.teleportMarker.visible = false;
        }
        
        this.core.emit('webxr:controller:selectend', {
            controllerIndex,
            controller
        });
    }

    /**
     * Handle controller select
     */
    onSelect(event, controllerIndex) {
        const controller = this.controllers[controllerIndex];
        const intersections = this.getIntersections(controller);
        
        // Store event data for potential use
        controller.userData.lastEvent = event;
        
        this.core.emit('webxr:controller:select', {
            controllerIndex,
            controller,
            intersections
        });
    }

    /**
     * Get intersections from controller ray
     */
    getIntersections(controller) {
        const tempMatrix = new THREE.Matrix4();
        tempMatrix.identity().extractRotation(controller.matrixWorld);

        const raycaster = new THREE.Raycaster();
        raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
        raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

        // Get all meshes in the scene for intersection testing
        const meshes = [];
        this.scene.traverse(child => {
            if (child.isMesh && child !== this.teleportMarker) {
                meshes.push(child);
            }
        });

        return raycaster.intersectObjects(meshes, false);
    }

    /**
     * Teleport user to position
     */
    teleportUser(position) {
        const offsetPosition = this.renderer.xr.getCamera().position.clone();
        offsetPosition.y = 0; // Only consider horizontal offset
        
        const teleportPosition = position.clone().sub(offsetPosition);
        
        // Move the XR reference space
        if (this.renderer.xr.isPresenting) {
            const xrCamera = this.renderer.xr.getCamera();
            const group = xrCamera.parent;
            if (group) {
                group.position.copy(teleportPosition);
            }
        }
        
        this.core.emit('webxr:teleport', { position: teleportPosition });
    }

    /**
     * Add VR button to container
     */
    addVRButton(container) {
        if (this.vrButton && this.vrSupported) {
            container.appendChild(this.vrButton);
        }
    }

    /**
     * Add AR button to container
     */
    addARButton(container) {
        if (this.arButton && this.arSupported) {
            container.appendChild(this.arButton);
        }
    }

    /**
     * Remove VR button from container
     */
    removeVRButton() {
        if (this.vrButton && this.vrButton.parentNode) {
            this.vrButton.parentNode.removeChild(this.vrButton);
        }
    }

    /**
     * Remove AR button from container
     */
    removeARButton() {
        if (this.arButton && this.arButton.parentNode) {
            this.arButton.parentNode.removeChild(this.arButton);
        }
    }

    /**
     * Check if currently in VR session
     */
    isInVR() {
        return this.renderer.xr.isPresenting && this.xrSession?.mode === 'immersive-vr';
    }

    /**
     * Check if currently in AR session
     */
    isInAR() {
        return this.renderer.xr.isPresenting && this.xrSession?.mode === 'immersive-ar';
    }

    /**
     * Get XR camera
     */
    getXRCamera() {
        return this.renderer.xr.getCamera();
    }

    /**
     * Get controller by index
     */
    getController(index) {
        return this.controllers[index];
    }

    /**
     * Get hand by index
     */
    getHand(index) {
        return this.hands[index];
    }

    /**
     * Enable controller ray visualization
     */
    showControllerRays(show = true) {
        this.controllers.forEach(controller => {
            const ray = controller.getObjectByName('ray');
            if (ray) {
                ray.visible = show;
            }
        });
    }

    /**
     * Set teleport marker color
     */
    setTeleportMarkerColor(color) {
        if (this.teleportMarker) {
            this.teleportMarker.material.color.setHex(color);
        }
    }

    /**
     * Enable/disable teleportation
     */
    enableTeleportation(enabled = true) {
        this.teleportationEnabled = enabled;
    }

    /**
     * Update WebXR (called in render loop)
     */
    update() {
        if (!this.initialized || !this.renderer.xr.isPresenting) return;

        // Update controller interactions
        this.updateControllerInteractions();
        
        // Update hand tracking
        this.updateHandTracking();
    }

    /**
     * Update controller interactions
     */
    updateControllerInteractions() {
        this.controllers.forEach((controller, index) => {
            if (controller.userData.isSelecting) {
                const intersections = this.getIntersections(controller);
                
                if (intersections.length > 0) {
                    const intersection = intersections[0];
                    this.core.emit('webxr:controller:hover', {
                        controllerIndex: index,
                        controller,
                        intersection
                    });
                }
            }
        });
    }

    /**
     * Update hand tracking
     */
    updateHandTracking() {
        this.hands.forEach((hand, index) => {
            if (hand.joints) {
                // Process hand joint data
                const joints = hand.joints;
                
                // Example: Detect pinch gesture
                if (joints['thumb-tip'] && joints['index-finger-tip']) {
                    const thumbTip = joints['thumb-tip'];
                    const indexTip = joints['index-finger-tip'];
                    
                    if (thumbTip.visible && indexTip.visible) {
                        const distance = thumbTip.position.distanceTo(indexTip.position);
                        const isPinching = distance < 0.02; // 2cm threshold
                        
                        if (isPinching !== hand.userData.wasPinching) {
                            hand.userData.wasPinching = isPinching;
                            
                            this.core.emit('webxr:hand:pinch', {
                                handIndex: index,
                                hand,
                                isPinching
                            });
                        }
                    }
                }
            }
        });
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Remove buttons
        this.removeVRButton();
        this.removeARButton();
        
        // Clean up controllers
        this.controllers.forEach(controller => {
            this.scene.remove(controller);
        });
        
        // Clean up hands
        this.hands.forEach(hand => {
            this.scene.remove(hand);
        });
        
        // Clean up controller grips
        this.controllerGrips.forEach(grip => {
            this.scene.remove(grip);
        });
        
        // Remove teleport marker
        if (this.teleportMarker) {
            this.scene.remove(this.teleportMarker);
        }
        
        // Disable XR
        this.renderer.xr.enabled = false;
        
        this.controllers = [];
        this.hands = [];
        this.controllerGrips = [];
        this.initialized = false;
        
        this.core.emit('webxr:destroyed');
    }
}