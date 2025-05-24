import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { ColladaLoader } from 'three/addons/loaders/ColladaLoader.js';
import { TDSLoader } from 'three/addons/loaders/TDSLoader.js';

let scene, camera, renderer, controls;
let currentModel = null;
let ambientLight, directionalLight;
let originalEmissiveColors = new Map(); // For Superhero mode emissive effect
let savedCameraViews = {}; // For Saved Camera Views feature

// Auto-rotation variables
let autoRotateYEnabled = true;
let autoRotateXEnabled = false;
let autoRotateZEnabled = false;
let rotateClockwise = true; // Assuming checked = Clockwise, so default is Clockwise
let heroStopAngle = (45 * Math.PI) / 180; 

// Y-Axis Sweep variables
let ySweepEnabled = false;
let sweepAngleMax = 45 * (Math.PI / 180); // Default 45 degrees in radians
let sweepSpeedFactor = 1.0;
let sweepDirection = 1; // 1 for increasing angle, -1 for decreasing
let modelBaseRotationY = 0; // To store the Y rotation before sweep starts

// Superhero mode variables
let superheroModeActive = false;
let rotationSpeed = 0; // This is for superhero mode's own speed ramping
const MAX_SPEED = 0.5;
const ACCELERATION = 0.02;

const container = document.getElementById('modelViewer');
const loadingIndicator = document.getElementById('loadingIndicator');
const superheroButton = document.getElementById('superheroButton');
const previewButton = document.getElementById('previewSound');
const heroMusic = document.getElementById('heroMusic');
const defaultAudioIndicator = document.querySelector('.default-audio-indicator');
const currentModelAngleDisplay = document.getElementById('currentModelAngleDisplay');

// Rotation Animation DOM Elements
const autoRotateYCheckbox = document.getElementById('autoRotateY');
const autoRotateXCheckbox = document.getElementById('autoRotateX');
const autoRotateZCheckbox = document.getElementById('autoRotateZ');
const rotationDirectionCheckbox = document.getElementById('rotationDirection'); // Added for direct reference
const rotationSpeedSlider = document.getElementById('rotationSpeed'); // Added for direct reference

// Y-Axis Sweep DOM Elements
const enableYSweepCheckbox = document.getElementById('enableYSweep');
const sweepControlsContainer = document.getElementById('sweepControlsContainer');
const sweepAngleMaxSlider = document.getElementById('sweepAngleMax');
const sweepAngleMaxValueDisplay = document.getElementById('sweepAngleMaxValueDisplay');
const sweepSpeedFactorSlider = document.getElementById('sweepSpeedFactor');
const sweepSpeedFactorValueDisplay = document.getElementById('sweepSpeedFactorValueDisplay');

// Image to 2.5D DOM Elements & Variables
const imageTo3DInput = document.getElementById('imageTo3DInput');
const extrusionDepthSlider = document.getElementById('extrusionDepth');
const extrusionDepthValue = document.getElementById('extrusionDepthValue');
const extrusionColorPicker = document.getElementById('extrusionColor');
const generate25DModelBtn = document.getElementById('generate25DModelBtn');
const clear25DModelBtn = document.getElementById('clear25DModelBtn');
const imageProcessingCanvas = document.getElementById('imageProcessingCanvas');
const ctx = imageProcessingCanvas.getContext('2d');
let currentImageFor25D = null;
let generated25DModel = null; // To keep track of the generated model


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
    renderer.setClearColor(0xf0f0f0);
    container.appendChild(renderer.domElement);

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
    controls.enableRotate = true;
    controls.rotateSpeed = 1.0;

    // Add pan control listener
    document.getElementById('enablePan').addEventListener('change', (e) => {
        controls.enablePan = e.target.checked;
        controls.screenSpacePanning = e.target.checked;
    });

    // Load default model
    const defaultUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb';
    await loadModelWithLoader(new GLTFLoader(), defaultUrl);
    window.addEventListener('resize', onWindowResize, false);
}

window.addEventListener('load', () => {
    const controlsElement = document.querySelector('.controls');
    const button = document.getElementById('toggleControls');
    controlsElement.classList.add('hidden');
    button.style.left = '20px';
});
// Modify the animate function
function animate() {
    requestAnimationFrame(animate);
    controls.update();

    if (currentModel) {
        const rotationVal = parseFloat(rotationSpeedSlider.value) * 0.01;
        const direction = rotateClockwise ? 1 : -1;

        if (!superheroModeActive) { // Only apply these if superhero mode is not active
            if (autoRotateYEnabled && !ySweepEnabled) { // Y rotation only if sweep is not active
                currentModel.rotation.y += rotationVal * direction;
            }
            if (autoRotateXEnabled) {
                currentModel.rotation.x += rotationVal * direction;
            }
            if (autoRotateZEnabled) {
                currentModel.rotation.z += rotationVal * direction;
            }

            // Y-Axis Sweep Logic (overrides standard Y rotation if active)
            if (ySweepEnabled) {
                const sweepSpeed = rotationVal * sweepSpeedFactor * direction;
                currentModel.rotation.y += sweepSpeed * sweepDirection;

                const currentSweepOffset = currentModel.rotation.y - modelBaseRotationY;

                if (sweepDirection === 1 && currentSweepOffset > sweepAngleMax) {
                    currentModel.rotation.y = modelBaseRotationY + sweepAngleMax; // Clamp
                    sweepDirection = -1; // Change direction
                } else if (sweepDirection === -1 && currentSweepOffset < -sweepAngleMax) {
                    currentModel.rotation.y = modelBaseRotationY - sweepAngleMax; // Clamp
                    sweepDirection = 1; // Change direction
                }
            }
        } else { // Superhero mode is active
            const superheroEffectiveSpeed = Math.min(rotationSpeed + ACCELERATION, MAX_SPEED);
            currentModel.rotation.y += superheroEffectiveSpeed * direction;
        }

        // Update current rotation angle display
        if (currentModelAngleDisplay) { // Check if element exists
            const angleRadians = Math.atan2(Math.sin(currentModel.rotation.y), Math.cos(currentModel.rotation.y));
            const angleDegrees = angleRadians * (180 / Math.PI);
            currentModelAngleDisplay.textContent = `${angleDegrees.toFixed(1)}°`;
        }
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function setModelToFrontView(model) {
    model.rotation.set(0, Math.PI, 0);
}

document.getElementById('audioInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const audioUrl = URL.createObjectURL(file);
        heroMusic.src = audioUrl;
        defaultAudioIndicator.classList.add('hidden');
        
        heroMusic.addEventListener('canplay', () => {
            URL.revokeObjectURL(audioUrl);
        }, { once: true });
    }
});

async function loadModelWithLoader(loader, url, isFile = false) {
    if (generated25DModel) { // Clear any existing 2.5D model
        clearGenerated25DModel();
    }
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
    originalEmissiveColors.clear(); // Clear previous model's emissive colors
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

previewButton.addEventListener('click', () => {
    if (heroMusic.paused) {
        heroMusic.play();
        previewButton.textContent = 'Stop Sound';
    } else {
        heroMusic.pause();
        heroMusic.currentTime = 0;
        previewButton.textContent = 'Play Sound';
    }
});

// Reset button text when audio ends
heroMusic.addEventListener('ended', () => {
    previewButton.textContent = 'Play Sound';
});

// Add the new implementation
container.addEventListener('click', (e) => {
    if (!controls.enabled) return;
    if (superheroModeActive) {
        e.preventDefault();
        superheroButton.click();
    }
});

container.addEventListener('touchstart', (e) => {
    if (!controls.enabled) return;
    if (superheroModeActive) {
        e.preventDefault();
        e.stopPropagation();
        superheroButton.click();
    }
}, { passive: false });

container.addEventListener('touchmove', (e) => {
    if (superheroModeActive) {
        e.preventDefault();
    }
}, { passive: false });

container.addEventListener('touchend', (e) => {
    if (superheroModeActive) {
        e.preventDefault();
    }
}, { passive: false });

// Improved sidebar toggle handling
document.getElementById('toggleControls').addEventListener('click', () => {
    const controlsElement = document.querySelector('.controls');
    const button = document.getElementById('toggleControls');
    const isHidden = controlsElement.classList.contains('hidden');
    
    controlsElement.classList.toggle('hidden');
    button.style.left = isHidden ? '370px' : '20px';
    
    // Close sidebar when clicking outside on mobile
    if (!isHidden && window.innerWidth <= 768) {
        document.addEventListener('click', function closeOnClickOutside(e) {
            if (!controlsElement.contains(e.target) && e.target !== button) {
                controlsElement.classList.add('hidden');
                button.style.left = '20px';
                document.removeEventListener('click', closeOnClickOutside);
            }
        });
    }
});

// Handle resize events
window.addEventListener('resize', () => {
    const controlsElement = document.querySelector('.controls');
    const button = document.getElementById('toggleControls');
    
    if (window.innerWidth <= 768) {
        controlsElement.classList.add('hidden');
        button.style.left = '20px';
    }
});



document.getElementById('fileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const extension = file.name.split('.').pop().toLowerCase();
        const LoaderClass = {
            'glb': GLTFLoader,
            'gltf': GLTFLoader,
            'obj': OBJLoader,
            'stl': STLLoader,
            'fbx': FBXLoader,
            'dae': ColladaLoader,
            '3ds': TDSLoader
        }[extension];

        if (!LoaderClass) {
            alert(`Format .${extension} is not supported.`);
            return;
        }

        const url = URL.createObjectURL(file);
        await loadModelWithLoader(new LoaderClass(), url, true);
    }
});

const dragArea = document.getElementById('dragArea');
dragArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dragArea.classList.add('active');
});

dragArea.addEventListener('dragleave', () => {
    dragArea.classList.remove('active');
});

dragArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dragArea.classList.remove('active');
    const file = e.dataTransfer.files[0];
    if (file) loadModel(file); // This should be loadModelWithLoader
});

// Control event listeners
document.getElementById('orbitControls').addEventListener('change', (e) => {
    controls.enabled = e.target.checked;
});

document.getElementById('loadUrlModel').addEventListener('click', async () => {
    const url = document.getElementById('modelUrl').value.trim();
    if (!url) {
        alert('Please enter a valid URL');
        return;
    }

    const extension = url.split('.').pop().toLowerCase();
    const LoaderClass = {
        'glb': GLTFLoader,
        'gltf': GLTFLoader,
        'obj': OBJLoader,
        'stl': STLLoader,
        'fbx': FBXLoader,
        'dae': ColladaLoader,
        '3ds': TDSLoader
    }[extension];

    if (!LoaderClass) {
        alert('Unsupported file format');
        return;
    }

    await loadModelWithLoader(new LoaderClass(), url);
});

// Add superhero mode event listeners here
superheroButton.addEventListener('click', () => {
    if (!superheroModeActive) {
        // Enable superhero mode
        superheroModeActive = true;
        superheroButton.textContent = 'Slow Down!';
        superheroButton.classList.add('active');
        rotationSpeed = parseFloat(document.getElementById('rotationSpeed').value) * 0.01;

        if (currentModel) {
            currentModel.traverse(child => {
                if (child.isMesh) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(material => {
                        if (material && material.emissive !== undefined) {
                            if (!originalEmissiveColors.has(material)) { // Fallback
                                originalEmissiveColors.set(material, material.emissive.getHex());
                            }
                            material.emissive.setHex(0xffaa00);
                            if (material.needsUpdate !== undefined) material.needsUpdate = true;
                        }
                    });
                }
            });
        }
        // Stop any playing audio
        heroMusic.pause();
        heroMusic.currentTime = 0;
        previewButton.textContent = 'Play Sound';
    } else {
        // Slow down
        superheroModeActive = false;
        superheroButton.textContent = 'Enable Superhero Mode';
        superheroButton.classList.remove('active');

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

        // Play hero music
        heroMusic.currentTime = 0;
        heroMusic.play();
        previewButton.textContent = 'Stop Sound';
        
        
        // Calculate stop angle based on direction and front-facing orientation
        const angle = parseInt(document.getElementById('heroStopAngle').value);
        const targetAngle = (Math.PI + (rotateClockwise ? angle : -angle) * (Math.PI / 180)) % (2 * Math.PI);
        
        // Normalize current rotation
        const currentAngle = currentModel.rotation.y % (2 * Math.PI);
        const normalizedCurrent = currentAngle < 0 ? currentAngle + 2 * Math.PI : currentAngle;
        
        // Calculate shortest path to target
        let angleDiff = targetAngle - normalizedCurrent;
        if (Math.abs(angleDiff) > Math.PI) {
            angleDiff -= Math.sign(angleDiff) * 2 * Math.PI;
        }
        
        // Apply final rotation
        currentModel.rotation.y += angleDiff;
    }
});

function handleInteraction(e) {
    if (!controls.enabled) return;
    
    if (superheroModeActive) {
        e.preventDefault();
        e.stopPropagation();
        superheroButton.click();
    }
}

function toggleWireframe(enabled) {
    currentModel.traverse(child => {
        if (child.isMesh) {
            child.material.wireframe = enabled;
        }
    });
}

function captureScreenshot() {
    const link = document.createElement('a');
    link.download = 'model-screenshot.png';
    link.href = renderer.domElement.toDataURL('image/png');
    link.click();
}

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
    const startAngle = currentModel.rotation.y;
    const startTime = Date.now();
    
    function animateRotation() { // Renamed to avoid conflict with global animate
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

// Add a new complete reset function
function resetAll() {
    if (currentModel) {
        // Reset position and scale using the same logic as initialization
        const box = new THREE.Box3().setFromObject(currentModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3 / maxDim;  // Same scale calculation as in init()
        
        currentModel.position.sub(center);
        currentModel.scale.setScalar(scale);
        currentModel.rotation.set(0, Math.PI, 0); // Front-facing as in init
        
        // Reset camera to initial position
        camera.position.set(0, 0, 5);  // Same as init()
        controls.target.set(0, 0, 0);
        
        // Reset controls to initial values
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enablePan = true;
        controls.panSpeed = 1.0;
        controls.screenSpacePanning = true;
        controls.enableRotate = true;
        controls.rotateSpeed = 1.0;
        
        // Reset lights to initial intensities
        ambientLight.intensity = 1;
        directionalLight.intensity = 1;
        
        // Reset UI elements to match initialization values
        document.getElementById('rotationSpeed').value = 1;
        document.getElementById('modelScale').value = 1;
        document.getElementById('ambientLight').value = 1;
        document.getElementById('directionalLight').value = 1;
        document.getElementById('bgColor').value = '#ffffff'; // Set to white without alpha for consistency
        document.getElementById('heroStopAngle').value = 0;
        document.getElementById('heroStopAngleValue').textContent = '0°';
        
        // Reset global variables to initial states
        autoRotateYEnabled = true; // Updated from autoRotateEnabled
        autoRotateXEnabled = false;
        autoRotateZEnabled = false;
        ySweepEnabled = false;
        sweepAngleMax = 45 * (Math.PI / 180);
        sweepSpeedFactor = 1.0;
        modelBaseRotationY = 0;
        sweepDirection = 1;

        rotateClockwise = true; // Default is Clockwise
        superheroModeActive = false;
        // rotationSpeed is for superhero mode, its UI element is rotationSpeedSlider
        
        // Reset all toggles and UI elements
        autoRotateYCheckbox.checked = true;
        autoRotateXCheckbox.checked = false;
        autoRotateZCheckbox.checked = false;
        enableYSweepCheckbox.checked = false;
        sweepControlsContainer.style.display = 'none';
        
        rotationDirectionCheckbox.checked = true; // Assuming true for Clockwise
        
        sweepAngleMaxSlider.value = 45;
        sweepAngleMaxValueDisplay.textContent = '45°';
        sweepSpeedFactorSlider.value = 1;
        sweepSpeedFactorValueDisplay.textContent = '1.0x';
        
        document.getElementById('orbitControls').checked = true;
        document.getElementById('enablePan').checked = true;
        
        // Update renderer
        renderer.setClearColor(0xffffff); // Set to white without alpha
        
        // Update controls
        controls.update();

        // Reset Saved Camera View buttons
        document.querySelectorAll('.load-view-btn').forEach(btn => {
            btn.disabled = true;
        });
        // Note: savedCameraViews object itself is not cleared by resetAll to persist views for the session.

        // Reset Image to 2.5D UI elements and state
        if (generated25DModel) {
            clearGenerated25DModel(); // This also handles disabling buttons and clearing input
        }
        // Explicitly reset UI elements in case they were touched without generating a model
        imageTo3DInput.value = '';
        currentImageFor25D = null;
        generate25DModelBtn.disabled = true;
        extrusionDepthSlider.value = 1;
        extrusionDepthValue.textContent = '1.0';
        extrusionColorPicker.value = '#007bff';
        clear25DModelBtn.disabled = true; // Ensure clear is disabled if no model was generated
    }
}

document.getElementById('resetAll').addEventListener('click', resetAll);

// Image to 2.5D Feature Event Listeners & Functions
extrusionDepthSlider.addEventListener('input', (e) => {
    extrusionDepthValue.textContent = parseFloat(e.target.value).toFixed(1);
});

imageTo3DInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            currentImageFor25D = new Image();
            currentImageFor25D.onload = () => {
                generate25DModelBtn.disabled = false; // Enable button once image is loaded
            };
            currentImageFor25D.onerror = () => {
                alert('Error loading image.');
                currentImageFor25D = null;
                generate25DModelBtn.disabled = true;
            };
            currentImageFor25D.src = event.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        currentImageFor25D = null;
        generate25DModelBtn.disabled = true;
    }
});

generate25DModelBtn.addEventListener('click', () => {
    if (!currentImageFor25D) {
        alert('Please upload an image first.');
        return;
    }
    if (generated25DModel) { 
        clearGenerated25DModel();
    }
    if (currentModel && currentModel !== generated25DModel) { 
        scene.remove(currentModel);
        if(currentModel.geometry) currentModel.geometry.dispose();
        if(currentModel.material) {
            if(Array.isArray(currentModel.material)) currentModel.material.forEach(m => m.dispose());
            else currentModel.material.dispose();
        }
        currentModel = null;
        originalEmissiveColors.clear(); 
    }

    loadingIndicator.style.display = 'block';
    loadingIndicator.textContent = 'Generating 2.5D Model...';

    setTimeout(() => { 
        try {
            const shape = createShapeFromImage(currentImageFor25D);
            if (!shape) {
                alert('Could not create shape from image. Try a simpler image with clear transparency.');
                loadingIndicator.style.display = 'none';
                loadingIndicator.textContent = 'Loading Model...';
                return;
            }

            const depth = parseFloat(extrusionDepthSlider.value);
            const color = new THREE.Color(extrusionColorPicker.value);
            const extrudeSettings = { depth: depth, bevelEnabled: false };
            const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            const material = new THREE.MeshStandardMaterial({ color: color, side: THREE.DoubleSide });
            generated25DModel = new THREE.Mesh(geometry, material);
            
            setupModel(generated25DModel); 
            currentModel = generated25DModel; 

            clear25DModelBtn.disabled = false;
        } catch (error) {
            console.error('Error generating 2.5D model:', error);
            alert('An error occurred during 2.5D model generation.');
        } finally {
            loadingIndicator.style.display = 'none';
            loadingIndicator.textContent = 'Loading Model...'; 
        }
    }, 50);
});

function clearGenerated25DModel() {
    if (generated25DModel) {
        scene.remove(generated25DModel);
        if (generated25DModel.geometry) generated25DModel.geometry.dispose();
        if (generated25DModel.material) {
            if (Array.isArray(generated25DModel.material)) {
                generated25DModel.material.forEach(m => m.dispose());
            } else {
                generated25DModel.material.dispose();
            }
        }
        if (currentModel === generated25DModel) { 
             currentModel = null;
        }
        generated25DModel = null;
        originalEmissiveColors.clear(); 
        
        clear25DModelBtn.disabled = true;
        imageTo3DInput.value = ''; 
        currentImageFor25D = null;
        generate25DModelBtn.disabled = true;
    }
}
clear25DModelBtn.addEventListener('click', clearGenerated25DModel);

function createShapeFromImage(image) {
    const canvas = imageProcessingCanvas;
    const context = ctx;
    const threshold = 128; 

    const fixedWidth = 200; 
    const scaleFactor = fixedWidth / image.width;
    canvas.width = fixedWidth;
    canvas.height = image.height * scaleFactor;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
    let foundPixel = false;

    for (let y_coord = 0; y_coord < canvas.height; y_coord++) {
        for (let x_coord = 0; x_coord < canvas.width; x_coord++) {
            const alpha = data[(y_coord * canvas.width + x_coord) * 4 + 3];
            if (alpha > threshold) {
                minX = Math.min(minX, x_coord);
                minY = Math.min(minY, y_coord);
                maxX = Math.max(maxX, x_coord);
                maxY = Math.max(maxY, y_coord);
                foundPixel = true;
            }
        }
    }

    if (!foundPixel) return null; 

    const w = maxX - minX;
    const h = maxY - minY;

    if (w <= 0 || h <= 0) return null; 
    
    const shape = new THREE.Shape();
    // Define path relative to minX, minY for the shape, then setupModel will center it.
    // Y is inverted: canvas (0,0) top-left, THREE.Shape (0,0) bottom-left for 2D plane.
    shape.moveTo(minX, canvas.height - minY);      
    shape.lineTo(maxX, canvas.height - minY);      
    shape.lineTo(maxX, canvas.height - maxY);      
    shape.lineTo(minX, canvas.height - maxY);      
    shape.closePath();

    return shape;
}

// Add angle display update
document.getElementById('heroStopAngle').addEventListener('input', (e) => {
    const angle = parseInt(e.target.value);
    document.getElementById('heroStopAngleValue').textContent = `${angle}°`;
    
    if (currentModel) {
        // Store auto-rotate state
        const wasAutoRotating = autoRotateYEnabled;
        if (autoRotateYEnabled) {
            autoRotateYEnabled = false;
        }
        
        // Calculate and apply rotation
        // Note: The 'rotateClockwise' here is the global one, which is correct.
        // The hero stop angle is an offset from the 'front' (Math.PI).
        const targetAngle = (Math.PI + (rotateClockwise ? angle : -angle) * (Math.PI / 180)) % (2 * Math.PI); 
        const currentAngle = currentModel.rotation.y % (2 * Math.PI);
        const normalizedCurrent = currentAngle < 0 ? currentAngle + 2 * Math.PI : currentAngle;
        
        let angleDiff = targetAngle - normalizedCurrent;
        if (Math.abs(angleDiff) > Math.PI) {
            angleDiff -= Math.sign(angleDiff) * 2 * Math.PI;
        }
        
        currentModel.rotation.y += angleDiff;
        
        // Restore auto-rotate state after a brief delay
        if (wasAutoRotating) {
            setTimeout(() => {
                autoRotateYEnabled = true; // Updated to autoRotateYEnabled
            }, 500); // Adjusted delay for smoother transition
        }
    }
});

// Rotation Animation Event Listeners
autoRotateYCheckbox.addEventListener('change', (e) => { autoRotateYEnabled = e.target.checked; });
autoRotateXCheckbox.addEventListener('change', (e) => { autoRotateXEnabled = e.target.checked; });
autoRotateZCheckbox.addEventListener('change', (e) => { autoRotateZEnabled = e.target.checked; });

rotationDirectionCheckbox.addEventListener('change', (e) => {
    rotateClockwise = e.target.checked; // True if "Clockwise" is selected
});


// Y-Axis Sweep Event Listeners
enableYSweepCheckbox.addEventListener('change', (e) => {
    ySweepEnabled = e.target.checked;
    sweepControlsContainer.style.display = ySweepEnabled ? 'block' : 'none';
    if (ySweepEnabled && currentModel) {
        modelBaseRotationY = currentModel.rotation.y; 
        sweepDirection = 1; 
    }
    // No specific action needed when turning off sweep, model continues from current rotation or other active rotations take over.
});

sweepAngleMaxSlider.addEventListener('input', (e) => {
    const angleDeg = parseInt(e.target.value);
    sweepAngleMax = angleDeg * (Math.PI / 180);
    sweepAngleMaxValueDisplay.textContent = `${angleDeg}°`;
});

sweepSpeedFactorSlider.addEventListener('input', (e) => {
    sweepSpeedFactor = parseFloat(e.target.value);
    sweepSpeedFactorValueDisplay.textContent = `${sweepSpeedFactor.toFixed(1)}x`;
});


document.getElementById('centerModel').addEventListener('click', () => {
    if (currentModel) {
        const box = new THREE.Box3().setFromObject(currentModel);
        const center = box.getCenter(new THREE.Vector3());
        currentModel.position.sub(center.multiplyScalar(currentModel.scale.x)); // Adjust for current scale
        
        // Reset camera target to the new model center (which is now 0,0,0 relative to model)
        controls.target.set(0, 0, 0);
        controls.update();
    }
});

// document.getElementById('autoRotate').addEventListener('change', (e) => { 
//     autoRotateYEnabled = e.target.checked; 
// });
// The above is the old listener for the element with ID 'autoRotate', which is now 'autoRotateY'.
// The new listener for 'autoRotateY' is autoRotateYCheckbox.addEventListener(...) and is already added.

document.getElementById('bgColor').addEventListener('input', (e) => {
    renderer.setClearColor(e.target.value);
});

document.getElementById('ambientLight').addEventListener('input', (e) => {
    ambientLight.intensity = parseFloat(e.target.value);
});

document.getElementById('directionalLight').addEventListener('input', (e) => {
    directionalLight.intensity = parseFloat(e.target.value);
});

document.getElementById('modelScale').addEventListener('input', (e) => {
    if (currentModel) {
        const scale = parseFloat(e.target.value);
        // To apply scale from the center, we might need to adjust position if not already centered.
        // However, current setup scales from origin, which is fine if model is centered.
        currentModel.scale.setScalar(scale);
    }
});

// Corrected drag and drop to use loadModelWithLoader
dragArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dragArea.classList.remove('active');
    const file = e.dataTransfer.files[0];
    if (file) {
        const extension = file.name.split('.').pop().toLowerCase();
        const LoaderClass = {
            'glb': GLTFLoader,
            'gltf': GLTFLoader,
            'obj': OBJLoader,
            'stl': STLLoader,
            'fbx': FBXLoader,
            'dae': ColladaLoader,
            '3ds': TDSLoader
        }[extension];

        if (!LoaderClass) {
            alert(`Format .${extension} is not supported.`);
            return;
        }
        const url = URL.createObjectURL(file);
        loadModelWithLoader(new LoaderClass(), url, true); // Pass true for isFile
    }
});

// Preset Angle Buttons for Hero Stop Angle
const heroStopAngleSlider = document.getElementById('heroStopAngle');
const heroStopAngleValueDisplay = document.getElementById('heroStopAngleValue');

document.querySelectorAll('.preset-angle-btn').forEach(button => {
    button.addEventListener('click', () => {
        const angle = parseInt(button.dataset.angle);
        
        heroStopAngleSlider.value = angle;
        heroStopAngleValueDisplay.textContent = `${angle}°`;
        
        const inputEvent = new Event('input', { bubbles: true, cancelable: true });
        heroStopAngleSlider.dispatchEvent(inputEvent);
    });
});

// Saved Camera Views Event Listeners
document.querySelectorAll('.save-view-btn').forEach(button => {
    button.addEventListener('click', () => {
        if (!camera || !controls) return; // Ensure camera and controls exist

        const slot = button.dataset.slot;
        savedCameraViews[slot] = {
            position: camera.position.clone(),
            quaternion: camera.quaternion.clone(),
            zoom: camera.zoom,
            target: controls.target.clone() // Crucial for OrbitControls
        };

        // Enable the corresponding load button
        const loadButton = document.querySelector(`.load-view-btn[data-slot="${slot}"]`);
        if (loadButton) {
            loadButton.disabled = false;
        }
        // Optional: Visual feedback e.g., button text changes temporarily to "Saved!"
        button.textContent = 'Saved!';
        setTimeout(() => { button.textContent = 'Save'; }, 1500);
    });
});

document.querySelectorAll('.load-view-btn').forEach(button => {
    button.addEventListener('click', () => {
        if (!camera || !controls) return;

        const slot = button.dataset.slot;
        const view = savedCameraViews[slot];

        if (view) {
            // Disable controls temporarily to prevent interference during transition
            const originalControlsEnabled = controls.enabled;
            controls.enabled = false;

            camera.position.copy(view.position);
            camera.quaternion.copy(view.quaternion);
            camera.zoom = view.zoom;
            controls.target.copy(view.target);

            camera.updateProjectionMatrix(); // Important after zoom or other intrinsic changes
            controls.update(); // Sync OrbitControls

            // Re-enable controls after a short delay
            setTimeout(() => {
               controls.enabled = originalControlsEnabled;
            }, 100); // Adjust delay if needed
        }
    });
});


// Ensure all controls elements are correctly referenced
document.addEventListener('DOMContentLoaded', () => {
    // This ensures all DOM elements are loaded before attaching event listeners
    // This is especially important if script is loaded in <head> or before all HTML elements
    // However, since we are moving to bottom of body, this might be redundant but good practice.
    const controlsElement = document.querySelector('.controls');
    const button = document.getElementById('toggleControls');
    
    // Initial setup for controls visibility based on screen size
    if (window.innerWidth <= 768) {
        controlsElement.classList.add('hidden');
        button.style.left = '20px';
    } else {
        // For larger screens, determine initial button position based on sidebar state
        if (controlsElement.classList.contains('hidden')) {
            button.style.left = '20px';
        } else {
            button.style.left = '370px';
        }
    }
});
