import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/** 
 * The main Three.js scene.
 * @type {THREE.Scene | undefined} 
 */
export let scene;

/** 
 * The main Three.js camera.
 * @type {THREE.PerspectiveCamera | undefined} 
 */
export let camera;

/** 
 * The Three.js WebGL renderer.
 * @type {THREE.WebGLRenderer | undefined} 
 */
export let renderer;

/** 
 * The OrbitControls for camera manipulation.
 * @type {OrbitControls | undefined} 
 */
export let controls;

/** 
 * The ambient light in the scene.
 * @type {THREE.AmbientLight | undefined} 
 */
export let ambientLight;

/** 
 * The directional light in the scene.
 * @type {THREE.DirectionalLight | undefined} 
 */
export let directionalLight;

/** 
 * Flag to enable or disable auto-rotation of the model.
 * @type {boolean} 
 */
export let autoRotateEnabled = true;

/** 
 * Flag to determine rotation direction. false for right (default), true for left.
 * @type {boolean} 
 */
export let rotateClockwise = false;

// The main container for the 3D model viewer.
const container = document.getElementById('modelViewer');

/**
 * Initializes the Three.js scene, camera, renderer, lights, and controls.
 * Displays an alert and throws an error if WebGL renderer initialization fails.
 */
export function initScene() {
    if (!container) {
        console.error("SceneSetup: The 'modelViewer' container element was not found in the DOM.");
        alert("Error: The application container is missing. Cannot initialize the 3D scene.");
        throw new Error("Application container 'modelViewer' not found.");
    }

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    try {
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setClearColor(0xf0f0f0); // Default background color
        container.appendChild(renderer.domElement);
    } catch (error) {
        console.error("SceneSetup: Error initializing WebGL Renderer:", error);
        alert("Error: WebGL is not supported or enabled in your browser. Please use a modern browser with WebGL enabled to view 3D content.");
        // Remove the container's content or display a message within it
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        const errorMessageDiv = document.createElement('div');
        errorMessageDiv.style.padding = '20px';
        errorMessageDiv.style.textAlign = 'center';
        errorMessageDiv.innerHTML = '<h3>WebGL Not Supported</h3><p>This application requires WebGL to display 3D content. Please ensure your browser supports WebGL and it is enabled.</p>';
        container.appendChild(errorMessageDiv);
        throw error; // Re-throw the error to stop further script execution if critical
    }

    ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true;
    controls.panSpeed = 1.0;
    controls.screenSpacePanning = true;
    controls.enableRotate = true; // Default orbit controls enabled
    controls.rotateSpeed = 1.0;

    window.addEventListener('resize', onWindowResize, false);
}

/**
 * Handles window resize events to update camera aspect ratio and renderer size.
 */
export function onWindowResize() {
    if (camera && renderer && container && container.clientWidth > 0 && container.clientHeight > 0) {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
}

/**
 * The main animation loop function, primarily handling auto-rotation.
 * Superhero mode rotation is handled in SuperheroMode.js and called from App.js.
 * @param {THREE.Object3D | null} currentModel The model currently loaded in the scene.
 * @param {boolean} isSuperheroModeActive Indicates if superhero mode is active.
 * @param {number} [rotationSpeedUIValue] Current value from the rotation speed UI slider (if applicable).
 *                                         This parameter might be simplified if App.js directly reads it.
 */
export function animate(currentModel, isSuperheroModeActive, rotationSpeedUIValue) {
    // requestAnimationFrame is called by the App.js's animation loop.
    // This function is now more of an "updateScene" called within that loop.
    if (controls) controls.update();

    if (currentModel && !isSuperheroModeActive && autoRotateEnabled) {
        const direction = rotateClockwise ? 1 : -1;
        // Use provided UI value or default if not available (e.g., element not found)
        const speed = rotationSpeedUIValue !== undefined ? rotationSpeedUIValue : 
                      (document.getElementById('rotationSpeed') ? parseFloat(document.getElementById('rotationSpeed').value) : 1);
        currentModel.rotation.y += speed * 0.01 * direction;
    }

    // Renderer.render is called by App.js after all updates.
}

/**
 * Sets the auto-rotation state.
 * @param {boolean} enabled True to enable auto-rotation, false to disable.
 */
export function setAutoRotateEnabled(enabled) {
    autoRotateEnabled = enabled;
}

/**
 * Sets the direction of auto-rotation.
 * @param {boolean} clockwise True for clockwise (left), false for counter-clockwise (right).
 */
export function setRotationDirection(clockwise) {
    rotateClockwise = clockwise;
}

/**
 * Sets the background color of the scene.
 * @param {string | number | THREE.Color} color The color to set for the background.
 */
export function setBackgroundColor(color) {
    if (renderer) renderer.setClearColor(color);
}

/**
 * Sets the intensity of the ambient light.
 * @param {number} intensity The intensity value.
 */
export function setAmbientLightIntensity(intensity) {
    if (ambientLight) ambientLight.intensity = intensity;
}

/**
 * Sets the intensity of the directional light.
 * @param {number} intensity The intensity value.
 */
export function setDirectionalLightIntensity(intensity) {
    if (directionalLight) directionalLight.intensity = intensity;
}

/**
 * Enables or disables orbit controls.
 * @param {boolean} enabled True to enable, false to disable.
 */
export function setOrbitControlsEnabled(enabled) {
    if (controls) {
        controls.enabled = enabled;
    }
}

/**
 * Enables or disables panning for orbit controls.
 * @param {boolean} enabled True to enable, false to disable.
 */
export function setPanEnabled(enabled) {
    if (controls) {
        controls.enablePan = enabled;
        controls.screenSpacePanning = enabled; // Often linked with enablePan
    }
}
