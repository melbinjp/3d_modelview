import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import cannonDebugger from 'cannon-es-debugger';

/**
 * PhysicsEngine - Integrates production-grade physics simulation using cannon-es.
 * This engine handles rigid body dynamics, collisions, and constraints.
 * 
 * @class PhysicsEngine
 * @extends THREE.EventDispatcher
 */
export class PhysicsEngine {
    constructor(core) {
        this.core = core;
        this.world = null;
        this.bodies = new Map();
        this.constraints = new Map();
        
        this.gravity = new CANNON.Vec3(0, -9.81, 0);
        this.timeStep = 1 / 60;
        this.maxSubSteps = 3;
        
        this.enabled = false;
        this.initialized = false;
        this.debug = false;
        this.debugger = null;
        
        // Physics materials
        this.materials = new Map();
        this.contactMaterials = new Map();
        this.originalStates = new Map();
        
        this.init();
        this.setupEventListeners();
    }

    /**
     * Initialize the physics engine world
     */
    init() {
        if (this.initialized) return;

        try {
            // Initialize Cannon.js world
            this.world = new CANNON.World();
            this.world.gravity.copy(this.gravity);
            
            // Use split impulse to prevent jitter on high speeds
            this.world.solver.iterations = 10;
            this.world.defaultContactMaterial.contactEquationStiffness = 1e7;
            this.world.defaultContactMaterial.contactEquationRelaxation = 4;

            // Enable broadphase for performance
            this.world.broadphase = new CANNON.SAPBroadphase(this.world);
            this.world.allowSleep = true;
            
            this.initializeMaterials();
            this.initialized = true;
            
            this.core.emit('physics:initialized');
        } catch (error) {
            console.error('Failed to initialize PhysicsEngine:', error);
            throw error;
        }
    }

    /**
     * Setup event listeners for the physics engine
     */
    setupEventListeners() {
        this.core.on('physics:toggle', (enabled) => {
            this.enabled = enabled;
        });
        
        this.core.on('physics:reset', () => {
            this.reset();
        });

        this.core.on('physics:debug', (enabled) => {
            this.debug = enabled;
        });
    }

    /**
     * Initialize physics materials and contact interactions
     */
    initializeMaterials() {
        const matConfigs = {
            'default': { friction: 0.3, restitution: 0.3 },
            'metal': { friction: 0.2, restitution: 0.1 },
            'rubber': { friction: 0.8, restitution: 0.9 },
            'wood': { friction: 0.5, restitution: 0.2 },
            'glass': { friction: 0.1, restitution: 0.05 }
        };

        Object.entries(matConfigs).forEach(([name, config]) => {
            const mat = new CANNON.Material(name);
            this.materials.set(name, mat);
        });

        // Define default contact behavior
        const defaultMat = this.materials.get('default');
        const contactMat = new CANNON.ContactMaterial(defaultMat, defaultMat, {
            friction: 0.3,
            restitution: 0.3,
            contactEquationStiffness: 1e7,
            contactEquationRelaxation: 3
        });
        this.world.addContactMaterial(contactMat);
    }

    /**
     * Enable/Disable simulation
     */
    enable() { this.enabled = true; this.core.emit('physics:enabled'); }
    disable() { this.enabled = false; this.core.emit('physics:disabled'); }

    /**
     * Add a rigid body to the world
     * @param {THREE.Mesh} mesh - The visual mesh to sync with
     * @param {Object} options - Body configuration
     */
    addRigidBody(mesh, options = {}) {
        if (!this.initialized) return null;

        const {
            type = 'dynamic',
            shape = 'box',
            mass = 1,
            material = 'default',
            collisionFilterGroup = 1,
            collisionFilterMask = -1
        } = options;

        const bodyType = type === 'static' ? CANNON.Body.STATIC : 
                         type === 'kinematic' ? CANNON.Body.KINEMATIC : CANNON.Body.DYNAMIC;

        const cannonShape = this.createCannonShape(mesh, shape);
        const body = new CANNON.Body({
            mass: type === 'static' ? 0 : mass,
            type: bodyType,
            material: this.materials.get(material),
            collisionFilterGroup,
            collisionFilterMask
        });

        body.addShape(cannonShape);
        body.position.copy(mesh.position);
        body.quaternion.copy(mesh.quaternion);

        this.world.addBody(body);
        this.bodies.set(mesh.uuid, { body, mesh });
        this.storeInitialState(body);

        this.core.emit('physics:body:added', { mesh, body });
        return body;
    }

    /**
     * Create a Cannon shape from Three.js mesh
     */
    createCannonShape(mesh, type) {
        mesh.geometry.computeBoundingBox();
        const size = new THREE.Vector3();
        mesh.geometry.boundingBox.getSize(size);
        size.multiply(mesh.scale);

        switch (type) {
            case 'sphere':
                const radius = Math.max(size.x, size.y, size.z) / 2;
                return new CANNON.Sphere(radius);
            case 'cylinder':
                return new CANNON.Cylinder(size.x/2, size.x/2, size.y, 20);
            case 'mesh':
                // Simplified trimesh - use with caution for performance
                return this.createTrimesh(mesh.geometry);
            case 'box':
            default:
                return new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2));
        }
    }

    /**
     * Create a trimesh from geometry (for static complex objects)
     */
    createTrimesh(geometry) {
        const vertices = geometry.attributes.position.array;
        const indices = geometry.index ? geometry.index.array : Array.from(Array(vertices.length / 3).keys());
        return new CANNON.Trimesh(vertices, indices);
    }

    /**
     * Step the simulation and sync visuals
     */
    step(deltaTime) {
        if (!this.enabled || !this.initialized) return;

        this.world.step(this.timeStep, deltaTime, this.maxSubSteps);

        // Sync meshes
        this.bodies.forEach(({ body, mesh }) => {
            if (body.type !== CANNON.Body.STATIC) {
                mesh.position.copy(body.position);
                mesh.quaternion.copy(body.quaternion);
            }
        });

        // Update debugger if enabled
        if (this.debug) {
            if (!this.debugger) {
                const rendering = this.core.getModule('rendering');
                if (rendering && rendering.scene) {
                    this.debugger = cannonDebugger(rendering.scene, this.world);
                }
            }
            if (this.debugger) {
                this.debugger.update();
            }
        }

        this.core.emit('physics:step', { deltaTime });
    }

    /**
     * Reset the physics simulation to original states
     */
    reset() {
        this.bodies.forEach(({ body, mesh }) => {
            const original = this.originalStates.get(body);
            if (original) {
                body.position.copy(original.position);
                body.quaternion.copy(original.quaternion);
                body.velocity.set(0, 0, 0);
                body.angularVelocity.set(0, 0, 0);
                
                mesh.position.copy(body.position);
                mesh.quaternion.copy(body.quaternion);
            }
        });
        this.core.emit('physics:reset:complete');
    }

    /**
     * Store initial state for a body
     */
    storeInitialState(body) {
        this.originalStates.set(body, {
            position: body.position.clone(),
            quaternion: body.quaternion.clone()
        });
    }

    applyForce(mesh, force, worldPoint) {
        const bodyData = this.bodies.get(mesh.uuid);
        if (bodyData) {
            const f = new CANNON.Vec3(force.x, force.y, force.z);
            const p = worldPoint ? new CANNON.Vec3(worldPoint.x, worldPoint.y, worldPoint.z) : bodyData.body.position;
            bodyData.body.applyForce(f, p);
        }
    }

    applyImpulse(mesh, impulse, worldPoint) {
        const bodyData = this.bodies.get(mesh.uuid);
        if (bodyData) {
            const i = new CANNON.Vec3(impulse.x, impulse.y, impulse.z);
            const p = worldPoint ? new CANNON.Vec3(worldPoint.x, worldPoint.y, worldPoint.z) : bodyData.body.position;
            bodyData.body.applyImpulse(i, p);
        }
    }

    removeRigidBody(mesh) {
        const data = this.bodies.get(mesh.uuid);
        if (data) {
            this.world.removeBody(data.body);
            this.bodies.delete(mesh.uuid);
            this.core.emit('physics:body:removed', { mesh });
        }
    }

    destroy() {
        this.bodies.clear();
        this.world = null;
        this.initialized = false;
        this.core.emit('physics:destroyed');
    }
}