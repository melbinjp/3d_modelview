import * as THREE from 'three'; // Needed for THREE.Clock
import {
    initScene,
    animate as animateScene, // Renamed to avoid conflict with local animate function
    // onWindowResize, // onWindowResize is handled internally by SceneSetup
    scene, camera, renderer, // Imported for potential direct access or debugging
    setAutoRotateEnabled // Exposed by SceneSetup to be globally available if needed
} from './SceneSetup.js';

import {
    loadModelWithLoader,
    // gltfLoader, // Specific loader instances are handled by getLoaderForExtension
    getCurrentModel,
    updateAnimations, // For handling model-specific animations (e.g., GLTF skeletal animations)
    getLoaderForExtension // Utility to get the correct loader based on file extension
} from './ModelLoader.js';

import { initUIControls } from './UIControls.js';

import {
    initSuperheroMode,
    animateSuperheroMode, // Specific animation logic for superhero mode
    isSuperheroModeActive
    // Superhero mode's internal constants (MAX_SPEED, ACCELERATION) are managed within SuperheroMode.js
} from './SuperheroMode.js';

/** 
 * THREE.Clock instance for managing animation timing.
 * @type {THREE.Clock}
 */
const clock = new THREE.Clock();

/**
 * Initializes the entire 3D application.
 * This function sets up the scene, UI controls, superhero mode, loads a default model,
 * and starts the animation loop.
 * It also exposes a global function `window.setSceneAutoRotate` for inter-module communication.
 * @async
 */
async function init() {
    try {
        initScene(); // Initialize scene, camera, renderer, lights, basic controls
    } catch (error) {
        console.error("App.js: Critical error during scene initialization. Application cannot start.", error);
        // Further error display might already be handled by initScene (e.g., WebGL failure)
        return; // Stop initialization if scene setup fails
    }
    
    initUIControls(); // Initialize all UI control event listeners
    initSuperheroMode(); // Initialize superhero mode listeners and UI

    // Load a default model to display initially
    const defaultModelUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb';
    const defaultModelExtension = 'glb';
    const loaderInstance = getLoaderForExtension(defaultModelExtension); 
    
    if (loaderInstance) {
        try {
            await loadModelWithLoader(loaderInstance, defaultModelUrl, false); // isFile = false for URL
        } catch (e) {
            // Error is already handled and alerted by loadModelWithLoader
            console.error(`App.js: Failed to load default model from ${defaultModelUrl}`, e);
        }
    } else {
        console.error(`App.js: Default loader for .${defaultModelExtension} files not found! Cannot load default model.`);
        alert("Could not initialize the default 3D model. The viewer may be empty.");
    }
    
    // Expose setSceneAutoRotate to SuperheroMode or other modules if they need to toggle it.
    // This provides a simple way for modules to affect SceneSetup's autoRotateEnabled state.
    // A more robust solution for larger apps might involve a dedicated state manager or event bus.
    if (typeof setAutoRotateEnabled === 'function') {
        window.setSceneAutoRotate = setAutoRotateEnabled;
    } else {
        console.warn("App.js: setAutoRotateEnabled function not found in SceneSetup. Global control for auto-rotate will not be available.");
    }

    startAnimationLoop(); // Start the main animation loop after everything is initialized
}

/**
 * Starts the main animation loop for the application.
 * This loop handles rendering the scene, updating controls, model animations,
 * and superhero mode effects.
 */
function startAnimationLoop() {
    // Defines the function to be called for each animation frame
    const animateCallback = () => {
        requestAnimationFrame(animateCallback); // Schedule the next frame
        const delta = clock.getDelta(); // Time elapsed since the last frame

        const currentModel = getCurrentModel();

        // 1. Update scene elements (OrbitControls, basic auto-rotation if not in superhero mode)
        // The 'animateScene' function in SceneSetup now primarily handles OrbitControls.update()
        // and non-superhero auto-rotation.
        // The rotationSpeedUIValue is read within SceneSetup's animate function directly from the DOM for simplicity.
        if (typeof animateScene === 'function') {
            animateScene(currentModel, isSuperheroModeActive());
        }

        // 2. Update model-specific animations (e.g., skeletal animations from GLTF/FBX)
        if (typeof updateAnimations === 'function') {
            updateAnimations(delta);
        }

        // 3. Update superhero mode specific animations/rotations
        if (isSuperheroModeActive() && typeof animateSuperheroMode === 'function' && currentModel) {
            animateSuperheroMode(currentModel);
        }
        
        // 4. Render the scene
        // Ensure renderer, scene, and camera are available before rendering
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    };
    animateCallback(); // Start the loop
}

/**
 * Main entry point for the application.
 * Waits for the DOM to be fully loaded before initializing.
 * @async
 */
(async () => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOMContentLoaded has already fired
        init();
    }
})();
