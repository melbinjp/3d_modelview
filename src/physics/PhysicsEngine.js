import * as THREE from 'three';

/**
 * PhysicsEngine - Integrates physics simulation for realistic object interactions
 * Uses a simplified physics system that can be extended with libraries like Cannon.js or Ammo.js
 */
export class PhysicsEngine {
    constructor(core) {
        this.core = core;
        this.world = null;
        this.bodies = new Map();
        this.constraints = new Map();
        
        this.gravity = new THREE.Vector3(0, -9.81, 0);
        this.timeStep = 1 / 60;
        this.maxSubSteps = 3;
        
        this.enabled = false;
        this.initialized = false;
        
        // Physics materials
        this.materials = new Map();
        this.contactMaterials = new Map();
        
        this.init();
    }

    /**
     * Initialize the physics engine
     */
    init() {
        if (this.initialized) return;

        try {
            // Initialize basic physics world
            this.world = {
                bodies: [],
                gravity: this.gravity.clone(),
                step: (timeStep, maxSubSteps) => this.step(timeStep, maxSubSteps)
            };
            
            this.initializeMaterials();
            this.initialized = true;
            
            this.core.emit('physics:initialized');
        } catch (error) {
            console.error('Failed to initialize PhysicsEngine:', error);
            throw error;
        }
    }

    /**
     * Initialize physics materials
     */
    initializeMaterials() {
        // Default material
        this.materials.set('default', {
            friction: 0.4,
            restitution: 0.3,
            density: 1.0
        });

        // Metal material
        this.materials.set('metal', {
            friction: 0.3,
            restitution: 0.1,
            density: 7.8
        });

        // Wood material
        this.materials.set('wood', {
            friction: 0.6,
            restitution: 0.2,
            density: 0.6
        });

        // Rubber material
        this.materials.set('rubber', {
            friction: 0.8,
            restitution: 0.9,
            density: 1.2
        });

        // Glass material
        this.materials.set('glass', {
            friction: 0.1,
            restitution: 0.05,
            density: 2.5
        });
    }

    /**
     * Enable physics simulation
     */
    enable() {
        this.enabled = true;
        this.core.emit('physics:enabled');
    }

    /**
     * Disable physics simulation
     */
    disable() {
        this.enabled = false;
        this.core.emit('physics:disabled');
    }

    /**
     * Add a rigid body to the physics world
     */
    addRigidBody(mesh, options = {}) {
        if (!this.initialized) return null;

        const {
            type = 'dynamic', // 'static', 'kinematic', 'dynamic'
            shape = 'box', // 'box', 'sphere', 'cylinder', 'mesh'
            mass = 1,
            material = 'default',
            friction,
            restitution,
            density
        } = options;

        // Create physics body
        const body = this.createPhysicsBody(mesh, {
            type,
            shape,
            mass,
            material,
            friction,
            restitution,
            density
        });

        if (body) {
            this.bodies.set(mesh.uuid, body);
            this.world.bodies.push(body);
            
            // Store reference to mesh in body
            body.mesh = mesh;
            
            this.core.emit('physics:body:added', { mesh, body });
        }

        return body;
    }

    /**
     * Remove a rigid body from the physics world
     */
    removeRigidBody(mesh) {
        const body = this.bodies.get(mesh.uuid);
        if (body) {
            const index = this.world.bodies.indexOf(body);
            if (index > -1) {
                this.world.bodies.splice(index, 1);
            }
            this.bodies.delete(mesh.uuid);
            this.core.emit('physics:body:removed', { mesh, body });
        }
    }

    /**
     * Create a physics body based on mesh geometry
     */
    createPhysicsBody(mesh, options) {
        const { type, shape, mass, material } = options;
        
        // Get bounding box for shape creation
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // Create physics body
        const body = {
            uuid: mesh.uuid,
            type,
            shape,
            mass: type === 'static' ? 0 : mass,
            position: mesh.position.clone(),
            quaternion: mesh.quaternion.clone(),
            velocity: new THREE.Vector3(),
            angularVelocity: new THREE.Vector3(),
            force: new THREE.Vector3(),
            torque: new THREE.Vector3(),
            material: this.materials.get(material) || this.materials.get('default'),
            size: size.clone(),
            center: center.clone(),
            mesh: mesh,
            sleeping: false,
            sleepSpeedLimit: 0.1,
            sleepTimeLimit: 1,
            timeLastSleepy: 0,
            wakeUpAfterNarrowphase: false
        };

        return body;
    }

    /**
     * Apply force to a rigid body
     */
    applyForce(mesh, force, worldPoint = null) {
        const body = this.bodies.get(mesh.uuid);
        if (body && body.type === 'dynamic') {
            body.force.add(force);
            
            if (worldPoint) {
                // Apply torque for off-center forces
                const relativePoint = worldPoint.clone().sub(body.position);
                const torque = relativePoint.cross(force);
                body.torque.add(torque);
            }
        }
    }

    /**
     * Apply impulse to a rigid body
     */
    applyImpulse(mesh, impulse, worldPoint = null) {
        const body = this.bodies.get(mesh.uuid);
        if (body && body.type === 'dynamic') {
            const velocityChange = impulse.clone().divideScalar(body.mass);
            body.velocity.add(velocityChange);
            
            if (worldPoint) {
                // Apply angular impulse for off-center impulses
                const relativePoint = worldPoint.clone().sub(body.position);
                const angularImpulse = relativePoint.cross(impulse);
                // Simplified angular velocity calculation
                body.angularVelocity.add(angularImpulse.divideScalar(body.mass));
            }
        }
    }

    /**
     * Set velocity of a rigid body
     */
    setVelocity(mesh, velocity) {
        const body = this.bodies.get(mesh.uuid);
        if (body && body.type !== 'static') {
            body.velocity.copy(velocity);
        }
    }

    /**
     * Set angular velocity of a rigid body
     */
    setAngularVelocity(mesh, angularVelocity) {
        const body = this.bodies.get(mesh.uuid);
        if (body && body.type !== 'static') {
            body.angularVelocity.copy(angularVelocity);
        }
    }

    /**
     * Create a constraint between two bodies
     */
    addConstraint(meshA, meshB, options = {}) {
        const bodyA = this.bodies.get(meshA.uuid);
        const bodyB = this.bodies.get(meshB.uuid);
        
        if (!bodyA || !bodyB) return null;

        const {
            type = 'point', // 'point', 'hinge', 'slider', 'fixed'
            pivotA = new THREE.Vector3(),
            pivotB = new THREE.Vector3(),
            axisA = new THREE.Vector3(0, 1, 0),
            axisB = new THREE.Vector3(0, 1, 0)
        } = options;

        const constraint = {
            uuid: THREE.MathUtils.generateUUID(),
            type,
            bodyA,
            bodyB,
            pivotA: pivotA.clone(),
            pivotB: pivotB.clone(),
            axisA: axisA.clone(),
            axisB: axisB.clone(),
            enabled: true
        };

        this.constraints.set(constraint.uuid, constraint);
        this.core.emit('physics:constraint:added', { constraint });
        
        return constraint;
    }

    /**
     * Remove a constraint
     */
    removeConstraint(constraintId) {
        const constraint = this.constraints.get(constraintId);
        if (constraint) {
            this.constraints.delete(constraintId);
            this.core.emit('physics:constraint:removed', { constraint });
        }
    }

    /**
     * Perform collision detection
     */
    detectCollisions() {
        const collisions = [];
        const bodies = this.world.bodies;

        for (let i = 0; i < bodies.length; i++) {
            for (let j = i + 1; j < bodies.length; j++) {
                const bodyA = bodies[i];
                const bodyB = bodies[j];

                if (bodyA.type === 'static' && bodyB.type === 'static') continue;

                const collision = this.checkCollision(bodyA, bodyB);
                if (collision) {
                    collisions.push(collision);
                }
            }
        }

        return collisions;
    }

    /**
     * Check collision between two bodies
     */
    checkCollision(bodyA, bodyB) {
        // Simplified AABB collision detection
        const boxA = new THREE.Box3().setFromCenterAndSize(bodyA.position, bodyA.size);
        const boxB = new THREE.Box3().setFromCenterAndSize(bodyB.position, bodyB.size);

        if (boxA.intersectsBox(boxB)) {
            // Calculate collision normal and depth
            const normal = bodyB.position.clone().sub(bodyA.position).normalize();
            const depth = this.calculatePenetrationDepth(boxA, boxB);

            return {
                bodyA,
                bodyB,
                normal,
                depth,
                point: bodyA.position.clone().lerp(bodyB.position, 0.5)
            };
        }

        return null;
    }

    /**
     * Calculate penetration depth between two boxes
     */
    calculatePenetrationDepth(boxA, boxB) {
        const centerA = boxA.getCenter(new THREE.Vector3());
        const centerB = boxB.getCenter(new THREE.Vector3());
        const sizeA = boxA.getSize(new THREE.Vector3());
        const sizeB = boxB.getSize(new THREE.Vector3());

        const distance = centerA.distanceTo(centerB);
        const combinedSize = (sizeA.length() + sizeB.length()) / 2;

        return Math.max(0, combinedSize - distance);
    }

    /**
     * Resolve collisions
     */
    resolveCollisions(collisions) {
        collisions.forEach(collision => {
            this.resolveCollision(collision);
        });
    }

    /**
     * Resolve a single collision
     */
    resolveCollision(collision) {
        const { bodyA, bodyB, normal, depth } = collision;

        // Separate bodies
        const totalMass = bodyA.mass + bodyB.mass;
        if (totalMass > 0) {
            const separationA = normal.clone().multiplyScalar(-depth * bodyB.mass / totalMass);
            const separationB = normal.clone().multiplyScalar(depth * bodyA.mass / totalMass);

            if (bodyA.type !== 'static') {
                bodyA.position.add(separationA);
            }
            if (bodyB.type !== 'static') {
                bodyB.position.add(separationB);
            }
        }

        // Calculate relative velocity
        const relativeVelocity = bodyB.velocity.clone().sub(bodyA.velocity);
        const velocityAlongNormal = relativeVelocity.dot(normal);

        // Do not resolve if velocities are separating
        if (velocityAlongNormal > 0) return;

        // Calculate restitution
        const restitution = Math.min(bodyA.material.restitution, bodyB.material.restitution);

        // Calculate impulse scalar
        let impulseScalar = -(1 + restitution) * velocityAlongNormal;
        impulseScalar /= (1 / bodyA.mass) + (1 / bodyB.mass);

        // Apply impulse
        const impulse = normal.clone().multiplyScalar(impulseScalar);

        if (bodyA.type === 'dynamic') {
            bodyA.velocity.sub(impulse.clone().divideScalar(bodyA.mass));
        }
        if (bodyB.type === 'dynamic') {
            bodyB.velocity.add(impulse.clone().divideScalar(bodyB.mass));
        }

        // Apply friction
        this.applyFriction(bodyA, bodyB, normal, impulseScalar);
    }

    /**
     * Apply friction between two bodies
     */
    applyFriction(bodyA, bodyB, normal, impulseScalar) {
        const relativeVelocity = bodyB.velocity.clone().sub(bodyA.velocity);
        const tangent = relativeVelocity.clone().sub(normal.clone().multiplyScalar(relativeVelocity.dot(normal)));
        
        if (tangent.lengthSq() < 0.001) return;
        
        tangent.normalize();

        const frictionCoefficient = Math.sqrt(bodyA.material.friction * bodyB.material.friction);
        let frictionImpulse = -relativeVelocity.dot(tangent);
        frictionImpulse /= (1 / bodyA.mass) + (1 / bodyB.mass);

        const maxFriction = Math.abs(impulseScalar * frictionCoefficient);
        frictionImpulse = Math.max(-maxFriction, Math.min(maxFriction, frictionImpulse));

        const frictionVector = tangent.multiplyScalar(frictionImpulse);

        if (bodyA.type === 'dynamic') {
            bodyA.velocity.sub(frictionVector.clone().divideScalar(bodyA.mass));
        }
        if (bodyB.type === 'dynamic') {
            bodyB.velocity.add(frictionVector.clone().divideScalar(bodyB.mass));
        }
    }

    /**
     * Step the physics simulation
     */
    step(timeStep = this.timeStep, maxSubSteps = this.maxSubSteps) {
        if (!this.enabled || !this.initialized) return;

        const bodies = this.world.bodies;
        
        // Use maxSubSteps for more accurate simulation
        const subStepTime = timeStep / maxSubSteps;
        
        for (let i = 0; i < maxSubSteps; i++) {
            this.performSubStep(subStepTime);
        }
    }

    /**
     * Perform a single physics sub-step
     */
    performSubStep(subStepTime) {
        const bodies = this.world.bodies;

        // Apply gravity and integrate forces
        bodies.forEach(body => {
            if (body.type === 'dynamic') {
                // Apply gravity
                body.force.add(this.world.gravity.clone().multiplyScalar(body.mass));
                
                // Integrate velocity
                body.velocity.add(body.force.clone().divideScalar(body.mass).multiplyScalar(timeStep));
                body.angularVelocity.add(body.torque.clone().multiplyScalar(timeStep));
                
                // Apply damping
                body.velocity.multiplyScalar(0.99);
                body.angularVelocity.multiplyScalar(0.99);
                
                // Clear forces
                body.force.set(0, 0, 0);
                body.torque.set(0, 0, 0);
            }
        });

        // Detect and resolve collisions
        const collisions = this.detectCollisions();
        this.resolveCollisions(collisions);

        // Integrate positions
        bodies.forEach(body => {
            if (body.type !== 'static') {
                // Integrate position
                body.position.add(body.velocity.clone().multiplyScalar(timeStep));
                
                // Integrate rotation (simplified)
                const angularDisplacement = body.angularVelocity.clone().multiplyScalar(timeStep);
                const quaternionChange = new THREE.Quaternion().setFromAxisAngle(
                    angularDisplacement.normalize(),
                    angularDisplacement.length()
                );
                body.quaternion.multiply(quaternionChange);
                body.quaternion.normalize();
                
                // Update mesh transform
                if (body.mesh) {
                    body.mesh.position.copy(body.position);
                    body.mesh.quaternion.copy(body.quaternion);
                }
            }
        });

        this.core.emit('physics:step', { timeStep: subStepTime, bodies: bodies.length });
    }

    /**
     * Raycast from origin in direction
     */
    raycast(origin, direction, maxDistance = 100) {
        const raycaster = new THREE.Raycaster(origin, direction, 0, maxDistance);
        const intersects = [];

        this.bodies.forEach(body => {
            if (body.mesh) {
                const intersection = raycaster.intersectObject(body.mesh, true);
                if (intersection.length > 0) {
                    intersects.push({
                        body,
                        intersection: intersection[0]
                    });
                }
            }
        });

        // Sort by distance
        intersects.sort((a, b) => a.intersection.distance - b.intersection.distance);
        
        return intersects;
    }

    /**
     * Get physics body for a mesh
     */
    getBody(mesh) {
        return this.bodies.get(mesh.uuid);
    }

    /**
     * Get all physics bodies
     */
    getBodies() {
        return Array.from(this.bodies.values());
    }

    /**
     * Set gravity
     */
    setGravity(gravity) {
        this.world.gravity.copy(gravity);
        this.core.emit('physics:gravity:changed', { gravity });
    }

    /**
     * Reset physics simulation
     */
    reset() {
        this.bodies.forEach(body => {
            body.velocity.set(0, 0, 0);
            body.angularVelocity.set(0, 0, 0);
            body.force.set(0, 0, 0);
            body.torque.set(0, 0, 0);
        });
        
        this.core.emit('physics:reset');
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.bodies.clear();
        this.constraints.clear();
        this.materials.clear();
        this.contactMaterials.clear();
        
        this.world = null;
        this.initialized = false;
        
        this.core.emit('physics:destroyed');
    }
}