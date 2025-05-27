import * as THREE from 'three';
import { getCurrentModel } from './ModelLoader.js';
import { controls, camera, rotateClockwise as sceneRotateClockwise } from './SceneSetup.js'; // Import camera
import { smoothRotateToAngle, animateCameraFOV } from './Utils.js'; // Import utilities

/** 
 * Indicates whether superhero mode is currently active.
 * @type {boolean} 
 */
export let superheroModeActive = false;

/** 
 * Current rotation speed of the model in superhero mode.
 * @type {number} 
 */
let heroRotationSpeed = 0;

/** Maximum rotation speed in superhero mode. */
const MAX_SPEED = 0.5;
/** Acceleration rate for superhero mode rotation. */
const ACCELERATION = 0.02;
/** Deceleration rate when stopping superhero mode. */
const DECELERATION_RATE = 0.05; // Faster than acceleration for a quicker stop feel
/** Speed threshold to consider rotation stopped. */
const SPEED_THRESHOLD = 0.005;


/** 
 * The angle (in degrees) at which the model should stop when exiting superhero mode.
 * @type {number} 
 */
let heroStopAngle = 0;

// DOM Elements
const superheroButton = document.getElementById('superheroButton');
const heroStopAngleSlider = document.getElementById('heroStopAngle');
const heroStopAngleValueDisplay = document.getElementById('heroStopAngleValue');
const modelViewerDiv = document.getElementById('modelViewer');

/** @type {HTMLAudioElement | null} */
export const heroMusic = document.getElementById('heroMusic');
/** @type {HTMLElement | null} */
export const previewButton = document.getElementById('previewSound');
/** @type {HTMLElement | null} */
export const defaultAudioIndicator = document.querySelector('.default-audio-indicator');

/** @type {boolean} */
let currentRotateClockwise = sceneRotateClockwise;

// FOV settings
let originalFOV;
const ZOOMED_FOV_OFFSET = 15; // How much to zoom in
const FOV_ANIMATION_DURATION = 400; // ms

// State flags for managing animation phases
let isDecelerating = false;
let isSmoothingAngle = false;


/**
 * Gets the current rotation direction.
 * @returns {boolean} True if rotating clockwise (left).
 */
export function getRotateClockwise() {
    return currentRotateClockwise;
}

/**
 * Sets the rotation direction.
 * @param {boolean} isClockwise True for clockwise (left).
 */
export function setRotateClockwise(isClockwise) {
    currentRotateClockwise = isClockwise;
}

/**
 * Updates the model's rotation based on superhero mode state (accelerating, decelerating, or active rotation).
 * @param {THREE.Object3D | null} model The current 3D model.
 */
function updateSuperheroRotation(model) {
    if (!model) return;

    if (isDecelerating) {
        heroRotationSpeed -= DECELERATION_RATE;
        if (heroRotationSpeed <= SPEED_THRESHOLD) {
            heroRotationSpeed = 0;
            isDecelerating = false;
            // Now that speed is zero, smoothly rotate to the final stop angle
            const angleDegrees = (heroStopAngleSlider instanceof HTMLInputElement) ? parseInt(heroStopAngleSlider.value) : 0;
            const effectiveAngleOffsetDegrees = currentRotateClockwise ? angleDegrees : -angleDegrees;
            const frontViewRadians = Math.PI;
            const stopAngleOffsetRadians = effectiveAngleOffsetDegrees * (Math.PI / 180);
            
            let currentYRotation = model.rotation.y % (2 * Math.PI);
            if (currentYRotation < 0) currentYRotation += (2 * Math.PI);

            let targetYRotation = frontViewRadians + stopAngleOffsetRadians;
            // No need to normalize targetYRotation here, smoothRotateToAngle will find shortest path

            isSmoothingAngle = true; // Disable further hero rotation updates
            smoothRotateToAngle(model, targetYRotation, 500, () => {
                isSmoothingAngle = false;
                if (controls) controls.enabled = true; // Re-enable controls after smooth stop
                
                // Play hero music and update button text after smooth stop
                if (heroMusic instanceof HTMLAudioElement) {
                    heroMusic.currentTime = 0;
                    heroMusic.play().catch(e => console.error("SuperheroMode: Error playing hero music:", e));
                }
                if (previewButton) previewButton.textContent = 'Stop Sound';

                // Update button text to show it's no longer active
                if (superheroButton) superheroButton.textContent = 'Enable Superhero Mode';
                if (superheroButton) superheroButton.style.filter = ''; // Reset button style
            });
        }
    }

    // Apply rotation only if active and not in a final smoothing phase or already stopped
    if (superheroModeActive && !isDecelerating && !isSmoothingAngle && heroRotationSpeed > 0) {
        heroRotationSpeed = Math.min(heroRotationSpeed + ACCELERATION, MAX_SPEED);
    }
    
    // Only apply rotation if speed is significant and not currently smoothing the final angle
    if (heroRotationSpeed > 0 && !isSmoothingAngle) {
        const direction = currentRotateClockwise ? 1 : -1;
        model.rotation.y += heroRotationSpeed * direction;
    }
}

/**
 * Initializes event listeners and UI for the superhero mode feature.
 */
export function initSuperheroMode() {
    if (!superheroButton || !heroStopAngleSlider || !heroStopAngleValueDisplay || !heroMusic || !previewButton || !defaultAudioIndicator || !modelViewerDiv) {
        console.warn("SuperheroMode: One or more UI elements for superhero mode were not found. Skipping initialization.");
        return;
    }
    if (camera) { // Store original FOV if camera is available
        originalFOV = camera.fov;
    } else {
        console.warn("SuperheroMode: Camera not available at init. FOV animation might not work.");
        originalFOV = 75; // Default fallback
    }


    superheroButton.addEventListener('click', () => {
        const model = getCurrentModel();
        if (!model) {
            console.warn("SuperheroMode: Cannot toggle mode, no model loaded.");
            return;
        }
        if (!camera) {
            console.warn("SuperheroMode: Camera not available. Cannot animate FOV.");
            // Potentially try to re-fetch camera if it was not available at init
            // if (typeof getSceneCamera === 'function') camera = getSceneCamera(); 
        }

        superheroModeActive = !superheroModeActive;
        isSmoothingAngle = false; // Reset smoothing flag on any toggle

        if (superheroModeActive) {
            superheroButton.textContent = 'Slow Down!';
            superheroButton.style.filter = 'brightness(1.3) saturate(1.5)'; // Enhanced button style
            modelViewerDiv.classList.add('superhero-active-viewport');
            if (camera) animateCameraFOV(camera, originalFOV - ZOOMED_FOV_OFFSET, FOV_ANIMATION_DURATION);

            const rotationSpeedSlider = document.getElementById('rotationSpeed');
            heroRotationSpeed = (rotationSpeedSlider instanceof HTMLInputElement) ? parseFloat(rotationSpeedSlider.value) * 0.01 : 0.01;
            heroRotationSpeed = Math.max(heroRotationSpeed, ACCELERATION); // Ensure some initial speed
            
            if (heroMusic instanceof HTMLAudioElement) {
                heroMusic.pause();
                heroMusic.currentTime = 0;
            }
            if (previewButton) previewButton.textContent = 'Play Sound';
            if (controls) controls.enabled = false;
            isDecelerating = false; // Ensure not decelerating when activating

        } else { // Starting deactivation process
            // Button text and style will be reset in smoothRotateToAngle's onComplete callback
            modelViewerDiv.classList.remove('superhero-active-viewport');
            if (camera) animateCameraFOV(camera, originalFOV, FOV_ANIMATION_DURATION);
            
            if (heroRotationSpeed > SPEED_THRESHOLD) { // Only decelerate if currently moving
                isDecelerating = true;
            } else { // If already very slow or stopped, just go to smooth angle adjustment
                isDecelerating = false;
                heroRotationSpeed = 0; // Ensure it's zero
                
                // Directly call the smooth stop logic if not moving much
                const angleDegrees = (heroStopAngleSlider instanceof HTMLInputElement) ? parseInt(heroStopAngleSlider.value) : 0;
                const effectiveAngleOffsetDegrees = currentRotateClockwise ? angleDegrees : -angleDegrees;
                const frontViewRadians = Math.PI;
                const stopAngleOffsetRadians = effectiveAngleOffsetDegrees * (Math.PI / 180);
                const targetYRotation = model.rotation.y + ( (frontViewRadians + stopAngleOffsetRadians) - (model.rotation.y % (2*Math.PI)) );


                isSmoothingAngle = true;
                smoothRotateToAngle(model, targetYRotation, 500, () => {
                    isSmoothingAngle = false;
                    if (controls) controls.enabled = true;
                    if (heroMusic instanceof HTMLAudioElement) {
                        heroMusic.currentTime = 0;
                        heroMusic.play().catch(e => console.error("SuperheroMode: Error playing hero music:", e));
                    }
                    if (previewButton) previewButton.textContent = 'Stop Sound';
                    if (superheroButton) superheroButton.textContent = 'Enable Superhero Mode';
                    if (superheroButton) superheroButton.style.filter = '';
                });
            }
        }
    });

    heroStopAngleSlider.addEventListener('input', (e) => {
        if (e.target instanceof HTMLInputElement && heroStopAngleValueDisplay) {
            const angle = parseInt(e.target.value);
            heroStopAngleValueDisplay.textContent = `${angle}°`;
            heroStopAngle = angle;

            if (!superheroModeActive && !isSmoothingAngle) { // Only preview if not active and not already smoothing
                const model = getCurrentModel();
                if (model) {
                    const autoRotateCheckbox = document.getElementById('autoRotate');
                    const wasAutoRotating = (autoRotateCheckbox instanceof HTMLInputElement) ? autoRotateCheckbox.checked : false;
                    if (wasAutoRotating && typeof window.setSceneAutoRotate === 'function') {
                        window.setSceneAutoRotate(false);
                    }

                    const effectiveAngleOffsetDegrees = currentRotateClockwise ? angle : -angle;
                    const frontViewRadians = Math.PI;
                    const stopAngleOffsetRadians = effectiveAngleOffsetDegrees * (Math.PI / 180);
                    
                    // Calculate target based on current rotation to ensure shortest path preview
                    let currentYRotation = model.rotation.y % (2 * Math.PI);
                    if (currentYRotation < 0) currentYRotation += (2 * Math.PI);

                    let targetYRotation = frontViewRadians + stopAngleOffsetRadians;
                    targetYRotation = targetYRotation % (2 * Math.PI);
                    if (targetYRotation < 0) targetYRotation += (2 * Math.PI);
                    
                    let diff = targetYRotation - currentYRotation;
                    if (diff > Math.PI) diff -= (2 * Math.PI);
                    if (diff < -Math.PI) diff += (2 * Math.PI);

                    model.rotation.y = currentYRotation + diff;


                    if (wasAutoRotating && typeof window.setSceneAutoRotate === 'function') {
                        setTimeout(() => window.setSceneAutoRotate(true), 50);
                    }
                }
            }
        }
    });

    // Custom Hero Sound Audio Input (no changes from previous version)
    const audioInput = document.getElementById('audioInput');
    if (audioInput instanceof HTMLInputElement) {
        audioInput.addEventListener('change', (e) => {
            if (e.target instanceof HTMLInputElement && e.target.files && e.target.files.length > 0) {
                const file = e.target.files[0];
                if (heroMusic instanceof HTMLAudioElement && defaultAudioIndicator) {
                    const audioUrl = URL.createObjectURL(file);
                    heroMusic.src = audioUrl;
                    defaultAudioIndicator.classList.add('hidden');
                    heroMusic.addEventListener('canplaythrough', () => URL.revokeObjectURL(audioUrl), { once: true });
                    heroMusic.addEventListener('error', () => URL.revokeObjectURL(audioUrl), { once: true });
                }
            }
        });
    }

    // Preview Sound Button (no changes from previous version)
    if (previewButton && heroMusic instanceof HTMLAudioElement) {
        const localHeroMusic = heroMusic;
        previewButton.addEventListener('click', () => {
            if (localHeroMusic.paused) {
                localHeroMusic.play().catch(err => console.error("SuperheroMode: Error playing preview sound:", err));
                previewButton.textContent = 'Stop Sound';
            } else {
                localHeroMusic.pause();
                localHeroMusic.currentTime = 0;
                previewButton.textContent = 'Play Sound';
            }
        });
        localHeroMusic.addEventListener('ended', () => {
            previewButton.textContent = 'Play Sound';
        });
    }
    
    // Click/Tap on Model Viewer to Exit Superhero Mode (no changes from previous version)
    if (modelViewerDiv) {
        const exitSuperheroHandler = (event) => {
            if (superheroModeActive && superheroButton instanceof HTMLButtonElement && !isSmoothingAngle && !isDecelerating) {
                if (event.target instanceof Node) {
                    const controlsPanel = document.querySelector('.controls');
                    const toggleControlsButton = document.getElementById('toggleControls');
                    if ((controlsPanel && controlsPanel.contains(event.target)) || 
                        (toggleControlsButton && toggleControlsButton.contains(event.target))) {
                        return;
                    }
                }
                event.preventDefault(); 
                event.stopPropagation();
                superheroButton.click();
            }
        };
        modelViewerDiv.addEventListener('click', exitSuperheroHandler);
        modelViewerDiv.addEventListener('touchstart', exitSuperheroHandler, { passive: false });
        modelViewerDiv.addEventListener('touchmove', (e) => {
            if (superheroModeActive) e.preventDefault();
        }, { passive: false });
    }
}

/** @returns {number} */
export function getHeroStopAngleValue() {
    return (heroStopAngleSlider instanceof HTMLInputElement) ? parseInt(heroStopAngleSlider.value) : 0;
}

/** @param {number} angle */
export function setHeroStopAngle(angle) {
    if (heroStopAngleSlider instanceof HTMLInputElement) heroStopAngleSlider.value = angle.toString();
    if (heroStopAngleValueDisplay) heroStopAngleValueDisplay.textContent = `${angle}°`;
    heroStopAngle = angle;
}

/** @param {number} angle */
export function updateHeroStopAngleSlider(angle) {
    if (heroStopAngleSlider instanceof HTMLInputElement) {
        heroStopAngleSlider.value = angle.toString();
    }
    if (heroStopAngleValueDisplay) {
        heroStopAngleValueDisplay.textContent = `${angle}°`;
    }
    heroStopAngle = angle;
}

/**
 * Animates the superhero mode rotation, deceleration, or smoothing.
 * @param {THREE.Object3D | null} model The current 3D model.
 */
export function animateSuperheroMode(model) {
    // Only call updateSuperheroRotation if mode is active OR if it's in the process of decelerating/smoothing
    if (superheroModeActive || isDecelerating || isSmoothingAngle) {
        updateSuperheroRotation(model);
    }
}

/** @returns {boolean} */
export function isSuperheroModeActive() {
    return superheroModeActive;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSuperheroMode);
} else {
    initSuperheroMode();
}
