import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// Other loaders would be imported here as needed

export class Viewer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.currentModel = null;
        this.mixer = null;
        this.clock = new THREE.Clock();

        this.init();
        this.animate();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf0f0f0);

        this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.camera.position.set(5, 5, 5);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        // Basic lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambient);
        const directional = new THREE.DirectionalLight(0xffffff, 1);
        directional.position.set(5, 5, 5);
        directional.castShadow = true;
        this.scene.add(directional);

        window.addEventListener('resize', () => this.onWindowResize());
    }

    loadModelFromUrl(url) {
        const loader = new GLTFLoader(); // Simplified for this example
        loader.load(url, (gltf) => {
            if (this.currentModel) {
                this.scene.remove(this.currentModel);
                // Proper disposal would happen here
            }
            this.currentModel = gltf.scene;
            this.scene.add(this.currentModel);
            this.fitCameraToModel();
        });
    }

    loadDefaultModel() {
        const defaultModelUrl = 'https://threejs.org/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf';
        this.loadModelFromUrl(defaultModelUrl);
    }

    fitCameraToModel() {
        // Simplified version
        const box = new THREE.Box3().setFromObject(this.currentModel);
        const center = box.getCenter(new THREE.Vector3());
        this.controls.target.copy(center);
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
