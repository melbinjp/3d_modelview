import * as THREE from 'three';

/**
 * Smoothly animates the rotation of a model to a target angle.
 * @param {THREE.Object3D} model The model to rotate.
 * @param {number} targetAngle The target Y rotation angle in radians.
 * @param {number} duration The duration of the animation in milliseconds.
 * @param {function(): void} [onComplete] Optional callback when animation completes.
 */
export function smoothRotateToAngle(model, targetAngle, duration, onComplete) {
    if (!model) {
        if (onComplete) onComplete();
        return;
    }

    const startAngle = model.rotation.y;
    const startTime = Date.now();

    // Normalize angles to avoid excessive spinning
    // Ensure targetAngle and startAngle are in a comparable range (e.g. -PI to PI or 0 to 2PI)
    // This helps find the shortest path.
    const twoPi = Math.PI * 2;
    const currentRotation = model.rotation.y % twoPi;
    let delta = (targetAngle % twoPi) - currentRotation;

    // Choose the shortest direction to rotate
    if (delta > Math.PI) {
        delta -= twoPi;
    } else if (delta < -Math.PI) {
        delta += twoPi;
    }
    const finalTargetAngle = currentRotation + delta;


    function animate() {
        const now = Date.now();
        const progress = Math.min((now - startTime) / duration, 1); // Cap progress at 1

        model.rotation.y = THREE.MathUtils.lerp(startAngle, finalTargetAngle, progress);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            model.rotation.y = finalTargetAngle; // Ensure exact final angle
            if (onComplete) {
                onComplete();
            }
        }
    }
    requestAnimationFrame(animate);
}


/**
 * Smoothly animates the Field of View (FOV) of a perspective camera.
 * @param {THREE.PerspectiveCamera} camera The camera to animate.
 * @param {number} targetFOV The target Field of View.
 * @param {number} duration The duration of the animation in milliseconds.
 * @param {function(): void} [onComplete] Optional callback when animation completes.
 */
export function animateCameraFOV(camera, targetFOV, duration, onComplete) {
    if (!camera || typeof camera.isPerspectiveCamera === 'undefined' || !camera.isPerspectiveCamera) {
        console.error("animateCameraFOV: Provided camera is not a THREE.PerspectiveCamera.");
        if (onComplete) onComplete();
        return;
    }

    const startFOV = camera.fov;
    const startTime = Date.now();

    function animate() {
        const now = Date.now();
        const progress = Math.min((now - startTime) / duration, 1); // Cap progress at 1

        camera.fov = THREE.MathUtils.lerp(startFOV, targetFOV, progress);
        camera.updateProjectionMatrix(); // Crucial for FOV changes to take effect

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            camera.fov = targetFOV; // Ensure exact final FOV
            camera.updateProjectionMatrix();
            if (onComplete) {
                onComplete();
            }
        }
    }
    requestAnimationFrame(animate);
}
