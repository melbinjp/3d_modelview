import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'; // Keep if OBJ is still a target
// import { STLLoader } from 'three/addons/loaders/STLLoader.js'; // Keep if STL is still a target
// import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'; // Keep if FBX is still a target
// import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js'; // Keep if DAE is still a target
// import { TDSLoader } from 'three/addons/loaders/TDSLoader.js'; // Keep if 3DS is still a target

let scene, camera, renderer, controls;
let currentModel = null;
let ambientLight, directionalLight;
let originalEmissiveColors = new Map(); 
// let savedCameraViews = {}; // Removed as UI is gone

// Auto-rotation variables - Keep Y-axis rotation as a default behavior for now
let autoRotateYEnabled = true; // Default to true, can be changed by future UI
// let autoRotateXEnabled = false; // Removed
// let autoRotateZEnabled = false; // Removed
let rotateClockwise = true; // Default direction
// let heroStopAngle = (45 * Math.PI) / 180; // Related to Superhero UI, keep if feature is kept

// Y-Axis Sweep variables - Removed as UI is gone
// let ySweepEnabled = false;
// let sweepAngleMax = 45 * (Math.PI / 180); 
// let sweepSpeedFactor = 1.0;
// let sweepDirection = 1; 
// let modelBaseRotationY = 0; 

// Superhero mode variables - Keep for future reintegration
let superheroModeActive = false;
let rotationSpeed = 0; // This is for superhero mode's own speed ramping
const MAX_SPEED = 0.5;
const ACCELERATION = 0.02;

const container = document.getElementById('modelViewer');
const loadingIndicator = document.getElementById('loadingIndicator');
// const superheroButton = document.getElementById('superheroButton'); // Removed
// const previewButton = document.getElementById('previewSound'); // Removed
// const heroMusic = document.getElementById('heroMusic'); // Removed, but sound logic might be kept if needed
// const defaultAudioIndicator = document.querySelector('.default-audio-indicator'); // Removed
// const currentModelAngleDisplay = document.getElementById('currentModelAngleDisplay'); // Removed

// Rotation Animation DOM Elements - Removed
// const autoRotateYCheckbox = document.getElementById('autoRotateY');
// const autoRotateXCheckbox = document.getElementById('autoRotateX');
// const autoRotateZCheckbox = document.getElementById('autoRotateZ');
// const rotationDirectionCheckbox = document.getElementById('rotationDirection'); 
// const rotationSpeedSlider = document.getElementById('rotationSpeed'); 

// Y-Axis Sweep DOM Elements - Removed
// const enableYSweepCheckbox = document.getElementById('enableYSweep');
// const sweepControlsContainer = document.getElementById('sweepControlsContainer');
// const sweepAngleMaxSlider = document.getElementById('sweepAngleMax');
// const sweepAngleMaxValueDisplay = document.getElementById('sweepAngleMaxValueDisplay');
// const sweepSpeedFactorSlider = document.getElementById('sweepSpeedFactor');
// const sweepSpeedFactorValueDisplay = document.getElementById('sweepSpeedFactorValueDisplay');

// Image to 2.5D DOM Elements & Variables - Removed
// const imageTo3DInput = document.getElementById('imageTo3DInput');
// const extrusionDepthSlider = document.getElementById('extrusionDepth');
// const extrusionDepthValue = document.getElementById('extrusionDepthValue');
// const extrusionColorPicker = document.getElementById('extrusionColor');
// const generate25DModelBtn = document.getElementById('generate25DModelBtn');
// const clear25DModelBtn = document.getElementById('clear25DModelBtn');
// const imageProcessingCanvas = document.getElementById('imageProcessingCanvas');
// const ctx = imageProcessingCanvas ? imageProcessingCanvas.getContext('2d') : null; // Conditional context
// let currentImageFor25D = null; // Removed
// let generated25DModel = null; // Removed

// Simple/Advanced Mode DOM Elements - Removed
// const toggleAdvancedSettingsBtn = document.getElementById('toggleAdvancedSettingsBtn');
// const advancedControlsContainer = document.getElementById('advancedControlsContainer');
// const resetSimpleViewBtn = document.getElementById('resetSimpleViewBtn');

// Master UI Toggle (New)
const masterUiToggleBtn = document.getElementById('master-ui-toggle'); // Renamed for clarity from instructions
let inactivityTimer;
const INACTIVITY_TIMEOUT = 3000; // 3 seconds

function hideMasterToggle() {
    if (masterUiToggleBtn) {
        masterUiToggleBtn.classList.add('hidden');
    }
}

function showMasterToggle() {
    if (masterUiToggleBtn) {
        masterUiToggleBtn.classList.remove('hidden');
    }
}

function resetInactivityTimer() {
    showMasterToggle(); 
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(hideMasterToggle, INACTIVITY_TIMEOUT);
}

if (masterUiToggleBtn) {
    masterUiToggleBtn.addEventListener('click', () => {
        // Placeholder for future UI toggle logic
        console.log('Master UI Toggle clicked. Implement main UI show/hide logic here.');
        alert("UI Toggle Clicked - Future UI will be handled here.");
        resetInactivityTimer(); // Reset timer on click as it's an activity
    });

    // Initial setup for auto-hide
    resetInactivityTimer(); 
}

// Global event listeners for activity
window.addEventListener('mousemove', resetInactivityTimer);
window.addEventListener('keydown', resetInactivityTimer);
window.addEventListener('touchstart', resetInactivityTimer, { passive: true });


(async () => {
    await init();
    animate();
})();

async function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0xf0f0f0); // Default background, can be changed by future UI
    container.appendChild(renderer.domElement);

    // Basic lighting
    ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Adjusted intensity
    scene.add(ambientLight);
    directionalLight = new THREE.DirectionalLight(0xffffff, 0.6); // Adjusted intensity
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = true; // Default pan to true
    controls.screenSpacePanning = true;
    controls.enableRotate = true; // Default rotate to true

    // Removed 'enablePan' event listener as UI is gone

    // Load default model
    const defaultUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb';
    await loadModelWithLoader(new GLTFLoader(), defaultUrl);
    window.addEventListener('resize', onWindowResize, false);
}

// Removed window.addEventListener('load', ...) for old sidebar toggle

function animate() {
    requestAnimationFrame(animate);
    controls.update();

    if (currentModel) {
        // Default Y-axis rotation if enabled
        if (autoRotateYEnabled && !superheroModeActive) { // Check superheroModeActive to prevent conflict
            const rotationVal = 0.01; // Default speed, can be exposed by future UI
            const direction = rotateClockwise ? 1 : -1;
            currentModel.rotation.y += rotationVal * direction;
        }

        // Superhero mode rotation (Y-axis only for now)
        if (superheroModeActive) {
            const superheroEffectiveSpeed = Math.min(rotationSpeed + ACCELERATION, MAX_SPEED); // rotationSpeed is for superhero mode
            const direction = rotateClockwise ? 1 : -1; // Use global rotateClockwise
            currentModel.rotation.y += superheroEffectiveSpeed * direction;
        }
        
        // Removed currentModelAngleDisplay update as UI element is gone
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    if (camera && renderer) {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
}

function setModelToFrontView(model) {
    if (model) {
        model.rotation.set(0, Math.PI, 0);
    }
}

// Removed audioInput event listener as UI is gone

async function loadModelWithLoader(loader, url, isFile = false) {
    // if (generated25DModel) { // generated25DModel is removed
    //     clearGenerated25DModel();
    // }
    loadingIndicator.style.display = 'block';
    try {
        const result = await new Promise((resolve, reject) => {
            loader.load(url, resolve, undefined, reject);
        });
        
        if (currentModel) scene.remove(currentModel);
        currentModel = result.scene || result;
        setupModel(currentModel);
        if (isFile) URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error loading model:', error);
        if (isFile) URL.revokeObjectURL(url);
        alert('Error loading model. Please try again.');
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

function setupModel(model) {
    originalEmissiveColors.clear(); 
    model.traverse(child => {
        if (child.isMesh) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach(material => {
                if (material && material.emissive !== undefined) {
                    originalEmissiveColors.set(material, material.emissive.getHex());
                }
            });
        }
    });

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 3 / maxDim;
    
    model.scale.multiplyScalar(scale);
    model.position.sub(center.multiplyScalar(scale));
    scene.add(model);
    setModelToFrontView(model);
}

// Removed previewButton, heroMusic event listeners as UI is gone

// Removed container event listeners for superhero mode (can be reactivated with new UI)

// Removed old sidebar toggle logic (toggleControls)

// Removed fileInput, dragArea event listeners as UI is gone

// Removed most control event listeners (orbitControls, loadUrlModel, etc.)
// Kept core orbitControls.enabled logic within init and resetAll (if needed by future UI)

// Superhero button logic - keep the core state change, emissive, and rotation logic
// The button itself is gone, so this would be triggered by future UI
/*
superheroButton.addEventListener('click', () => { // superheroButton is removed
    if (!superheroModeActive) {
        superheroModeActive = true;
        // superheroButton.textContent = 'Slow Down!'; // UI
        // superheroButton.classList.add('active'); // UI
        // rotationSpeed = parseFloat(document.getElementById('rotationSpeed').value) * 0.01; // UI dependent

        if (currentModel) {
            currentModel.traverse(child => {
                if (child.isMesh) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(material => {
                        if (material && material.emissive !== undefined) {
                            if (!originalEmissiveColors.has(material)) { 
                                originalEmissiveColors.set(material, material.emissive.getHex());
                            }
                            material.emissive.setHex(0xffaa00);
                            if (material.needsUpdate !== undefined) material.needsUpdate = true;
                        }
                    });
                }
            });
        }
        // heroMusic.pause(); // UI
        // heroMusic.currentTime = 0; // UI
        // previewButton.textContent = 'Play Sound'; // UI
    } else {
        superheroModeActive = false;
        // superheroButton.textContent = 'Enable Superhero Mode'; // UI
        // superheroButton.classList.remove('active'); // UI

        if (currentModel) {
            currentModel.traverse(child => {
                if (child.isMesh) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(material => {
                        if (material && material.emissive !== undefined && originalEmissiveColors.has(material)) {
                            material.emissive.setHex(originalEmissiveColors.get(material));
                            if (material.needsUpdate !== undefined) material.needsUpdate = true;
                        }
                    });
                }
            });
        }
        // heroMusic.currentTime = 0; // UI
        // heroMusic.play(); // UI
        // previewButton.textContent = 'Stop Sound'; // UI
        
        // const angle = parseInt(document.getElementById('heroStopAngle').value); // UI dependent
        // const targetAngle = (Math.PI + (rotateClockwise ? angle : -angle) * (Math.PI / 180)) % (2 * Math.PI); 
        // ... rest of angle logic ...
    }
});
*/

// Removed handleInteraction, toggleWireframe, captureScreenshot as they were UI triggered.
// Kept setupAnimations, updateLoadingProgress, smoothRotateToAngle as they are core utilities.

let mixer;
function setupAnimations(model) {
    if (model.animations?.length) {
        mixer = new THREE.AnimationMixer(model);
        model.animations.forEach(clip => {
            mixer.clipAction(clip).play();
        });
    }
}

function updateLoadingProgress(xhr) {
    if (xhr.lengthComputable) {
        const percentComplete = (xhr.loaded / xhr.total) * 100;
        loadingIndicator.textContent = `Loading: ${Math.round(percentComplete)}%`;
    }
}

function smoothRotateToAngle(targetAngle, duration = 1000) {
    if (!currentModel) return;
    const startAngle = currentModel.rotation.y;
    const startTime = Date.now();
    
    function animateRotation() { 
        const now = Date.now();
        const progress = (now - startTime) / duration;
        
        if (progress < 1) {
            currentModel.rotation.y = THREE.MathUtils.lerp(startAngle, targetAngle, progress);
            requestAnimationFrame(animateRotation);
        } else {
            currentModel.rotation.y = targetAngle;
        }
    }
    animateRotation();
}


function resetAll() {
    // Reset Simple View Controls (Camera and basic interaction)
    if (camera && controls) { 
        camera.position.set(0, 0, 5);
        controls.target.set(0, 0, 0);
        camera.zoom = 1;
        camera.updateProjectionMatrix();
        controls.enabled = true; // Default to orbit controls enabled
        controls.enablePan = true; // Default to pan enabled
        controls.update();
    }
    
    // Reset Advanced Controls Toggle (if it were still part of the UI logic)
    // advancedControlsContainer.classList.remove('visible');
    // toggleAdvancedSettingsBtn.classList.remove('active');
    // toggleAdvancedSettingsBtn.textContent = 'Show Advanced Settings';

    if (currentModel) {
        const box = new THREE.Box3().setFromObject(currentModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3 / maxDim; 
        
        currentModel.position.sub(center);
        currentModel.scale.setScalar(scale);
        currentModel.rotation.set(0, Math.PI, 0); 
        
        // Revert emissive if superhero mode was active
        if (superheroModeActive && originalEmissiveColors.size > 0) {
             currentModel.traverse(child => {
                if (child.isMesh) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(material => {
                        if (material && material.emissive !== undefined && originalEmissiveColors.has(material)) {
                            material.emissive.setHex(originalEmissiveColors.get(material));
                            if (material.needsUpdate !== undefined) material.needsUpdate = true;
                        }
                    });
                }
            });
        }
    }
        
    // Reset lights
    if (ambientLight) ambientLight.intensity = 0.8; // Default intensity
    if (directionalLight) directionalLight.intensity = 0.6; // Default intensity
        
    // Reset global variables
    autoRotateYEnabled = true; // Default rotation state
    rotateClockwise = true;
    superheroModeActive = false;
    // rotationSpeed = 0; // This is for superhero mode, its UI is gone
        
    // Reset UI elements (commented out as they are removed)
    // document.getElementById('rotationSpeed').value = 1;
    // document.getElementById('modelScale').value = 1;
    // document.getElementById('ambientLight').value = 1; // These would error if not commented
    // document.getElementById('directionalLight').value = 1;
    // document.getElementById('bgColor').value = '#ffffff'; 
    // document.getElementById('heroStopAngle').value = 0;
    // document.getElementById('heroStopAngleValue').textContent = '0°';
    // autoRotateYCheckbox.checked = true;
    // autoRotateXCheckbox.checked = false;
    // autoRotateZCheckbox.checked = false;
    // enableYSweepCheckbox.checked = false;
    // sweepControlsContainer.style.display = 'none';
    // rotationDirectionCheckbox.checked = true; 
    // sweepAngleMaxSlider.value = 45;
    // sweepAngleMaxValueDisplay.textContent = '45°';
    // sweepSpeedFactorSlider.value = 1;
    // sweepSpeedFactorValueDisplay.textContent = '1.0x';
    // document.getElementById('orbitControls').checked = true;
    // document.getElementById('enablePan').checked = true;
        
    if (renderer) renderer.setClearColor(0xf0f0f0); // Reset background to default
        
    // if (generated25DModel) { // generated25DModel is removed
    //     clearGenerated25DModel(); 
    // }
    // imageTo3DInput.value = ''; // Removed
    // currentImageFor25D = null; // Removed
    // generate25DModelBtn.disabled = true; // Removed
    // extrusionDepthSlider.value = 1; // Removed
    // extrusionDepthValue.textContent = '1.0'; // Removed
    // extrusionColorPicker.value = '#007bff'; // Removed
    // clear25DModelBtn.disabled = true; // Removed
}
// document.getElementById('resetAll').addEventListener('click', resetAll); // Button is removed

// Removed Image to 2.5D event listeners and functions

// Removed heroStopAngle input listener as UI is gone

// Removed Rotation Animation event listeners (autoRotateX/Y/Z, rotationDirection) as UI is gone
// Kept global vars for default autoRotateY

// Removed Y-Axis Sweep event listeners as UI is gone

// Removed centerModel click listener as UI is gone

// Removed bgColor, ambientLight, directionalLight, modelScale input listeners as UI is gone

// Removed drag and drop, preset angle, saved camera views listeners as UI is gone

// DOMContentLoaded listener: simplified
document.addEventListener('DOMContentLoaded', () => {
    // Apply stored advanced mode state on page load (This is now OBE as advanced mode UI is gone)
    // const shouldShowAdvanced = localStorage.getItem('advancedModeActive') === 'true';
    // if (shouldShowAdvanced) {
    //     advancedControlsContainer.classList.add('visible');
    //     toggleAdvancedSettingsBtn.classList.add('active');
    //     toggleAdvancedSettingsBtn.textContent = 'Hide Advanced Settings';
    // } else {
    //     advancedControlsContainer.classList.remove('visible'); 
    //     toggleAdvancedSettingsBtn.classList.remove('active');
    //     toggleAdvancedSettingsBtn.textContent = 'Show Advanced Settings';
    // }

    // Simple View Reset Button (This button is also removed)
    // resetSimpleViewBtn.addEventListener('click', () => { ... });

    // Old sidebar toggle logic (This is removed)
    // const controlsElement = document.querySelector('.controls');
    // const button = document.getElementById('toggleControls');
    // if (window.innerWidth <= 768) {
    //     controlsElement.classList.add('hidden');
    //     button.style.left = '20px';
    // } else {
    //     if (controlsElement.classList.contains('hidden')) {
    //         button.style.left = '20px';
    //     } else {
    //         button.style.left = '370px';
    //     }
    // }
});
