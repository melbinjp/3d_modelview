import { SuperheroMode } from './superhero-mode.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

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
        this.animationPaused = false;
        this.originalGroundMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 });
        this.shadowCatcherMaterial = new THREE.ShadowMaterial({ opacity: 0.5 });
        
        this.isMeasuring = false;
        this.measurementPoints = [];
        this.measurementMarkers = [];
        this.measurementLine = null;
        this.raycaster = new THREE.Raycaster();

        this.init();
        this.setupEventListeners();
        this.superhero = new SuperheroMode(this);
        this.setSidebarHeight();
        this.animate();

        const loadingText = document.querySelector('#loadingScreen p');
        loadingText.innerHTML = '🚀 Preparing your 3D experience...';
        
        setTimeout(() => {
            document.getElementById('loadingScreen').classList.add('hidden');
            document.getElementById('mainContainer').classList.remove('hidden');
            this.loadDefaultModel();
        }, 1500);
    }

    init() {
        const container = document.getElementById('viewerContainer');
        
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);
        
        this.camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
        this.camera.position.set(5, 5, 5);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
        container.appendChild(this.renderer.domElement);
        
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 1;
        this.controls.maxDistance = 100;
        
        this.setupLighting();
        this.setupPostProcessing();
        
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        this.groundPlane = new THREE.Mesh(groundGeometry, this.originalGroundMaterial);
        this.groundPlane.rotation.x = -Math.PI / 2;
        this.groundPlane.position.y = 0;
        this.groundPlane.receiveShadow = true;
        this.scene.add(this.groundPlane);
        
        this.gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0xcccccc);
        this.gridHelper.material.transparent = true;
        this.gridHelper.material.opacity = 0.3;
        this.gridHelper.visible = false;
        this.scene.add(this.gridHelper);
        
        window.addEventListener('resize', () => this.onWindowResize());

        document.getElementById('sidebar').classList.add('collapsed');
        document.getElementById('sidebarToggleBtn').classList.remove('active');
    }

    loadDefaultModel() {
        const defaultModelUrl = 'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf';
        this.loadModelFromUrl(defaultModelUrl);
        document.getElementById('modelUrl').value = defaultModelUrl;
    }

    setupLighting() {
        this.lights.ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.lights.ambient);
        
        this.lights.directional = new THREE.DirectionalLight(0xffffff, 1);
        this.lights.directional.position.set(5, 5, 5);
        this.lights.directional.castShadow = true;
        this.lights.directional.shadow.mapSize.width = 2048;
        this.lights.directional.shadow.mapSize.height = 2048;
        this.lights.directional.shadow.camera.near = 0.5;
        this.lights.directional.shadow.camera.far = 50;
        this.scene.add(this.lights.directional);
        
        const dirLightHelper = new THREE.DirectionalLightHelper(this.lights.directional, 1);
        dirLightHelper.visible = false;
        this.scene.add(dirLightHelper);
    }

    setupPostProcessing() {
        if (typeof THREE.EffectComposer !== 'undefined' && 
            typeof THREE.RenderPass !== 'undefined' && 
            typeof THREE.UnrealBloomPass !== 'undefined') {
            
            this.composer = new THREE.EffectComposer(this.renderer);
            
            const renderPass = new THREE.RenderPass(this.scene, this.camera);
            this.composer.addPass(renderPass);
            
            this.bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
            this.bloomPass.enabled = false;
            this.composer.addPass(this.bloomPass);
        } else {
            console.warn('Post-processing dependencies not loaded, using basic rendering');
            this.composer = null;
            this.bloomPass = { enabled: false };
        }
    }

    setupEventListeners() {
        document.getElementById('sidebarToggleBtn').addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            const toggleBtn = document.getElementById('sidebarToggleBtn');
            sidebar.classList.toggle('collapsed');
            toggleBtn.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const toggleBtn = document.getElementById('sidebarToggleBtn');
            if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
                sidebar.classList.add('collapsed');
                toggleBtn.classList.remove('active');
            }
        });

        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                const item = header.parentElement;
                if (item.classList.contains('is-open')) {
                    item.classList.remove('is-open');
                } else {
                    document.querySelectorAll('.accordion-item.is-open').forEach(openItem => {
                        openItem.classList.remove('is-open');
                    });
                    item.classList.add('is-open');
                }
            });
        });
        
        setTimeout(() => this.renderer.render(this.scene, this.camera), 500);
        
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

        const fileDrop = document.getElementById('fileDrop');
        const fileInput = document.getElementById('fileInput');
        fileDrop.addEventListener('click', () => fileInput.click());
        const viewerContainer = document.getElementById('viewerContainer');
        viewerContainer.addEventListener('click', (e) => this.onViewportClick(e));
        fileDrop.addEventListener('dragover', (e) => { e.preventDefault(); fileDrop.classList.add('dragover'); });
        fileDrop.addEventListener('dragleave', () => fileDrop.classList.remove('dragover'));
        fileDrop.addEventListener('drop', (e) => {
            e.preventDefault();
            fileDrop.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) this.loadModelFromFile(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) this.loadModelFromFile(e.target.files[0]);
        });

        this.setupControlListeners();
        
        document.getElementById('closeError').addEventListener('click', () => {
            document.getElementById('errorModal').classList.add('hidden');
        });
    }

    setupControlListeners() {
        document.getElementById('backgroundSelect').addEventListener('change', (e) => this.updateBackground(e.target.value));
        document.getElementById('bgColor').addEventListener('input', (e) => { this.scene.background = new THREE.Color(e.target.value); });
        document.getElementById('ambientIntensity').addEventListener('input', (e) => {
            this.lights.ambient.intensity = parseFloat(e.target.value);
            this.updateValueDisplay(e.target);
        });
        document.getElementById('envIntensity').addEventListener('input', (e) => {
            this.renderer.toneMappingExposure = parseFloat(e.target.value);
            this.updateValueDisplay(e.target);
        });
        document.getElementById('loadHdriBtn').addEventListener('click', () => {
            const url = document.getElementById('hdriUrl').value.trim();
            if (url) this.loadEnvironment(url);
        });
        document.querySelectorAll('.sample-hdri-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const url = btn.dataset.url;
                document.getElementById('hdriUrl').value = url;
                this.loadEnvironment(url);
            });
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
        document.getElementById('showGrid').addEventListener('change', (e) => { this.gridHelper.visible = e.target.checked; });
        document.getElementById('bloomEnabled').addEventListener('change', (e) => { this.bloomPass.enabled = e.target.checked; });
        document.getElementById('bloomStrength').addEventListener('input', (e) => {
            this.bloomPass.strength = parseFloat(e.target.value);
            this.updateValueDisplay(e.target);
        });
        document.getElementById('autoRotate').addEventListener('change', (e) => { this.controls.autoRotate = e.target.checked; });
        document.getElementById('rotationSpeed').addEventListener('input', (e) => {
            this.controls.autoRotateSpeed = parseFloat(e.target.value);
            this.updateValueDisplay(e.target);
        });
        document.getElementById('resetCamera').addEventListener('click', () => this.resetCamera());
        document.getElementById('fitToView').addEventListener('click', () => this.fitCameraToModel());
        document.getElementById('screenshotBtn').addEventListener('click', () => this.takeScreenshot());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportModel());
        document.getElementById('playBtn').addEventListener('click', () => {
            this.animationPaused = false;
            if (this.mixer) this.mixer.timeScale = 1;
        });
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.animationPaused = true;
            if (this.mixer) this.mixer.timeScale = 0;
        });
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.animationPaused = false;
            if (this.mixer) this.mixer.setTime(0);
        });
        document.querySelectorAll('.slider').forEach(slider => this.updateValueDisplay(slider));

        document.getElementById('measureBtn').addEventListener('click', () => this.toggleMeasurement());

        const themeToggle = document.getElementById('themeToggle');
        themeToggle.addEventListener('change', () => this.toggleTheme(themeToggle.checked));
        this.loadTheme();
    }

    toggleTheme(isDark) {
        document.body.classList.toggle('dark-mode', isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');

        // Update scene background for dark mode
        if (isDark) {
            this.scene.background = new THREE.Color(0x121212);
        } else {
            this.updateBackground(document.getElementById('backgroundSelect').value);
        }
    }

    loadTheme() {
        const theme = localStorage.getItem('theme');
        const isDark = theme === 'dark';
        document.getElementById('themeToggle').checked = isDark;
        this.toggleTheme(isDark);
    }

    addMeasurementPoint(point) {
        if (this.measurementPoints.length >= 2) {
            this.clearMeasurement();
        }

        this.measurementPoints.push(point);

        const markerGeometry = new THREE.SphereGeometry(0.05, 16, 16);
        const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.copy(point);
        this.scene.add(marker);
        this.measurementMarkers.push(marker);

        if (this.measurementPoints.length === 2) {
            const distance = this.measurementPoints[0].distanceTo(this.measurementPoints[1]);
            document.getElementById('measurementResult').textContent = `Distance: ${distance.toFixed(3)} units`;

            const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
            const lineGeometry = new THREE.BufferGeometry().setFromPoints(this.measurementPoints);
            this.measurementLine = new THREE.Line(lineGeometry, lineMaterial);
            this.scene.add(this.measurementLine);

            this.isMeasuring = false;
            const measureBtn = document.getElementById('measureBtn');
            measureBtn.textContent = 'Measure Distance';
            measureBtn.classList.remove('active');
        }
    }

    clearMeasurement() {
        this.measurementPoints = [];
        this.measurementMarkers.forEach(marker => this.scene.remove(marker));
        this.measurementMarkers = [];
        if (this.measurementLine) {
            this.scene.remove(this.measurementLine);
            this.measurementLine = null;
        }
        document.getElementById('measurementResult').textContent = '';
    }

    toggleMeasurement() {
        this.isMeasuring = !this.isMeasuring;
        const measureBtn = document.getElementById('measureBtn');
        measureBtn.textContent = this.isMeasuring ? 'Cancel Measurement' : 'Measure Distance';
        measureBtn.classList.toggle('active', this.isMeasuring);

        if (!this.isMeasuring) {
            this.clearMeasurement();
        } else {
            document.getElementById('measurementResult').textContent = 'Click on two points on the model.';
        }
    }

    onViewportClick(event) {
        if (!this.isMeasuring || !this.currentModel) return;

        const container = document.getElementById('viewerContainer');
        const rect = container.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.currentModel, true);

        if (intersects.length > 0) {
            const point = intersects[0].point;
            this.addMeasurementPoint(point);
        }
    }

    updateValueDisplay(slider) {
        const valueDisplay = slider.parentElement.querySelector('.value-display');
        if (valueDisplay) valueDisplay.textContent = parseFloat(slider.value).toFixed(1);
    }

    updateBackground(type) {
        switch (type) {
            case 'gradient':
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
                this.groundPlane.material = this.originalGroundMaterial;
                break;
            case 'solid':
                const color = document.getElementById('bgColor').value;
                this.scene.background = new THREE.Color(color);
                this.groundPlane.material = this.originalGroundMaterial;
                break;
            case 'hdri':
                const hdriCanvas = document.createElement('canvas');
                hdriCanvas.width = 1024;
                hdriCanvas.height = 512;
                const hdriCtx = hdriCanvas.getContext('2d');
                
                const skyGradient = hdriCtx.createLinearGradient(0, 0, 0, 512);
                skyGradient.addColorStop(0, '#87CEEB');
                skyGradient.addColorStop(0.7, '#98D8E8');
                skyGradient.addColorStop(1, '#F0F8FF');
                hdriCtx.fillStyle = skyGradient;
                hdriCtx.fillRect(0, 0, 1024, 512);
                
                hdriCtx.beginPath();
                hdriCtx.arc(800, 100, 50, 0, Math.PI * 2);
                hdriCtx.fillStyle = '#FFF8DC';
                hdriCtx.fill();
                
                const hdriTexture = new THREE.CanvasTexture(hdriCanvas);
                hdriTexture.mapping = THREE.EquirectangularReflectionMapping;
                this.scene.background = hdriTexture;
                this.scene.environment = hdriTexture;
                this.groundPlane.material = this.shadowCatcherMaterial;
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

    loadEnvironment(url) {
        if (!url) return;
        this.showProgress(true, 'Loading Environment...');

        new THREE.RGBELoader().load(url, (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            this.scene.background = texture;
            this.scene.environment = texture;
            this.groundPlane.material = this.shadowCatcherMaterial;
            this.showProgress(false);
        }, (progress) => {
            if (progress.lengthComputable) {
                this.updateProgress(progress.loaded / progress.total);
            }
        }, (error) => {
            console.error('Error loading environment:', error);
            this.showError('Failed to load environment from URL.');
            this.showProgress(false);
        });
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
            case 'glb': case 'gltf': return new THREE.GLTFLoader();
            case 'fbx': return new THREE.FBXLoader();
            case 'obj': return new THREE.OBJLoader();
            case 'dae': return new THREE.ColladaLoader();
            case 'stl': return new THREE.STLLoader();
            case 'ply': return new THREE.PLYLoader();
            default: return null;
        }
    }

    onModelLoaded(loadedModel) {
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
        }

        let model;
        if (loadedModel.scene) {
            model = loadedModel.scene;
        } else if (loadedModel.isBufferGeometry || loadedModel.isGeometry) {
            const material = new THREE.MeshPhongMaterial({ color: 0x888888 });
            model = new THREE.Mesh(loadedModel, material);
        } else {
            model = loadedModel;
        }

        this.currentModel = model;
        this.scene.add(model);

        if (loadedModel.animations && loadedModel.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(model);
            loadedModel.animations.forEach(clip => {
                this.mixer.clipAction(clip).play();
            });
        }

        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        this.updateModelStats(model);
        this.updateHierarchy(model);
        this.onWindowResize();
        this.fitCameraToModel();
        requestAnimationFrame(() => this.renderer.render(this.scene, this.camera));
        this.showProgress(false);
    }

    updateHierarchy(model) {
        const hierarchyContainer = document.getElementById('hierarchyContainer');
        hierarchyContainer.innerHTML = '';
        const ul = document.createElement('ul');
        ul.className = 'hierarchy-list';

        const createHierarchyItem = (object, depth) => {
            const li = document.createElement('li');
            li.style.paddingLeft = `${depth * 15}px`;

            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = object.visible;
            checkbox.addEventListener('change', () => {
                object.visible = checkbox.checked;
            });

            const span = document.createElement('span');
            span.textContent = object.name || `[${object.type}]`;

            label.appendChild(checkbox);
            label.appendChild(span);
            li.appendChild(label);

            if (object.children.length > 0) {
                const childUl = document.createElement('ul');
                object.children.forEach(child => {
                    childUl.appendChild(createHierarchyItem(child, depth + 1));
                });
                li.appendChild(childUl);
            }

            return li;
        };

        ul.appendChild(createHierarchyItem(model, 0));
        hierarchyContainer.appendChild(ul);
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
        const center = box.getCenter(new THREE.Vector3());
        
        if (box.min.y < 0) {
            this.currentModel.position.y = -box.min.y;
            box.setFromObject(this.currentModel);
            center.copy(box.getCenter(new THREE.Vector3()));
        }

        const boundingSphere = new THREE.Sphere();
        box.getBoundingSphere(boundingSphere);
        const radius = boundingSphere.radius;
        
        const distance = radius / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2));
        
        this.camera.position.set(center.x, center.y + radius * 0.4, center.z + distance);
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
        const link = document.createElement('a');
        link.download = 'model-screenshot.png';
        link.href = this.renderer.domElement.toDataURL();
        link.click();
    }

    exportModel() {
        if (!this.currentModel) {
            this.showError('No model to export.');
            return;
        }

        const exporter = new GLTFExporter();
        const options = {
            binary: true, // Export as GLB
        };

        exporter.parse(
            this.currentModel,
            (result) => {
                const blob = new Blob([result], { type: 'application/octet-stream' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'model.glb';
                link.click();
            },
            (error) => {
                this.showError('An error occurred during export.');
                console.error('An error happened during parsing', error);
            },
            options
        );
    }

    showError(message) {
        document.getElementById('errorMessage').textContent = message;
        document.getElementById('errorModal').classList.remove('hidden');
    }

    onWindowResize() {
        this.setSidebarHeight();
        const container = document.getElementById('viewerContainer');
        const width = container.clientWidth;
        const height = container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        if (this.composer) {
            this.composer.setSize(width, height);
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    setSidebarHeight() {
        const sidebar = document.getElementById('sidebar');
        sidebar.style.height = window.innerHeight + 'px';
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta();

        if (!this.superhero.superheroMode) {
            this.controls.update();
        }

        if (this.mixer && !this.animationPaused) {
            this.mixer.update(delta);
        }
        
        this.superhero.update();

        this.stats.fps = Math.round(1 / delta);
        document.getElementById('fpsCounter').textContent = this.stats.fps;

        if (this.composer && this.bloomPass.enabled) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
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
    setTimeout(() => {
        document.querySelectorAll('.sample-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const url = btn.dataset.url;
                document.getElementById('modelUrl').value = url;
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