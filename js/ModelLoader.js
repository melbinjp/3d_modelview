import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js';
import { TDSLoader } from 'three/addons/loaders/TDSLoader.js';
import { scene } from './SceneSetup.js';
// Import for side effects or direct calls. UIControls needs to be careful about circular dependencies if it imports ModelLoader.
// A more robust solution might use an event bus or have App.js mediate.
import { updateAnimationUI } from './UIControls.js';


/**
 * The currently loaded 3D model.
 * Custom properties `mixer`, `animationClips`, and `activeAction` may be added.
 * @type {THREE.Object3D & {mixer?: THREE.AnimationMixer, animationClips?: THREE.AnimationClip[], activeAction?: THREE.AnimationAction} | null}
 */
export let currentModel = null;

// DOM element for loading indication
const loadingIndicator = document.getElementById('loadingIndicator');

/**
 * Rotates the model to face the front.
 * @param {THREE.Object3D} model The model to rotate.
 */
export function setModelToFrontView(model) {
    if (model) {
        model.rotation.set(0, Math.PI, 0);
    }
}

/**
 * Sets up the loaded model: scales, centers, adds to scene, and initializes animations.
 * @param {THREE.Object3D & {animations?: THREE.AnimationClip[]}} model The model to set up. Note: GLTFLoader provides `animations` on the result object, not the scene object.
 */
export function setupModel(model) {
    if (!model) return;

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    const scale = (maxDim > 0.0001) ? (3 / maxDim) : 1;
    
    model.scale.set(1, 1, 1).multiplyScalar(scale);
    model.position.sub(center.multiplyScalar(scale));
    
    if (scene) {
        scene.add(model);
    }
    setModelToFrontView(model);
    
    // Pass the raw animations array from the loaded object (if present) to setupAnimations
    // currentModel (which is model here) will have .animationClips populated by setupAnimations
    setupAnimations(model, model.animations || []); 

    if (typeof updateAnimationUI === 'function') {
        updateAnimationUI(model); // Pass the model itself, which now has .mixer, .animationClips, .activeAction
    } else {
        console.warn("ModelLoader: updateAnimationUI function not found. Animation UI will not be updated.");
    }
}

/**
 * Loads a 3D model.
 * @param {THREE.Loader} loaderInstance An instance of a Three.js loader.
 * @param {string} url The URL or path to the model file.
 * @param {boolean} [isFile=false] True if the URL is a local file Object URL.
 */
export async function loadModelWithLoader(loaderInstance, url, isFile = false) {
    if (!loaderInstance || !url) {
        console.error("loadModelWithLoader: Loader instance or URL is missing.");
        if (isFile && url) URL.revokeObjectURL(url);
        return;
    }
    if (loadingIndicator) {
        loadingIndicator.textContent = 'Loading Model...';
        loadingIndicator.style.display = 'block';
    }

    if (typeof updateAnimationUI === 'function') {
        updateAnimationUI(null); // Clear previous animation UI
    }

    try {
        if (typeof loaderInstance.setOnProgress === 'function') {
            loaderInstance.setOnProgress(updateLoadingProgress);
        }

        const loadedData = await new Promise((resolve, reject) => {
            loaderInstance.load(url, resolve, undefined, reject);
        });
        
        if (currentModel && scene) {
            scene.remove(currentModel);
            if (currentModel.mixer) {
                currentModel.mixer.stopAllAction();
                // Consider uncacheRoot if issues with re-loading same model: currentModel.mixer.uncacheRoot(currentModel);
            }
            currentModel.traverse(child => { /* ... (geometry/material disposal) ... */ });
        }
        
        // GLTF/FBX loaders often return an object with .scene and .animations
        const modelScene = loadedData.scene || loadedData;
        const animations = loadedData.animations || modelScene.animations || []; // FBX might attach to scene

        currentModel = modelScene;
        // Explicitly attach the animations array to currentModel so setupModel/setupAnimations can use it.
        // This is crucial because `model.animations` is often a property of the loader's result, not the scene object itself.
        currentModel.animations = animations; 

        setupModel(currentModel); // This calls setupAnimations internally

    } catch (error) {
        console.error('Error loading model:', error);
        const filename = isFile ? url.substring(url.lastIndexOf('/') + 1) : url;
        alert(`Error loading model from ${decodeURIComponent(filename)}: ${error.message || 'Unknown error'}`);
        if (loadingIndicator) loadingIndicator.textContent = 'Error loading model.';
    } finally {
        if (isFile && url) URL.revokeObjectURL(url);
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
            loadingIndicator.textContent = 'Loading Model...';
        }
    }
}

export const gltfLoader = new GLTFLoader();
export const objLoader = new OBJLoader();
export const stlLoader = new STLLoader();
export const fbxLoader = new FBXLoader();
export const colladaLoader = new ColladaLoader();
export const tdsLoader = new TDSLoader();

/**
 * Returns the currently loaded 3D model.
 * @returns {THREE.Object3D & {mixer?: THREE.AnimationMixer, animationClips?: THREE.AnimationClip[], activeAction?: THREE.AnimationAction, animations?: THREE.AnimationClip[]} | null} The current model.
 */
export function getCurrentModel() {
    return currentModel;
}

/**
 * Sets up animations for the given model.
 * @param {THREE.Object3D & {mixer?: THREE.AnimationMixer, animationClips?: THREE.AnimationClip[], activeAction?: THREE.AnimationAction}} model The model object.
 * @param {THREE.AnimationClip[]} animationSource Array of animation clips (e.g., from `gltf.animations`).
 */
function setupAnimations(model, animationSource) {
    model.animationClips = animationSource || []; // Store the raw clips for UI population

    if (model.animationClips && model.animationClips.length > 0) {
        model.mixer = new THREE.AnimationMixer(model);
        
        // Play the first animation by default and set it as activeAction
        const firstClip = model.animationClips[0];
        model.activeAction = model.mixer.clipAction(firstClip);
        model.activeAction.play();
    } else {
        model.mixer = undefined;
        model.activeAction = undefined;
        // model.animationClips is already set to empty array or source
    }
}

/**
 * Updates model animations.
 * @param {number} delta Time delta.
 */
export function updateAnimations(delta) {
    if (currentModel && currentModel.mixer) {
        currentModel.mixer.update(delta);
    }
}

/**
 * Returns the appropriate Three.js loader.
 * @param {string} extension File extension.
 * @returns {THREE.Loader | null} A loader instance or null.
 */
export function getLoaderForExtension(extension) {
    // ... (implementation unchanged)
    const ext = extension.toLowerCase();
    switch (ext) {
        case 'glb':
        case 'gltf':
            return gltfLoader;
        case 'obj':
            return objLoader;
        case 'stl':
            return stlLoader;
        case 'fbx':
            return fbxLoader;
        case 'dae':
            return colladaLoader;
        case '3ds':
            return tdsLoader;
        default:
            console.warn(`Unsupported file extension for loading: .${ext}`);
            return null;
    }
}

function updateLoadingProgress(xhr) { /* ... (implementation unchanged) ... */ }
export function updateCurrentModel(newModel) { currentModel = newModel; }
export function toggleWireframe(enabled) { /* ... (implementation unchanged) ... */ }
