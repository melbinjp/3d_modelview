import * as THREE from 'three';
import { CinematicEngine } from './src/cinematic/CinematicEngine.js';

export class SuperheroMode {
    constructor(viewer) {
        this.viewer = viewer;
        this.superheroMode = false;
        
        // Enhanced cinematic engine
        this.cinematicEngine = new CinematicEngine(this.viewer.renderingEngine || this.viewer);
        this.useCinematicMode = true; // Flag to use new cinematic system
        this.originalCameraPos = null;
        this.superheroAudio = null;
        this.audioContext = null;
        this.audioSource = null;
        this.audioAnalyser = null;
        this.customAudioFile = null;
        this.superheroAnimationPaused = false;
        this.smoothedAudioIntensity = 0;
        this.CAMERA_ANIMATION_STATES = {
            NONE: 'NONE',
            ANCHOR: 'ANCHOR',
            DOLLY: 'DOLLY',
            CRANE: 'CRANE',
            ORBIT: 'ORBIT',
            STILL: 'STILL'
        };
        this.cameraAnimationState = this.CAMERA_ANIMATION_STATES.NONE;
        this.stateEnterTime = 0;
        this.dollyStartPos = new THREE.Vector3();
        this.dollyEndPos = new THREE.Vector3();
        this.craneEndPos = new THREE.Vector3();
        this.beatDetected = false;
        this.lastBeatTime = 0;
        this.icons = {
            superhero: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-3zM12 11l-4 4 1.41 1.41L12 13.83l2.59 2.58L16 15l-4-4z"/></svg>`,
            close: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18"/><path d="M6 6L18 18"/></svg>`
        };

        document.getElementById('superheroBtn').innerHTML = this.icons.superhero;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('superheroBtn').addEventListener('click', () => {
            if (this.superheroMode) {
                this.exitSuperheroMode();
            } else {
                this.activateSuperheroMode();
            }
        });

        document.getElementById('superheroPlay').addEventListener('click', () => {
            this.superheroAnimationPaused = false;
            if (this.superheroAudio) this.superheroAudio.play();
        });
        document.getElementById('superheroPause').addEventListener('click', () => {
            this.superheroAnimationPaused = true;
            if (this.superheroAudio) this.superheroAudio.pause();
        });
        document.getElementById('superheroReset').addEventListener('click', () => {
            this.superheroAnimationPaused = false;
            if (this.superheroMode) {
                this.superheroStartTime = Date.now();
                if (this.superheroAudio) {
                    this.superheroAudio.currentTime = 0;
                    this.superheroAudio.play();
                }
            }
        });

        const audioDrop = document.getElementById('audioDrop');
        const audioInput = document.getElementById('audioInput');
        audioDrop.addEventListener('click', () => audioInput.click());
        audioDrop.addEventListener('dragover', (e) => { e.preventDefault(); audioDrop.classList.add('dragover'); });
        audioDrop.addEventListener('dragleave', () => audioDrop.classList.remove('dragover'));
        audioDrop.addEventListener('drop', (e) => {
            e.preventDefault();
            audioDrop.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) this.loadAudioFile(e.dataTransfer.files[0]);
        });
        audioInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) this.loadAudioFile(e.target.files[0]);
        });
        document.getElementById('clearAudio').addEventListener('click', () => this.clearCustomAudio());
    }

    activateSuperheroMode() {
        // Check if there's a current model in the new architecture
        const currentModel = this.viewer.core?.getState()?.currentModel || this.viewer.currentModel;
        if (!currentModel) {
            console.warn('No model loaded - cannot activate superhero mode');
            return;
        }

        // Use enhanced cinematic mode if available
        if (this.useCinematicMode && this.cinematicEngine) {
            this.activateCinematicSuperheroMode();
            return;
        }

        // Fallback to original mode - access camera through rendering engine
        const camera = this.viewer.renderingEngine?.camera || this.viewer.camera;
        const controls = this.viewer.renderingEngine?.controls || this.viewer.controls;
        
        if (!camera || !controls) {
            console.error('Camera or controls not available for superhero mode');
            return;
        }
        
        this.originalCameraPos = {
            position: camera.position.clone(),
            target: controls.target.clone()
        };

        const overlay = document.getElementById('fadeOverlay');
        overlay.classList.remove('hidden');
        overlay.classList.add('pitch-black');

        this.playAmbientDrone();
        setTimeout(() => this.playBassThump(), 1000);
        setTimeout(() => this.playSuperheroMusic(), 3000);

        setTimeout(() => {
            document.body.classList.add('superhero-mode-active');
            this.superheroMode = true;
            controls.enabled = false;

            this.cameraAnimationState = this.CAMERA_ANIMATION_STATES.ANCHOR;
            this.stateEnterTime = Date.now();

            document.getElementById('superheroControls').classList.remove('hidden');
            document.getElementById('superheroBtn').innerHTML = this.icons.close;

            const sidebar = document.getElementById('sidebar');
            if (!sidebar.classList.contains('collapsed')) {
                sidebar.classList.add('collapsed');
                document.getElementById('sidebarToggleBtn').classList.remove('active');
            }

            const scene = this.viewer.renderingEngine?.scene || this.viewer.scene;
            if (scene) {
                this.originalBackground = scene.background;
                this.originalFog = scene.fog;

                scene.background = new THREE.Color(0x000000);
                scene.fog = new THREE.Fog(0x000000, 5, 30);
            }

            const bloomPass = this.viewer.renderingEngine?.bloomPass || this.viewer.bloomPass;
            if (bloomPass) {
                bloomPass.enabled = true;
                bloomPass.strength = 0.4;
                bloomPass.radius = 0.3;
                bloomPass.threshold = 0.7;
            }

            const lights = this.viewer.renderingEngine?.lights || this.viewer.lights;
            if (lights) {
                lights.ambient.intensity = 0.1;
                lights.directional.intensity = 0.5;
            }

            const box = new THREE.Box3().setFromObject(currentModel);
            const center = box.getCenter(new THREE.Vector3());
            const boundingSphere = new THREE.Sphere();
            box.getBoundingSphere(boundingSphere);
            const radius = boundingSphere.radius;

            // Aspect ratio correction
            const aspect = camera.aspect;
            const aspectFactor = aspect < 1 ? 1 / aspect : 1;

            // Define camera positions using bounding sphere radius
            this.dollyStartPos.set(center.x, center.y + radius * 0.5, center.z + radius * 2.5 * aspectFactor);
            this.dollyEndPos.set(center.x, center.y, center.z + radius * 1.5 * aspectFactor);
            this.craneEndPos.set(center.x, center.y + radius, center.z + radius * 1.8 * aspectFactor);

            this.spotlight = new THREE.SpotLight(0xffffff, 2.0, 0, Math.PI / 6, 0.3);
            this.spotlight.position.set(center.x, center.y + radius * 4, center.z);
            this.spotlight.target.position.copy(center);
            this.spotlight.castShadow = true;
            if (scene) {
                scene.add(this.spotlight);
                scene.add(this.spotlight.target);
            }

            const size = new THREE.Vector3();
            box.getSize(size);
            const maxSize = Math.max(size.x, size.y, size.z);
            this.rimLight = new THREE.DirectionalLight(0x4488ff, 1.2);
            this.rimLight.position.set(center.x - maxSize, center.y, center.z - maxSize);
            if (scene) {
                scene.add(this.rimLight);
            }

            this.superheroStartTime = Date.now() - 3000;

            setTimeout(() => {
                overlay.classList.remove('pitch-black');
                overlay.classList.add('active');
                setTimeout(() => {
                    overlay.classList.remove('active');
                    setTimeout(() => overlay.classList.add('hidden'), 800);
                }, 1500);
            }, 500);

            setTimeout(() => this.exitSuperheroMode(), 30000);
        }, 1000);
    }

    /**
     * Activate enhanced cinematic superhero mode
     */
    async activateCinematicSuperheroMode() {
        // Check if there's a current model in the new architecture
        const currentModel = this.viewer.core?.getState()?.currentModel || this.viewer.currentModel;
        if (!currentModel) {
            console.warn('No model loaded - cannot activate cinematic superhero mode');
            return;
        }

        // Access camera and controls through rendering engine
        const camera = this.viewer.renderingEngine?.camera || this.viewer.camera;
        const controls = this.viewer.renderingEngine?.controls || this.viewer.controls;
        
        if (!camera || !controls) {
            console.error('Camera or controls not available for cinematic superhero mode');
            return;
        }

        // Store original state
        this.originalCameraPos = {
            position: camera.position.clone(),
            target: controls.target.clone()
        };

        // Setup UI
        const overlay = document.getElementById('fadeOverlay');
        overlay.classList.remove('hidden');
        overlay.classList.add('pitch-black');

        document.body.classList.add('superhero-mode-active');
        this.superheroMode = true;
        controls.enabled = false;

        document.getElementById('superheroControls').classList.remove('hidden');
        document.getElementById('superheroBtn').innerHTML = this.icons.close;

        // Collapse sidebar
        const sidebar = document.getElementById('sidebar');
        if (!sidebar.classList.contains('collapsed')) {
            sidebar.classList.add('collapsed');
            document.getElementById('sidebarToggleBtn').classList.remove('active');
        }

        // Play audio and setup analysis
        this.playAmbientDrone();
        setTimeout(() => this.playBassThump(), 1000);
        
        // Start cinematic sequence after audio setup
        setTimeout(async () => {
            // Setup audio for cinematic engine
            let audioElement = null;
            if (this.customAudioFile || true) { // Always try to play music
                audioElement = new Audio(this.customAudioFile || 'superhero-theme.mp3');
                audioElement.volume = 0;
                
                try {
                    await audioElement.play();
                    this.superheroAudio = audioElement;
                    this.setupAudioAnalysis();
                    this.fadeInAudio();
                } catch (e) {
                    console.log('Audio play failed:', e);
                }
            }

            // Start cinematic reveal
            try {
                const cinematicOptions = {
                    audio: audioElement,
                    model: currentModel,
                    environmentType: this.selectEnvironmentType(),
                    onComplete: () => {
                        console.log('Cinematic sequence completed');
                        // Auto-exit after sequence or keep in hero pose
                        setTimeout(() => this.exitSuperheroMode(), 5000);
                    }
                };

                const result = await this.cinematicEngine.startReveal(cinematicOptions);
                console.log(`Started cinematic sequence: ${result.sequenceName}, duration: ${result.duration}s`);

                // Remove overlay after cinematic starts
                setTimeout(() => {
                    overlay.classList.remove('pitch-black');
                    overlay.classList.add('active');
                    setTimeout(() => {
                        overlay.classList.remove('active');
                        setTimeout(() => overlay.classList.add('hidden'), 800);
                    }, 1500);
                }, 500);

            } catch (error) {
                console.error('Failed to start cinematic sequence:', error);
                // Fallback to original mode
                this.useCinematicMode = false;
                this.activateSuperheroMode();
            }
        }, 3000);
    }

    /**
     * Select environment type based on model characteristics or user preference
     */
    selectEnvironmentType() {
        // Could be enhanced to analyze model type or allow user selection
        const environments = ['cosmic_scene', 'stormy_skies', 'urban_landscape', 'heroic_dawn', 'studio_setup'];
        
        // For now, select based on time of day or random
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12) {
            return 'heroic_dawn';
        } else if (hour >= 18 || hour < 6) {
            return 'cosmic_scene';
        } else {
            return environments[Math.floor(Math.random() * environments.length)];
        }
    }

    updateSuperheroCamera() {
        const currentModel = this.viewer.core?.getState()?.currentModel || this.viewer.currentModel;
        if (!this.superheroMode || !currentModel) return;
        
        const camera = this.viewer.renderingEngine?.camera || this.viewer.camera;

        const now = Date.now();
        const stateElapsedTime = (now - this.stateEnterTime) / 1000;

        let rawIntensity = 0;
        if (this.audioAnalyser) {
            const dataArray = new Uint8Array(this.audioAnalyser.frequencyBinCount);
            this.audioAnalyser.getByteFrequencyData(dataArray);

            const bassBins = dataArray.slice(0, Math.floor(dataArray.length * 0.2));
            const averageBass = bassBins.reduce((a, b) => a + b, 0) / bassBins.length;
            rawIntensity = averageBass / 128;

            const smoothingFactor = 0.05;
            this.smoothedAudioIntensity += (rawIntensity - this.smoothedAudioIntensity) * smoothingFactor;

            const beatThreshold = 0.4;
            const beatCooldown = 1.0;
            if (rawIntensity > (this.smoothedAudioIntensity + beatThreshold) && (now - this.lastBeatTime) / 1000 > beatCooldown) {
                this.beatDetected = true;
                this.lastBeatTime = now;
            } else {
                this.beatDetected = false;
            }
        }

        const box = new THREE.Box3().setFromObject(currentModel);
        const center = box.getCenter(new THREE.Vector3());

        switch (this.cameraAnimationState) {
            case this.CAMERA_ANIMATION_STATES.ANCHOR:
                camera.position.copy(this.dollyStartPos);
                if (stateElapsedTime > 1.5) {
                    this.cameraAnimationState = this.CAMERA_ANIMATION_STATES.DOLLY;
                    this.stateEnterTime = now;
                }
                break;
            case this.CAMERA_ANIMATION_STATES.DOLLY:
                const dollyDuration = 3.0;
                const dollyProgress = Math.min(stateElapsedTime / dollyDuration, 1.0);
                camera.position.lerpVectors(this.dollyStartPos, this.dollyEndPos, dollyProgress);

                if (this.beatDetected || dollyProgress >= 1.0) {
                    this.cameraAnimationState = this.CAMERA_ANIMATION_STATES.CRANE;
                    this.stateEnterTime = now;
                }
                break;
            case this.CAMERA_ANIMATION_STATES.CRANE:
                const craneDuration = 2.0;
                const craneProgress = Math.min(stateElapsedTime / craneDuration, 1.0);
                camera.position.lerpVectors(this.dollyEndPos, this.craneEndPos, craneProgress);
                if (craneProgress >= 1.0) {
                    this.cameraAnimationState = this.CAMERA_ANIMATION_STATES.ORBIT;
                    this.stateEnterTime = now;
                }
                break;
            case this.CAMERA_ANIMATION_STATES.ORBIT:
                const orbitDuration = 4.0;
                const orbitSpeed = 0.4 + this.smoothedAudioIntensity * 0.2;
                const orbitRadius = camera.position.distanceTo(center);
                const orbitAngle = stateElapsedTime * orbitSpeed;

                camera.position.x = center.x + Math.cos(orbitAngle) * orbitRadius;
                camera.position.z = center.z + Math.sin(orbitAngle) * orbitRadius;
                camera.position.y = this.craneEndPos.y + Math.sin(stateElapsedTime * 2) * (orbitRadius * 0.1 * this.smoothedAudioIntensity);

                if (stateElapsedTime > orbitDuration || (this.superheroAudio && this.superheroAudio.volume < 0.1)) {
                    this.cameraAnimationState = this.CAMERA_ANIMATION_STATES.STILL;
                    this.stateEnterTime = now;
                }
                break;
            case this.CAMERA_ANIMATION_STATES.STILL:
                break;
            case this.CAMERA_ANIMATION_STATES.NONE:
            default:
                break;
        }

        camera.lookAt(center);
    }

    exitSuperheroMode() {
        // Stop cinematic engine if active
        if (this.useCinematicMode && this.cinematicEngine) {
            this.cinematicEngine.stopReveal();
        }

        if (this.superheroAudio) {
            this.fadeOutAudio();
        }

        if (this.audioSource) {
            this.audioSource.disconnect();
            this.audioSource = null;
            this.audioAnalyser = null;
            this.audioContext = null;
        }
        this.smoothedAudioIntensity = 0;
        this.cameraAnimationState = this.CAMERA_ANIMATION_STATES.NONE;

        document.body.classList.remove('superhero-mode-active');
        this.superheroMode = false;
        
        const camera = this.viewer.renderingEngine?.camera || this.viewer.camera;
        const controls = this.viewer.renderingEngine?.controls || this.viewer.controls;
        
        if (controls) {
            controls.enabled = true;
        }

        document.getElementById('superheroControls').classList.add('hidden');
        document.getElementById('superheroBtn').innerHTML = this.icons.superhero;

        if (this.originalCameraPos && camera && controls) {
            camera.position.copy(this.originalCameraPos.position);
            controls.target.copy(this.originalCameraPos.target);
        }

        const scene = this.viewer.renderingEngine?.scene || this.viewer.scene;
        if (scene) {
            scene.background = this.originalBackground;
            scene.fog = this.originalFog;
        }

        const lights = this.viewer.renderingEngine?.lights || this.viewer.lights;
        if (lights) {
            lights.ambient.intensity = 0.4;
            lights.directional.intensity = 1.0;
            lights.directional.position.set(5, 5, 5);
        }

        if (this.spotlight && scene) {
            scene.remove(this.spotlight);
            scene.remove(this.spotlight.target);
            this.spotlight = null;
        }
        if (this.rimLight && scene) {
            scene.remove(this.rimLight);
            this.rimLight = null;
        }

        const bloomPass = this.viewer.renderingEngine?.bloomPass || this.viewer.bloomPass;
        if (bloomPass) {
            bloomPass.enabled = false;
            bloomPass.strength = 1.5;
            bloomPass.radius = 0.4;
            bloomPass.threshold = 0.85;
        }

        if (controls) {
            controls.update();
        }
    }

    playAmbientDrone() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
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

    playBassThump() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const masterGain = audioContext.createGain();
            masterGain.gain.value = 0.9;
            masterGain.connect(audioContext.destination);

            const osc1 = audioContext.createOscillator();
            const gain1 = audioContext.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(40, audioContext.currentTime);
            gain1.gain.setValueAtTime(1.0, audioContext.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 2.5);
            osc1.connect(gain1);
            gain1.connect(masterGain);
            osc1.start();
            osc1.stop(audioContext.currentTime + 2.5);

            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(120, audioContext.currentTime);
            gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.0);
            osc2.connect(gain2);
            gain2.connect(masterGain);
            osc2.start();
            osc2.stop(audioContext.currentTime + 1.0);

            const rumble = audioContext.createOscillator();
            const rumbleGain = audioContext.createGain();
            rumble.type = 'sawtooth';
            rumble.frequency.setValueAtTime(10, audioContext.currentTime);
            rumbleGain.gain.setValueAtTime(0.2, audioContext.currentTime);
            rumbleGain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 3.0);
            rumble.connect(rumbleGain);
            rumbleGain.connect(masterGain);
            rumble.start();
            rumble.stop(audioContext.currentTime + 3.0);
        } catch (err) {
            console.error("Error playing thump:", err);
        }
    }

    setupAudioAnalysis() {
        if (this.audioContext) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.audioSource = this.audioContext.createMediaElementSource(this.superheroAudio);
            this.audioAnalyser = this.audioContext.createAnalyser();

            this.audioSource.connect(this.audioAnalyser);
            this.audioAnalyser.connect(this.audioContext.destination);

            this.audioAnalyser.fftSize = 256;
        } catch (e) {
            console.error("Web Audio API is not supported in this browser.", e);
        }
    }

    loadAudioFile(file) {
        const supportedFormats = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma'];
        const extension = file.name.split('.').pop().toLowerCase();

        if (!supportedFormats.includes(extension)) {
            this.viewer.showError('Unsupported audio format. Please use MP3, WAV, OGG, M4A, AAC, FLAC, or WMA.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const blob = new Blob([e.target.result], { type: file.type });
            this.customAudioFile = URL.createObjectURL(blob);

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

            this.superheroAudio = new Audio(audioSource);
            this.superheroAudio.volume = 0;

            this.setupAudioAnalysis();

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
            if (this.superheroAudio && this.superheroAudio.volume < 0.7) {
                this.superheroAudio.volume = Math.min(0.7, this.superheroAudio.volume + 0.02);
                setTimeout(fadeIn, 50);
            }
        };
        fadeIn();
    }

    fadeOutAudio() {
        const fadeOut = () => {
            if (!this.superheroAudio || this.superheroAudio.volume <= 0) {
                if (this.superheroAudio) {
                    this.superheroAudio.pause();
                    this.superheroAudio = null;
                }
                return;
            }
            this.superheroAudio.volume = Math.max(0, this.superheroAudio.volume - 0.02);
            setTimeout(fadeOut, 50);
        };
        fadeOut();
    }

    update() {
        const currentModel = this.viewer.core?.getState()?.currentModel || this.viewer.currentModel;
        if (this.superheroMode && currentModel && !this.superheroAnimationPaused) {
            // Use cinematic engine if active, otherwise use original camera system
            if (this.useCinematicMode && this.cinematicEngine && this.cinematicEngine.isActive) {
                // Cinematic engine handles its own updates
                return;
            } else {
                this.updateSuperheroCamera();
            }
        }
    }

    /**
     * Get current cinematic state for debugging/UI
     */
    getCinematicState() {
        if (this.cinematicEngine) {
            return this.cinematicEngine.getState();
        }
        return null;
    }

    /**
     * Toggle between cinematic and original superhero mode
     */
    toggleCinematicMode() {
        this.useCinematicMode = !this.useCinematicMode;
        console.log(`Cinematic mode ${this.useCinematicMode ? 'enabled' : 'disabled'}`);
    }
}
