class ModelViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.currentModel = null;
        this.mixer = null;
        this.clock = new THREE.Clock();
        this.stats = { vertices: 0, faces: 0, fps: 60 };
        this.lights = {};
        this.composer = null;
        this.bloomPass = null;
        this.superheroMode = false;
        this.originalCameraPos = null;
        this.superheroAudio = null;
        this.customAudioFile = null;
        this.animationPaused = false;
        
        this.init();
        this.setupEventListeners();
        this.animate();
        
        // Hide loading screen after initialization
        setTimeout(() => {
            document.getElementById('loadingScreen').classList.add('hidden');
            document.getElementById('mainContainer').classList.remove('hidden');
        }, 1500);
    }

    init() {
        const container = document.getElementById('viewerContainer');
        
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);
        
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.set(5, 5, 5);
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
        container.appendChild(this.renderer.domElement);
        
        // Controls setup
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 100;
        
        // Lighting setup
        this.setupLighting();
        
        // Post-processing setup
        this.setupPostProcessing();
        
        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0xffffff, 
            transparent: true, 
            opacity: 0.1 
        });
        this.groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
        this.groundPlane.rotation.x = -Math.PI / 2;
        this.groundPlane.position.y = 0;
        this.groundPlane.receiveShadow = true;
        this.scene.add(this.groundPlane);
        
        // Grid helper (hidden by default)
        this.gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0xcccccc);
        this.gridHelper.material.transparent = true;
        this.gridHelper.material.opacity = 0.3;
        this.gridHelper.visible = false;
        this.scene.add(this.gridHelper);
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.onWindowResize();
            // Reset sidebar state on resize
            const sidebar = document.getElementById('sidebar');
            const toggleBtn = document.getElementById('sidebarToggleBtn');
            if (window.innerWidth <= 768) {
                sidebar.classList.add('collapsed');
                toggleBtn.classList.remove('active');
            } else {
                sidebar.classList.remove('collapsed');
                toggleBtn.classList.remove('active');
            }
        });
    }

    setupLighting() {
        // Ambient light
        this.lights.ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.lights.ambient);
        
        // Directional light
        this.lights.directional = new THREE.DirectionalLight(0xffffff, 1);
        this.lights.directional.position.set(5, 5, 5);
        this.lights.directional.castShadow = true;
        this.lights.directional.shadow.mapSize.width = 2048;
        this.lights.directional.shadow.mapSize.height = 2048;
        this.lights.directional.shadow.camera.near = 0.5;
        this.lights.directional.shadow.camera.far = 50;
        this.scene.add(this.lights.directional);
        
        // Helper for directional light
        const dirLightHelper = new THREE.DirectionalLightHelper(this.lights.directional, 1);
        dirLightHelper.visible = false;
        this.scene.add(dirLightHelper);
    }

    setupPostProcessing() {
        // Only setup post-processing if all dependencies are available
        if (typeof THREE.EffectComposer !== 'undefined' && 
            typeof THREE.RenderPass !== 'undefined' && 
            typeof THREE.UnrealBloomPass !== 'undefined') {
            
            this.composer = new THREE.EffectComposer(this.renderer);
            
            const renderPass = new THREE.RenderPass(this.scene, this.camera);
            this.composer.addPass(renderPass);
            
            this.bloomPass = new THREE.UnrealBloomPass(
                new THREE.Vector2(window.innerWidth, window.innerHeight),
                1.5, 0.4, 0.85
            );
            this.bloomPass.enabled = false;
            this.composer.addPass(this.bloomPass);
        } else {
            console.warn('Post-processing dependencies not loaded, using basic rendering');
            this.composer = null;
            this.bloomPass = { enabled: false };
        }
    }

    setupEventListeners() {
        // Sidebar toggle
        document.getElementById('sidebarToggleBtn').addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            const toggleBtn = document.getElementById('sidebarToggleBtn');
            sidebar.classList.toggle('collapsed');
            toggleBtn.classList.toggle('active');
        });

        document.getElementById('sidebarToggle').addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            const toggleBtn = document.getElementById('sidebarToggleBtn');
            sidebar.classList.add('collapsed');
            toggleBtn.classList.remove('active');
        });
        
        // Auto-hide sidebar on mobile when clicking outside
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('sidebar');
                const toggleBtn = document.getElementById('sidebarToggleBtn');
                if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
                    sidebar.classList.add('collapsed');
                    toggleBtn.classList.remove('active');
                }
            }
        });
        
        // Initialize mobile sidebar state
        if (window.innerWidth <= 768) {
            document.getElementById('sidebar').classList.add('collapsed');
        }
        
        // Force initial render
        setTimeout(() => {
            this.renderer.render(this.scene, this.camera);
        }, 500);
        
        // Superhero mode
        document.getElementById('superheroBtn').addEventListener('click', () => {
            this.activateSuperheroMode();
        });
        
        // Audio upload
        const audioDrop = document.getElementById('audioDrop');
        const audioInput = document.getElementById('audioInput');
        
        audioDrop.addEventListener('click', () => audioInput.click());
        audioDrop.addEventListener('dragover', (e) => {
            e.preventDefault();
            audioDrop.classList.add('dragover');
        });
        audioDrop.addEventListener('dragleave', () => audioDrop.classList.remove('dragover'));
        audioDrop.addEventListener('drop', (e) => {
            e.preventDefault();
            audioDrop.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) this.loadAudioFile(files[0]);
        });
        
        audioInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) this.loadAudioFile(e.target.files[0]);
        });
        
        document.getElementById('clearAudio').addEventListener('click', () => {
            this.clearCustomAudio();
        });

        // File loading
        document.getElementById('loadUrlBtn').addEventListener('click', () => {
            const url = document.getElementById('modelUrl').value.trim();
            if (url) this.loadModelFromUrl(url);
        });

        document.getElementById('modelUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const url = e.target.value.trim();
                if (url) this.loadModelFromUrl(url);
            }
        });

        // File drop
        const fileDrop = document.getElementById('fileDrop');
        const fileInput = document.getElementById('fileInput');
        
        fileDrop.addEventListener('click', () => fileInput.click());
        fileDrop.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileDrop.classList.add('dragover');
        });
        fileDrop.addEventListener('dragleave', () => fileDrop.classList.remove('dragover'));
        fileDrop.addEventListener('drop', (e) => {
            e.preventDefault();
            fileDrop.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) this.loadModelFromFile(files[0]);
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) this.loadModelFromFile(e.target.files[0]);
        });

        // Controls
        this.setupControlListeners();
        
        // Error modal
        document.getElementById('closeError').addEventListener('click', () => {
            document.getElementById('errorModal').classList.add('hidden');
        });
    }

    setupControlListeners() {
        // Background controls
        document.getElementById('backgroundSelect').addEventListener('change', (e) => {
            this.updateBackground(e.target.value);
        });
        
        document.getElementById('bgColor').addEventListener('input', (e) => {
            this.scene.background = new THREE.Color(e.target.value);
        });

        // Lighting controls
        document.getElementById('ambientIntensity').addEventListener('input', (e) => {
            this.lights.ambient.intensity = parseFloat(e.target.value);
            this.updateValueDisplay(e.target);
        });

        document.getElementById('directionalIntensity').addEventListener('input', (e) => {
            this.lights.directional.intensity = parseFloat(e.target.value);
            this.updateValueDisplay(e.target);
        });

        document.getElementById('lightPosX').addEventListener('input', (e) => {
            this.lights.directional.position.x = parseFloat(e.target.value);
            this.updateValueDisplay(e.target);
        });

        document.getElementById('lightPosY').addEventListener('input', (e) => {
            this.lights.directional.position.y = parseFloat(e.target.value);
            this.updateValueDisplay(e.target);
        });

        // Grid toggle
        document.getElementById('showGrid').addEventListener('change', (e) => {
            this.gridHelper.visible = e.target.checked;
        });
        
        // Post-processing controls
        document.getElementById('bloomEnabled').addEventListener('change', (e) => {
            this.bloomPass.enabled = e.target.checked;
        });

        document.getElementById('bloomStrength').addEventListener('input', (e) => {
            this.bloomPass.strength = parseFloat(e.target.value);
            this.updateValueDisplay(e.target);
        });

        // Animation controls
        document.getElementById('autoRotate').addEventListener('change', (e) => {
            this.controls.autoRotate = e.target.checked;
        });

        document.getElementById('rotationSpeed').addEventListener('input', (e) => {
            this.controls.autoRotateSpeed = parseFloat(e.target.value);
            this.updateValueDisplay(e.target);
        });

        // Camera controls
        document.getElementById('resetCamera').addEventListener('click', () => {
            this.resetCamera();
        });

        document.getElementById('fitToView').addEventListener('click', () => {
            this.fitCameraToModel();
        });

        // Export controls
        document.getElementById('screenshotBtn').addEventListener('click', () => {
            this.takeScreenshot();
        });

        // Animation controls
        document.getElementById('playBtn').addEventListener('click', () => {
            this.animationPaused = false;
            if (this.mixer) {
                this.mixer.timeScale = 1;
            }
            if (this.superheroMode && this.superheroAudio) {
                this.fadeInAudio();
            }
        });
        
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.animationPaused = true;
            if (this.mixer) {
                this.mixer.timeScale = 0;
            }
            if (this.superheroMode && this.superheroAudio) {
                this.fadeOutAudio();
            }
        });
        
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.animationPaused = false;
            if (this.mixer) {
                this.mixer.setTime(0);
            }
            if (this.superheroMode) {
                this.exitSuperheroMode();
            }
        });

        // Initialize value displays
        document.querySelectorAll('.slider').forEach(slider => {
            this.updateValueDisplay(slider);
        });
    }

    updateValueDisplay(slider) {
        const valueDisplay = slider.parentElement.querySelector('.value-display');
        if (valueDisplay) {
            valueDisplay.textContent = parseFloat(slider.value).toFixed(1);
        }
    }

    updateBackground(type) {
        switch (type) {
            case 'gradient':
                // Create gradient background using canvas
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 512;
                const ctx = canvas.getContext('2d');
                const gradient = ctx.createLinearGradient(0, 0, 0, 512);
                gradient.addColorStop(0, '#667eea');
                gradient.addColorStop(1, '#764ba2');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, 512, 512);
                const texture = new THREE.CanvasTexture(canvas);
                this.scene.background = texture;
                break;
            case 'solid':
                const color = document.getElementById('bgColor').value;
                this.scene.background = new THREE.Color(color);
                break;
            case 'hdri':
                // Create HDRI-like environment with sphere mapping
                const hdriCanvas = document.createElement('canvas');
                hdriCanvas.width = 1024;
                hdriCanvas.height = 512;
                const hdriCtx = hdriCanvas.getContext('2d');
                
                // Create sky gradient
                const skyGradient = hdriCtx.createLinearGradient(0, 0, 0, 512);
                skyGradient.addColorStop(0, '#87CEEB');
                skyGradient.addColorStop(0.7, '#98D8E8');
                skyGradient.addColorStop(1, '#F0F8FF');
                hdriCtx.fillStyle = skyGradient;
                hdriCtx.fillRect(0, 0, 1024, 512);
                
                // Add sun
                hdriCtx.beginPath();
                hdriCtx.arc(800, 100, 50, 0, Math.PI * 2);
                hdriCtx.fillStyle = '#FFF8DC';
                hdriCtx.fill();
                
                const hdriTexture = new THREE.CanvasTexture(hdriCanvas);
                hdriTexture.mapping = THREE.EquirectangularReflectionMapping;
                this.scene.background = hdriTexture;
                this.scene.environment = hdriTexture;
                break;
        }
    }

    showProgress(show, text = 'Loading...') {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.querySelector('.progress-text');
        
        if (show) {
            progressBar.classList.remove('hidden');
            progressText.textContent = text;
        } else {
            progressBar.classList.add('hidden');
        }
    }

    updateProgress(progress) {
        const progressFill = document.querySelector('.progress-fill');
        progressFill.style.width = `${progress * 100}%`;
    }

    loadModelFromUrl(url) {
        this.showProgress(true, 'Loading model...');
        
        const loader = this.getLoaderForUrl(url);
        if (!loader) {
            this.showError('Unsupported file format');
            return;
        }

        loader.load(
            url,
            (model) => this.onModelLoaded(model),
            (progress) => {
                if (progress.lengthComputable) {
                    this.updateProgress(progress.loaded / progress.total);
                }
            },
            (error) => {
                console.error('Error loading model:', error);
                this.showError('Failed to load model from URL');
                this.showProgress(false);
            }
        );
    }

    loadModelFromFile(file) {
        this.showProgress(true, 'Loading model...');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const loader = this.getLoaderForFile(file);
            if (!loader) {
                this.showError('Unsupported file format');
                return;
            }

            try {
                if (file.name.toLowerCase().endsWith('.glb') || file.name.toLowerCase().endsWith('.gltf')) {
                    loader.parse(e.target.result, '', (model) => this.onModelLoaded(model));
                } else {
                    // For other formats, create object URL
                    const blob = new Blob([e.target.result]);
                    const url = URL.createObjectURL(blob);
                    loader.load(url, (model) => {
                        this.onModelLoaded(model);
                        URL.revokeObjectURL(url);
                    });
                }
            } catch (error) {
                console.error('Error parsing model:', error);
                this.showError('Failed to parse model file');
                this.showProgress(false);
            }
        };

        reader.readAsArrayBuffer(file);
    }

    getLoaderForUrl(url) {
        const extension = url.split('.').pop().toLowerCase();
        return this.getLoaderForExtension(extension);
    }

    getLoaderForFile(file) {
        const extension = file.name.split('.').pop().toLowerCase();
        return this.getLoaderForExtension(extension);
    }

    getLoaderForExtension(extension) {
        switch (extension) {
            case 'glb':
            case 'gltf':
                return new THREE.GLTFLoader();
            case 'fbx':
                return new THREE.FBXLoader();
            case 'obj':
                return new THREE.OBJLoader();
            case 'dae':
                return new THREE.ColladaLoader();
            case 'stl':
                return new THREE.STLLoader();
            case 'ply':
                return new THREE.PLYLoader();
            default:
                return null;
        }
    }

    onModelLoaded(loadedModel) {
        // Remove existing model
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
        }

        // Process the loaded model based on format
        let model;
        if (loadedModel.scene) {
            model = loadedModel.scene; // GLTF, Collada
        } else if (loadedModel.isBufferGeometry || loadedModel.isGeometry) {
            // STL, PLY - create mesh from geometry
            const material = new THREE.MeshPhongMaterial({ color: 0x888888 });
            model = new THREE.Mesh(loadedModel, material);
        } else {
            model = loadedModel; // FBX, OBJ
        }

        this.currentModel = model;
        this.scene.add(model);

        // Setup animations if available
        if (loadedModel.animations && loadedModel.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(model);
            loadedModel.animations.forEach(clip => {
                this.mixer.clipAction(clip).play();
            });
        }

        // Enable shadows
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Update stats
        this.updateModelStats(model);

        // Ensure renderer is properly sized
        this.onWindowResize();
        
        // Fit camera to model
        this.fitCameraToModel();
        
        // Force render in next frame
        requestAnimationFrame(() => {
            this.renderer.render(this.scene, this.camera);
        });
        
        this.showProgress(false);
    }

    updateModelStats(model) {
        let vertices = 0;
        let faces = 0;

        model.traverse((child) => {
            if (child.isMesh && child.geometry) {
                const geometry = child.geometry;
                if (geometry.attributes.position) {
                    vertices += geometry.attributes.position.count;
                }
                if (geometry.index) {
                    faces += geometry.index.count / 3;
                } else {
                    faces += geometry.attributes.position.count / 3;
                }
            }
        });

        this.stats.vertices = vertices;
        this.stats.faces = Math.floor(faces);

        document.getElementById('vertexCount').textContent = vertices.toLocaleString();
        document.getElementById('faceCount').textContent = this.stats.faces.toLocaleString();
    }

    fitCameraToModel() {
        if (!this.currentModel) return;

        const box = new THREE.Box3().setFromObject(this.currentModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxSize = Math.max(size.x, size.y, size.z);
        
        // Position model above ground if it's below
        if (box.min.y < 0) {
            this.currentModel.position.y = -box.min.y;
            // Recalculate box after repositioning
            box.setFromObject(this.currentModel);
            center.copy(box.getCenter(new THREE.Vector3()));
        }
        
        // Set camera distance based on model size
        const distance = maxSize * 2;
        
        this.camera.position.set(
            center.x + distance,
            center.y + distance * 0.5,
            center.z + distance
        );
        
        this.camera.lookAt(center);
        this.controls.target.copy(center);
        this.controls.update();
    }

    resetCamera() {
        this.camera.position.set(5, 5, 5);
        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0, 0);
        this.controls.reset();
    }

    takeScreenshot() {
        this.renderer.render(this.scene, this.camera);
        const canvas = this.renderer.domElement;
        const link = document.createElement('a');
        link.download = 'model-screenshot.png';
        link.href = canvas.toDataURL();
        link.click();
    }

    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorModal').classList.remove('hidden');
    }

    onWindowResize() {
        const container = document.getElementById('viewerContainer');
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        if (this.composer) {
            this.composer.setSize(width, height);
        }
        
        // Force render after resize
        this.renderer.render(this.scene, this.camera);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();

        // Update controls (disabled in superhero mode)
        if (!this.superheroMode) {
            this.controls.update();
        }

        // Update animations (only if not paused)
        if (this.mixer && !this.animationPaused) {
            this.mixer.update(delta);
        }
        
        // Superhero camera animation (only if not paused)
        if (this.superheroMode && this.currentModel && !this.animationPaused) {
            this.updateSuperheroCamera();
        }

        // Update FPS counter
        this.stats.fps = Math.round(1 / delta);
        document.getElementById('fpsCounter').textContent = this.stats.fps;

        // Render
        if (this.composer && this.bloomPass.enabled) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    activateSuperheroMode() {
        if (!this.currentModel || this.superheroMode) return;
        
        // Store original camera position
        this.originalCameraPos = {
            position: this.camera.position.clone(),
            target: this.controls.target.clone()
        };
        
        // Pitch black fade with silence
        const overlay = document.getElementById('fadeOverlay');
        overlay.classList.remove('hidden');
        overlay.classList.add('pitch-black');
        
        // Step 1: Silence/Ambience (1s)
        this.playAmbientDrone();
        
        setTimeout(() => {
            // Step 2: THUMP (1.5s) + Echo tail (0.5s)
            this.playBassThump();
        }, 1000);
        
        setTimeout(() => {
            // Step 3: Music + Camera starts (after 3s total)
            this.playSuperheroMusic();
        }, 3000);
        
        setTimeout(() => {
            this.superheroMode = true;
            this.controls.enabled = false;
            
            // Store original scene settings
            this.originalBackground = this.scene.background;
            this.originalFog = this.scene.fog;
            
            // Dark cinematic background with fog
            this.scene.background = new THREE.Color(0x000000);
            this.scene.fog = new THREE.Fog(0x000000, 5, 30);
            
            // Enable cinematic bloom
            if (this.bloomPass) {
                this.bloomPass.enabled = true;
                this.bloomPass.strength = 0.4;
                this.bloomPass.radius = 0.3;
                this.bloomPass.threshold = 0.7;
            }
            
            // Dramatic superhero lighting
            this.lights.ambient.intensity = 0.1;
            this.lights.directional.intensity = 0.5;
            
            // Add spotlight for dramatic effect
            const box = new THREE.Box3().setFromObject(this.currentModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxSize = Math.max(size.x, size.y, size.z);
            
            this.spotlight = new THREE.SpotLight(0xffffff, 2.0, 0, Math.PI / 6, 0.3);
            this.spotlight.position.set(center.x + maxSize, center.y + maxSize * 2, center.z + maxSize);
            this.spotlight.target.position.copy(center);
            this.spotlight.castShadow = true;
            this.scene.add(this.spotlight);
            this.scene.add(this.spotlight.target);
            
            // Add rim light for silhouette
            this.rimLight = new THREE.DirectionalLight(0x4488ff, 1.2);
            this.rimLight.position.set(center.x - maxSize, center.y, center.z - maxSize);
            this.scene.add(this.rimLight);
            
            // Start camera animation (synced with music)
            this.superheroStartTime = Date.now() - 3000; // Account for pre-sequence
            
            // Gradual fade from pitch black
            setTimeout(() => {
                overlay.classList.remove('pitch-black');
                overlay.classList.add('active');
                setTimeout(() => {
                    overlay.classList.remove('active');
                    setTimeout(() => overlay.classList.add('hidden'), 800);
                }, 1500);
            }, 500);
            
            // Auto-exit when music ends
            if (this.superheroAudio) {
                this.superheroAudio.addEventListener('ended', () => this.exitSuperheroMode());
            } else {
                setTimeout(() => this.exitSuperheroMode(), 30000);
            }
        }, 1000);
    }
    
    updateSuperheroCamera() {
        const elapsed = (Date.now() - this.superheroStartTime) / 1000;
        const box = new THREE.Box3().setFromObject(this.currentModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxSize = Math.max(size.x, size.y, size.z);
        
        // Get music duration and analyze audio for dynamic sync
        const musicDuration = this.superheroAudio ? (this.superheroAudio.duration || 30) : 30;
        const progress = elapsed / musicDuration;
        
        // Get audio frequency data for dynamic movement
        let audioIntensity = 1;
        if (this.audioAnalyser) {
            const dataArray = new Uint8Array(this.audioAnalyser.frequencyBinCount);
            this.audioAnalyser.getByteFrequencyData(dataArray);
            audioIntensity = (dataArray.reduce((a, b) => a + b) / dataArray.length) / 128;
        }
        
        // Sky-to-model cinematic sequence
        if (progress < 0.1) {
            // Sky descent: Start from high above (0-10%)
            const t = progress / 0.1;
            const skyHeight = maxSize * (8 - t * 6); // Descend from sky
            const distance = maxSize * (3 - t * 1.5);
            
            this.camera.position.set(
                center.x + distance * 0.3,
                center.y + skyHeight,
                center.z + distance * 0.5
            );
            
        } else if (progress < 0.25) {
            // Dramatic reveal: Focus on model (10-25%)
            const t = (progress - 0.1) / 0.15;
            const distance = maxSize * (1.5 - t * 0.3);
            const angle = t * Math.PI * 0.3;
            
            this.camera.position.set(
                center.x + Math.cos(angle) * distance,
                center.y + maxSize * (2 - t * 1.2),
                center.z + Math.sin(angle) * distance
            );
            
        } else if (progress < 0.6) {
            // Dynamic orbit: Music-synced rotation (25-60%)
            const t = (progress - 0.25) / 0.35;
            const speed = audioIntensity * 2; // Music-driven speed
            const angle = t * Math.PI * 4 * speed;
            const distance = maxSize * (1.2 + audioIntensity * 0.5);
            const verticalMove = Math.sin(t * Math.PI * 2) * maxSize * 0.4;
            
            this.camera.position.set(
                center.x + Math.cos(angle) * distance,
                center.y + maxSize * 0.8 + verticalMove,
                center.z + Math.sin(angle) * distance
            );
            
        } else {
            // Epic finale: Pullback reveal (60-100%)
            const t = (progress - 0.6) / 0.4;
            const angle = Math.PI * 8 + t * Math.PI * audioIntensity;
            const distance = maxSize * (1.0 + t * 2.5);
            const heroicRise = t * t * 1.5; // Quadratic rise
            
            this.camera.position.set(
                center.x + Math.cos(angle) * distance,
                center.y + maxSize * (0.6 + heroicRise),
                center.z + Math.sin(angle) * distance
            );
        }
        
        // Music-reactive look target
        const lookTarget = center.clone();
        lookTarget.y += maxSize * (0.2 + audioIntensity * 0.1);
        this.camera.lookAt(lookTarget);
        
        // Audio-reactive camera shake
        if (audioIntensity > 1.2) {
            const shakeIntensity = (audioIntensity - 1.2) * 0.02;
            this.camera.position.x += (Math.random() - 0.5) * shakeIntensity;
            this.camera.position.y += (Math.random() - 0.5) * shakeIntensity;
        }
    }
    
    exitSuperheroMode() {
        // Fade out music first
        if (this.superheroAudio) {
            this.fadeOutAudio();
            setTimeout(() => {
                if (this.superheroAudio) {
                    this.superheroAudio.stop ? this.superheroAudio.stop() : this.superheroAudio.pause();
                    this.superheroAudio = null;
                }
            }, 1000);
        }
        
        this.superheroMode = false;
        this.controls.enabled = true;
        
        // Restore original settings
        if (this.originalCameraPos) {
            this.camera.position.copy(this.originalCameraPos.position);
            this.controls.target.copy(this.originalCameraPos.target);
        }
        
        // Restore original scene
        this.scene.background = this.originalBackground;
        this.scene.fog = this.originalFog;
        
        // Reset lighting
        this.lights.ambient.intensity = 0.4;
        this.lights.directional.intensity = 1.0;
        this.lights.directional.position.set(5, 5, 5);
        
        // Remove superhero lights
        if (this.spotlight) {
            this.scene.remove(this.spotlight);
            this.scene.remove(this.spotlight.target);
            this.spotlight = null;
        }
        if (this.rimLight) {
            this.scene.remove(this.rimLight);
            this.rimLight = null;
        }
        
        // Reset bloom
        if (this.bloomPass) {
            this.bloomPass.enabled = false;
            this.bloomPass.strength = 1.5;
            this.bloomPass.radius = 0.4;
            this.bloomPass.threshold = 0.85;
        }
        
        this.controls.update();
    }
    
    playAmbientDrone() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(audioContext.destination);
            
            // Low ambient drone
            osc.frequency.setValueAtTime(55, audioContext.currentTime);
            osc.type = 'sine';
            
            gain.gain.setValueAtTime(0, audioContext.currentTime);
            gain.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.5);
            gain.gain.linearRampToValueAtTime(0.001, audioContext.currentTime + 1.0);
            
            osc.start();
            osc.stop(audioContext.currentTime + 1.0);
        } catch (e) {
            console.log('Audio context not supported');
        }
    }
    
    async playBassThump() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // --- Master output
            const masterGain = audioContext.createGain();
            masterGain.gain.value = 0.9;
            masterGain.connect(audioContext.destination);

            // --- REVERB tail
            const convolver = audioContext.createConvolver();
            convolver.connect(masterGain);

            // --- Load an impulse response file for reverb (required for cinematic feel)
            const reverbBuffer = await fetch('impulse-response.wav') // you need this file
                .then(r => r.arrayBuffer())
                .then(b => audioContext.decodeAudioData(b));
            convolver.buffer = reverbBuffer;

            // --- Layer 1: Deep BASS sine
            const osc1 = audioContext.createOscillator();
            const gain1 = audioContext.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(40, audioContext.currentTime);
            gain1.gain.setValueAtTime(1.0, audioContext.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 2.5);
            osc1.connect(gain1);
            gain1.connect(convolver);
            osc1.start();
            osc1.stop(audioContext.currentTime + 2.5);

            // --- Layer 2: Higher frequency punch (adds realism)
            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(120, audioContext.currentTime);
            gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.0);
            osc2.connect(gain2);
            gain2.connect(convolver);
            osc2.start();
            osc2.stop(audioContext.currentTime + 1.0);

            // --- Layer 3: Low rumble (optional)
            const rumble = audioContext.createOscillator();
            const rumbleGain = audioContext.createGain();
            rumble.type = 'sawtooth';
            rumble.frequency.setValueAtTime(10, audioContext.currentTime);
            rumbleGain.gain.setValueAtTime(0.2, audioContext.currentTime);
            rumbleGain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 3.0);
            rumble.connect(rumbleGain);
            rumbleGain.connect(convolver);
            rumble.start();
            rumble.stop(audioContext.currentTime + 3.0);

            // Optional: Ambient fade-in before thump
            // Use setTimeout(() => this.playCinematicThump(), 4000) to delay

        } catch (err) {
            console.error("Error playing thump:", err);
        }
    }

    
    loadAudioFile(file) {
        const supportedFormats = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma'];
        const extension = file.name.split('.').pop().toLowerCase();
        
        if (!supportedFormats.includes(extension)) {
            this.showError('Unsupported audio format. Please use MP3, WAV, OGG, M4A, AAC, FLAC, or WMA.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const blob = new Blob([e.target.result], { type: file.type });
            this.customAudioFile = URL.createObjectURL(blob);
            
            // Update UI
            const indicator = document.querySelector('.audio-indicator');
            const clearBtn = document.getElementById('clearAudio');
            indicator.textContent = `🎵 ${file.name} loaded`;
            clearBtn.style.display = 'block';
        };
        reader.readAsArrayBuffer(file);
    }
    
    clearCustomAudio() {
        if (this.customAudioFile) {
            URL.revokeObjectURL(this.customAudioFile);
            this.customAudioFile = null;
        }
        
        const indicator = document.querySelector('.audio-indicator');
        const clearBtn = document.getElementById('clearAudio');
        indicator.textContent = '🎵 Default theme loaded';
        clearBtn.style.display = 'none';
    }
    
    playSuperheroMusic() {
        try {
            const audioSource = this.customAudioFile || 'superhero-theme.mp3';
            
            // Use HTML5 Audio for better compatibility
            this.superheroAudio = new Audio(audioSource);
            this.superheroAudio.volume = 0;
            this.superheroAudio.play().then(() => {
                this.fadeInAudio();
            }).catch(e => {
                console.log('Audio play failed:', e);
            });
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    
    fadeInAudio() {
        if (!this.superheroAudio) return;
        
        if (this.superheroAudio.paused) {
            this.superheroAudio.play();
        }
        
        const fadeIn = () => {
            if (this.superheroAudio.volume < 0.7) {
                this.superheroAudio.volume = Math.min(0.7, this.superheroAudio.volume + 0.02);
                setTimeout(fadeIn, 50);
            }
        };
        fadeIn();
    }
    
    fadeOutAudio() {
        if (!this.superheroAudio) return;
        
        const fadeOut = () => {
            if (this.superheroAudio.volume > 0) {
                this.superheroAudio.volume = Math.max(0, this.superheroAudio.volume - 0.02);
                setTimeout(fadeOut, 50);
            } else {
                this.superheroAudio.pause();
            }
        };
        fadeOut();
    }
}

// Initialize the viewer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.modelViewer = new ModelViewer();
});

// Sample models for testing
const sampleModels = [
    'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf',
    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF/Duck.gltf',
    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Avocado/glTF/Avocado.gltf'
];

// Initialize sample model buttons after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add sample button functionality
    setTimeout(() => {
        document.querySelectorAll('.sample-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const url = btn.dataset.url;
                document.getElementById('modelUrl').value = url;
                // Trigger load if viewer is ready
                if (window.modelViewer) {
                    window.modelViewer.loadModelFromUrl(url);
                }
            });
        });
    }, 100);
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('Sample models available:', sampleModels);
    }
});