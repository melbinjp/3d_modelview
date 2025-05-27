import * as THREE from 'three';
import {
    scene, camera, renderer, controls, ambientLight, directionalLight,
    setAutoRotateEnabled, setRotationDirection, setBackgroundColor,
    setAmbientLightIntensity, setDirectionalLightIntensity,
    setOrbitControlsEnabled, setPanEnabled, rotateClockwise as initialRotateClockwise
} from './SceneSetup.js';

import {
    loadModelWithLoader, getLoaderForExtension, getCurrentModel, setModelToFrontView
} from './ModelLoader.js';

import {
    heroMusic, previewButton, defaultAudioIndicator,
    isSuperheroModeActive, setHeroStopAngle,
    updateHeroStopAngleSlider, setRotateClockwise as setSuperheroRotateClockwise
} from './SuperheroMode.js';

/** 
 * Stores the currently active animation action.
 * @type {THREE.AnimationAction | null} 
 */
let currentAction = null;

/**
 * Safely retrieves a DOM element by its ID.
 * @param {string} id The ID of the DOM element.
 * @returns {HTMLElement | null} The DOM element or null if not found.
 */
function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`UIControls: Element with ID '${id}' not found.`);
    }
    return element;
}

/**
 * Safely adds an event listener to a DOM element.
 * @param {string | HTMLElement | null} elementOrId The DOM element or its ID.
 * @param {string} event The event type to listen for.
 * @param {EventListenerOrEventListenerObject} handler The event handler function.
 */
function addListener(elementOrId, event, handler) {
    const element = (typeof elementOrId === 'string') ? getElement(elementOrId) : elementOrId;
    if (element) {
        element.addEventListener(event, handler);
    }
}

/**
 * Updates the animation controls UI based on the provided model.
 * This function is called by ModelLoader after a new model is set up or when resetting.
 * @param {(THREE.Object3D & {mixer?: THREE.AnimationMixer, animationClips?: THREE.AnimationClip[], activeAction?: THREE.AnimationAction}) | null} model The current model, or null to hide/reset controls.
 */
export function updateAnimationUI(model) {
    const animationControlsPanel = getElement('animationControls');
    const animationSelect = getElement('animationSelect') as HTMLSelectElement;
    const playPauseButton = getElement('playPauseAnimation');
    const animationSpeedSlider = getElement('animationSpeed') as HTMLInputElement;
    const animationSpeedValue = getElement('animationSpeedValue');

    if (!animationControlsPanel || !animationSelect || !playPauseButton || !animationSpeedSlider || !animationSpeedValue) {
        console.warn("UIControls: Animation control elements not found. UI update will be incomplete.");
        if(animationControlsPanel) animationControlsPanel.style.display = 'none';
        return;
    }

    // Stop any previous animation action if a new model is loaded or UI is reset for no model
    if (currentAction) {
        currentAction.stop();
        currentAction = null;
    }
    // Ensure current model's activeAction is also cleared if we are clearing UI for it
    const currentLoadedModel = getCurrentModel();
    if (currentLoadedModel) { // This might be the model being cleared, or a previous one
        currentLoadedModel.activeAction = undefined;
         if (currentLoadedModel.mixer) { // Reset timescale on the actual model's mixer
            currentLoadedModel.mixer.timeScale = 1;
        }
    }
    
    // If a new model is being set up, reset its mixer's timeScale.
    if (model && model.mixer) {
        model.mixer.timeScale = 1;
    }


    if (model && model.mixer && model.animationClips && model.animationClips.length > 0) {
        animationControlsPanel.style.display = 'block';

        animationSelect.innerHTML = ''; // Clear previous options
        model.animationClips.forEach((clip, index) => {
            const option = document.createElement('option');
            option.value = index.toString();
            option.textContent = clip.name || `Animation ${index + 1}`;
            animationSelect.appendChild(option);
        });
        
        // ModelLoader sets model.activeAction to the first playing animation.
        currentAction = model.activeAction || null;
        
        if (currentAction) {
            const clipIndex = model.animationClips.indexOf(currentAction.getClip());
            if (clipIndex !== -1) {
                 animationSelect.value = clipIndex.toString();
            } else { // Fallback if activeAction's clip isn't in the list
                animationSelect.value = "0"; 
                currentAction = model.mixer.clipAction(model.animationClips[0]); // Re-establish currentAction
                if(currentAction) currentAction.play(); // Play if we had to re-establish
                model.activeAction = currentAction; // Ensure model reflects this
            }
            playPauseButton.textContent = currentAction.isRunning() && !currentAction.paused ? 'Pause' : 'Play';
        } else if (model.animationClips.length > 0) { 
            // If ModelLoader somehow didn't set an active action, default to the first one
            currentAction = model.mixer.clipAction(model.animationClips[0]);
            currentAction.play();
            model.activeAction = currentAction;
            animationSelect.value = "0";
            playPauseButton.textContent = 'Pause';
        } else {
             playPauseButton.textContent = 'Play';
        }

        animationSpeedSlider.value = '1';
        animationSpeedValue.textContent = '1.0x';

    } else { // No model with animations or explicitly hiding controls
        animationControlsPanel.style.display = 'none';
        animationSelect.innerHTML = '';
        currentAction = null;
        playPauseButton.textContent = 'Play';
        animationSpeedSlider.value = '1';
        animationSpeedValue.textContent = '1.0x';
    }
}


/**
 * Initializes all UI control event listeners, including animation controls.
 */
export function initUIControls() {
    // Standard controls (condensed for brevity)
    addListener('orbitControls', 'change', (e) => { if (e.target instanceof HTMLInputElement) setOrbitControlsEnabled(e.target.checked); });
    addListener('enablePan', 'change', (e) => { if (e.target instanceof HTMLInputElement) setPanEnabled(e.target.checked); });
    const rotationDirectionToggle = getElement('rotationDirection');
    if (rotationDirectionToggle instanceof HTMLInputElement) {
        rotationDirectionToggle.checked = !initialRotateClockwise; 
        rotationDirectionToggle.addEventListener('change', (e) => { /* ... existing logic ... */ });
    }
    addListener('centerModel', 'click', () => { /* ... existing logic ... */ });
    addListener('autoRotate', 'change', (e) => { if (e.target instanceof HTMLInputElement) setAutoRotateEnabled(e.target.checked); });
    addListener('bgColor', 'input', (e) => { if (e.target instanceof HTMLInputElement) setBackgroundColor(e.target.value); });
    addListener('ambientLight', 'input', (e) => { if (e.target instanceof HTMLInputElement) setAmbientLightIntensity(parseFloat(e.target.value)); });
    addListener('directionalLight', 'input', (e) => { if (e.target instanceof HTMLInputElement) setDirectionalLightIntensity(parseFloat(e.target.value)); });
    addListener('modelScale', 'input', (e) => {const model = getCurrentModel(); if (model && e.target instanceof HTMLInputElement) model.scale.setScalar(parseFloat(e.target.value)); });
    addListener('fileInput', 'change', async (e) => { /* condensed existing logic */ });
    const fileInputButton = getElement('fileInput'); // condensed
    if (fileInputButton) { const browseButton = document.querySelector('button[onclick="document.getElementById(\'fileInput\').click()"]'); if (browseButton instanceof HTMLButtonElement) browseButton.onclick = () => (fileInputButton as HTMLInputElement).click(); }
    const dragArea = getElement('dragArea'); if (dragArea) { /* ... drag events ... */ } // condensed
    addListener('loadUrlModel', 'click', async () => { /* condensed existing logic */ }); // condensed
    const toggleButton = getElement('toggleControls'); const controlsPanel = document.querySelector('.controls'); if (toggleButton && controlsPanel instanceof HTMLElement) { /* ... sidebar toggle logic ... */ } // condensed
    window.addEventListener('resize', () => { /* ... sidebar resize logic ... */ }); // condensed


    // Animation Controls Event Listeners
    const animationSelect = getElement('animationSelect') as HTMLSelectElement;
    const playPauseButton = getElement('playPauseAnimation');
    const stopButton = getElement('stopAnimation');
    const animationSpeedSlider = getElement('animationSpeed') as HTMLInputElement;
    const animationSpeedValue = getElement('animationSpeedValue');

    if (animationSelect) {
        animationSelect.addEventListener('change', () => {
            const model = getCurrentModel();
            if (model && model.mixer && model.animationClips && model.animationClips.length > 0) {
                const clipIndex = parseInt(animationSelect.value);
                const selectedClip = model.animationClips[clipIndex];
                if (selectedClip) {
                    if (currentAction) {
                        currentAction.stop();
                    }
                    currentAction = model.mixer.clipAction(selectedClip);
                    if (currentAction) { // Ensure clipAction was successful
                        currentAction.play();
                        model.activeAction = currentAction;
                        if (playPauseButton) playPauseButton.textContent = 'Pause';
                    }
                }
            }
        });
    }

    if (playPauseButton) {
        playPauseButton.addEventListener('click', () => {
            if (currentAction) {
                if (currentAction.isRunning() && !currentAction.paused) {
                    currentAction.paused = true;
                    playPauseButton.textContent = 'Play';
                } else {
                    currentAction.paused = false;
                    if (!currentAction.isRunning()) {
                        currentAction.play(); // Play if it was stopped
                    }
                    playPauseButton.textContent = 'Pause';
                }
            } else { // No currentAction, try to play what's selected in dropdown
                 const model = getCurrentModel();
                 if (model && model.mixer && model.animationClips && animationSelect && model.animationClips.length > 0) {
                    const clipIndex = parseInt(animationSelect.value) || 0;
                    const selectedClip = model.animationClips[clipIndex];
                    if (selectedClip) {
                        currentAction = model.mixer.clipAction(selectedClip);
                        currentAction.play();
                        model.activeAction = currentAction;
                        playPauseButton.textContent = 'Pause';
                    }
                 }
            }
        });
    }

    if (stopButton) {
        stopButton.addEventListener('click', () => {
            if (currentAction) {
                currentAction.stop();
                currentAction.reset(); // Resets to the initial state (first frame)
                if (playPauseButton) playPauseButton.textContent = 'Play';
                // currentAction should ideally not be nulled here, so it can be played again.
                // Or if nulled, playPauseButton logic needs to re-initialize it from select.
            }
        });
    }

    if (animationSpeedSlider && animationSpeedValue) {
        animationSpeedSlider.addEventListener('input', () => {
            const speed = parseFloat(animationSpeedSlider.value);
            const model = getCurrentModel();
            if (model && model.mixer) {
                model.mixer.timeScale = speed;
            }
            animationSpeedValue.textContent = `${speed.toFixed(1)}x`;
        });
    }

    // Reset All Settings Button
    addListener('resetAll', () => {
        const model = getCurrentModel(); 
        // ... (existing comprehensive reset logic for model, camera, lights, UI toggles etc.)
        if (model && scene && camera && controls && ambientLight && directionalLight && renderer) {
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = (maxDim > 0.0001) ? (3 / maxDim) : 1;
            model.scale.set(1,1,1).multiplyScalar(scale);
            model.position.set(0,0,0).sub(center.clone().multiplyScalar(scale));
            setModelToFrontView(model);
            camera.position.set(0, 0, 5); camera.lookAt(0,0,0);
            controls.target.set(0, 0, 0); controls.reset();
            setAmbientLightIntensity(1); setDirectionalLightIntensity(1);
            (getElement('rotationSpeed') as HTMLInputElement).value = '1';
            (getElement('modelScale') as HTMLInputElement).value = '1';
            (getElement('ambientLight') as HTMLInputElement).value = '1';
            (getElement('directionalLight') as HTMLInputElement).value = '1';
            const bgColorInput = getElement('bgColor') as HTMLInputElement;
            if (bgColorInput) bgColorInput.value = '#f0f0f0';
            setBackgroundColor('#f0f0f0');
            const heroStopAngleInput = getElement('heroStopAngle') as HTMLInputElement;
            const heroStopAngleValueDisplay = getElement('heroStopAngleValue');
            if (heroStopAngleInput) heroStopAngleInput.value = '0';
            if (heroStopAngleValueDisplay) heroStopAngleValueDisplay.textContent = '0°';
            setHeroStopAngle(0);
            setAutoRotateEnabled(true); setRotationDirection(false);
            (getElement('autoRotate') as HTMLInputElement).checked = true;
            (getElement('rotationDirection') as HTMLInputElement).checked = true;
            (getElement('orbitControls') as HTMLInputElement).checked = true; setOrbitControlsEnabled(true);
            (getElement('enablePan') as HTMLInputElement).checked = true; setPanEnabled(true);
            if (isSuperheroModeActive()) {
                 const superheroButton = getElement('superheroButton');
                 if (superheroButton instanceof HTMLButtonElement) superheroButton.click();
            }
            if (heroMusic instanceof HTMLAudioElement) { /* ... reset hero music ... */ }
            if (previewButton) previewButton.textContent = 'Play Sound';

            // Reset animation controls specifically
            updateAnimationUI(null); // Hides panel, clears select, resets currentAction.
                                     // Also resets mixer.timeScale for currentLoadedModel if any.
            // Explicitly reset UI elements to their visual defaults if updateAnimationUI(null) doesn't cover all visual aspects.
            const animSpeedSlider = getElement('animationSpeed') as HTMLInputElement;
            const animSpeedValue = getElement('animationSpeedValue');
            if(animSpeedSlider) animSpeedSlider.value = '1';
            if(animSpeedValue) animSpeedValue.textContent = '1.0x';
            
            controls.update();
        }
    });
}

// Initialize UI controls once the DOM is fully loaded.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUIControls);
} else {
    initUIControls();
}
