// Enhanced Superhero Mode - Complete Cinematic Experience
// This file contains all the advanced superhero mode functions that can be integrated into the main ModelViewer class

// Add these properties to your ModelViewer constructor:
/*
this.cinematicLights = [];
this.energyParticles = null;
this.lensFlare = null;
this.beatDetected = false;
this.lastBeatTime = 0;
this.beatThreshold = 100;
this.musicTimeline = null;
this.currentBeat = 0;
this.beatHistory = [];
this.keyLight = null;
this.originalLights = null;
*/

const SuperheroMode = {
    activateSuperheroMode() {
        if (!this.currentModel || this.superheroMode) return;
        
        // Store original camera position and scene state
        this.originalCameraPos = {
            position: this.camera.position.clone(),
            target: this.controls.target.clone()
        };
        this.originalBackground = this.scene.background;
        this.originalFog = this.scene.fog;
        this.originalLights = {
            ambientIntensity: this.lights.ambient.intensity,
            directionalIntensity: this.lights.directional.intensity,
            directionalPosition: this.lights.directional.position.clone()
        };
        
        // Reset cinematic state
        this.resetCinematicState();
        
        // Initialize cinematic system
        this.initCinematicSystem();
        
        // Start the sequence
        this.superheroMode = true;
        this.controls.enabled = false;
        
        // Create cinematic overlays
        this.setupCinematicOverlays();
        
        // Phase 1: INTRO (0-3s) - Build tension in complete darkness
        const overlay = document.getElementById('fadeOverlay');
        overlay.classList.remove('hidden');
        overlay.classList.add('pitch-black');
        this.playAmbientDrone();
        
        // Phase 2: IMPACT (3-4.5s) - The big reveal moment
        setTimeout(() => {
            this.playBassThump();
            this.createEnergyBurst();
        }, 3000);
        
        // Phase 3: REVEAL (4.5-9.5s) - Dramatic lighting reveal
        setTimeout(() => {
            this.setupRevealLighting();
            this.playSuperheroMusic();
        }, 4500);
        
        // Phase 4: SHOWCASE (9.5-24.5s) - Full cinematic showcase
        setTimeout(() => {
            this.setupShowcaseElements();
            this.superheroStartTime = Date.now();
            this.setupMusicTimeline();
        }, 9500);
        
        // Phase 5: FINALE (24.5-29.5s) - Climactic finish
        setTimeout(() => {
            this.addLensFlareDrama();
        }, 24500);
        
        // Phase 6: EXIT (29.5-30.5s) - Smooth transition back
        setTimeout(() => {
            this.exitSuperheroMode();
        }, 29500);
    },

    resetCinematicState() {
        this.cinematicLights = [];
        this.energyParticles = null;
        this.lensFlare = null;
        this.beatDetected = false;
        this.lastBeatTime = 0;
        this.beatThreshold = 100;
        this.musicTimeline = null;
        this.currentBeat = 0;
        this.beatHistory = [];
    },

    initCinematicSystem() {
        // Setup audio listener if not exists
        if (!this.audioListener) {
            this.audioListener = new THREE.AudioListener();
            this.camera.add(this.audioListener);
        }
        
        // Setup cinematic bloom
        if (this.bloomPass) {
            this.bloomPass.enabled = true;
            this.bloomPass.strength = 1.0;
            this.bloomPass.radius = 0.4;
            this.bloomPass.threshold = 0.7;
        }
        
        // Reset scene to cinematic mode
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.Fog(0x000000, 1, 30);
        
        // Dim existing lights
        this.lights.ambient.intensity = 0.1;
        this.lights.directional.intensity = 0.2;
    },

    getCurrentTimelinePhase(elapsed) {
        if (!this.musicTimeline) return { 
            name: 'mainTheme', 
            start: 0, 
            duration: 30000, 
            progress: elapsed / 30000 
        };
        
        for (const [name, phase] of Object.entries(this.musicTimeline)) {
            if (elapsed >= phase.start && elapsed < phase.start + phase.duration) {
                return {
                    name,
                    start: phase.start,
                    duration: phase.duration,
                    progress: (elapsed - phase.start) / phase.duration
                };
            }
        }
        
        return null;
    },

    setupMusicTimeline() {
        if (!this.superheroAudio) return;
        
        // Default timeline structure (in milliseconds)
        this.musicTimeline = {
            intro: { start: 0, duration: 3000 },
            buildup: { start: 3000, duration: 2000 },
            drop: { start: 5000, duration: 1000 },
            mainTheme: { start: 6000, duration: 8000 },
            bridge: { start: 14000, duration: 4000 },
            climax: { start: 18000, duration: 3000 },
            outro: { start: 21000, duration: 4000 }
        };
        
        // Scale timeline based on actual audio duration
        if (this.superheroAudio.duration) {
            const actualDuration = this.superheroAudio.duration * 1000;
            const scale = actualDuration / 25000;
            
            Object.keys(this.musicTimeline).forEach(key => {
                this.musicTimeline[key].start *= scale;
                this.musicTimeline[key].duration *= scale;
            });
        }
    },

    setupRevealLighting() {
        const box = new THREE.Box3().setFromObject(this.currentModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxSize = Math.max(size.x, size.y, size.z);
        
        // Key light for dramatic effect
        this.keyLight = new THREE.SpotLight(0xffffff, 2.0, 0, Math.PI / 6, 0.3);
        this.keyLight.position.set(center.x + maxSize, center.y + maxSize * 2, center.z + maxSize);
        this.keyLight.target.position.copy(center);
        this.keyLight.castShadow = true;
        this.scene.add(this.keyLight);
        this.scene.add(this.keyLight.target);
        
        // Rim light for silhouette
        this.rimLight = new THREE.DirectionalLight(0x4488ff, 1.2);
        this.rimLight.position.set(center.x - maxSize, center.y, center.z - maxSize);
        this.scene.add(this.rimLight);
    },

    updateSuperheroCamera() {
        if (!this.superheroMode || !this.currentModel || this.animationPaused) return;
        
        const now = Date.now();
        const elapsed = now - this.superheroStartTime;
        
        // Detect beats for precise synchronization
        this.detectBeat();
        
        // Get current timeline phase
        const phase = this.getCurrentTimelinePhase(elapsed);
        if (!phase) return;
        
        // Apply phase-specific camera movement
        this.applyCameraChoreography(phase, elapsed);
        
        // Update cinematic effects based on music and phase
        this.updateCinematicEffects(phase);
    },

    detectBeat() {
        if (!this.audioAnalyser) return false;
        
        const dataArray = new Uint8Array(this.audioAnalyser.frequencyBinCount);
        this.audioAnalyser.getByteTimeDomainData(dataArray);
        
        // Calculate energy level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += Math.abs(dataArray[i] - 128);
        }
        const energy = sum / dataArray.length;
        
        // Adaptive threshold based on recent history
        const recentAvg = this.beatHistory.reduce((a, b) => a + b, 0) / 
                         Math.max(1, this.beatHistory.length);
        this.beatThreshold = Math.max(80, recentAvg * 1.3);
        
        // Add to history
        this.beatHistory.push(energy);
        if (this.beatHistory.length > 30) this.beatHistory.shift();
        
        // Detect beat
        const isBeat = energy > this.beatThreshold;
        
        if (isBeat && !this.beatDetected) {
            this.beatDetected = true;
            this.lastBeatTime = Date.now();
            this.currentBeat++;
            
            // Trigger beat-specific effects
            this.onBeatDetected();
            return true;
        } else if (energy < this.beatThreshold * 0.6) {
            this.beatDetected = false;
        }
        
        return false;
    },

    onBeatDetected() {
        // Only trigger effects on strong beats (every 4th beat typically)
        if (this.currentBeat % 4 === 0) {
            // Camera punch on strong beats
            this.cameraPunch(0.15, 200);
            
            // Intensify lighting
            if (this.keyLight) {
                const originalIntensity = this.keyLight.intensity;
                this.keyLight.intensity *= 1.3;
                
                // Return to normal after delay
                setTimeout(() => {
                    if (this.keyLight && this.keyLight.intensity > originalIntensity) {
                        this.keyLight.intensity = originalIntensity;
                    }
                }, 150);
            }
            
            // Create particle burst on strong beats
            this.createBeatParticles();
        }
    },

    applyCameraChoreography(phase, elapsed) {
        const box = new THREE.Box3().setFromObject(this.currentModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxSize = Math.max(size.x, size.y, size.z);
        const progress = phase.progress;
        
        // Get audio intensity for reactive movement
        let audioIntensity = 1;
        if (this.audioAnalyser) {
            const dataArray = new Uint8Array(this.audioAnalyser.frequencyBinCount);
            this.audioAnalyser.getByteFrequencyData(dataArray);
            audioIntensity = (dataArray.reduce((a, b) => a + b) / dataArray.length) / 128;
        }
        
        switch(phase.name) {
            case 'intro':
                // Slow descent from high above with building tension
                const skyHeight = maxSize * (10 - progress * 7);
                const introDistance = maxSize * (4 - progress * 2);
                
                this.camera.position.set(
                    center.x + introDistance * 0.3,
                    center.y + skyHeight,
                    center.z + introDistance * 0.5
                );
                
                // Slowly look toward the model
                const lookTarget = center.clone();
                lookTarget.y += maxSize * 0.3 * (1 - progress);
                this.camera.lookAt(lookTarget);
                break;
                
            case 'buildup':
                // Accelerating descent with increasing intensity
                const buildupAngle = Math.PI * 0.5 * progress;
                const buildupDistance = maxSize * (2.5 - progress * 1.5);
                const buildupHeight = maxSize * (2.0 - progress * 1.2);
                
                this.camera.position.set(
                    center.x + Math.cos(buildupAngle) * buildupDistance,
                    center.y + buildupHeight,
                    center.z + Math.sin(buildupAngle) * buildupDistance
                );
                
                this.camera.lookAt(center);
                
                if (audioIntensity > 1.0) {
                    const shakeIntensity = (audioIntensity - 1.0) * 0.05;
                    this.camera.position.x += (Math.random() - 0.5) * shakeIntensity;
                    this.camera.position.y += (Math.random() - 0.5) * shakeIntensity;
                    this.camera.position.z += (Math.random() - 0.5) * shakeIntensity;
                }
                break;
                
            case 'mainTheme':
                const orbitSpeed = 1.0 + audioIntensity * 0.8;
                const orbitAngle = progress * Math.PI * 4 * orbitSpeed;
                const orbitDistance = maxSize * (1.1 + audioIntensity * 0.3);
                const orbitVertical = maxSize * (0.7 + Math.sin(progress * Math.PI * 2) * 0.3);
                
                this.camera.position.set(
                    center.x + Math.cos(orbitAngle) * orbitDistance,
                    center.y + orbitVertical,
                    center.z + Math.sin(orbitAngle) * orbitDistance
                );
                
                const lookTargetY = center.y + maxSize * (0.2 + audioIntensity * 0.2);
                this.camera.lookAt(new THREE.Vector3(center.x, lookTargetY, center.z));
                
                if (this.beatDetected && Date.now() - this.lastBeatTime < 200) {
                    const timeSinceBeat = Date.now() - this.lastBeatTime;
                    const punchIntensity = 0.15 * (1 - timeSinceBeat / 200);
                    this.camera.position.x += (Math.random() - 0.5) * punchIntensity;
                    this.camera.position.y += (Math.random() - 0.5) * punchIntensity;
                }
                break;
                
            case 'climax':
                const climaxAngle = Math.PI * 8 + progress * Math.PI * 2;
                const climaxDistance = maxSize * (2.5 + Math.sin(progress * Math.PI) * 0.5);
                const climaxHeight = maxSize * (1.2 + Math.cos(progress * Math.PI) * 0.3);
                
                this.camera.position.set(
                    center.x + Math.cos(climaxAngle) * climaxDistance,
                    center.y + climaxHeight,
                    center.z + Math.sin(climaxAngle) * climaxDistance
                );
                
                const climaxTarget = center.clone();
                climaxTarget.y += maxSize * 0.4;
                this.camera.lookAt(climaxTarget);
                
                if (this.bloomPass) {
                    this.bloomPass.strength = 1.8 - progress * 0.2;
                    this.bloomPass.radius = 0.7 - progress * 0.1;
                }
                
                if (this.beatDetected) {
                    const shakeIntensity = 0.08;
                    this.camera.position.x += (Math.random() - 0.5) * shakeIntensity;
                    this.camera.position.y += (Math.random() - 0.5) * shakeIntensity;
                    this.camera.position.z += (Math.random() - 0.5) * shakeIntensity;
                }
                break;
                
            case 'outro':
                const outroProgress = progress;
                const outroAngle = Math.PI * 10 + outroProgress * Math.PI * 0.5;
                const outroDistance = maxSize * (2.0 + outroProgress * 1.5);
                const outroHeight = maxSize * (1.0 - outroProgress * 0.5);
                
                this.camera.position.set(
                    center.x + Math.cos(outroProgress) * outroDistance,
                    center.y + outroHeight,
                    center.z + Math.sin(outroProgress) * outroDistance
                );
                
                const outroTarget = center.clone();
                outroTarget.y += maxSize * (0.3 - outroProgress * 0.2);
                this.camera.lookAt(outroTarget);
                break;
        }
        
        this.controls.target.copy(center);
    },

    setupCinematicOverlays() {
        if (!document.getElementById('letterboxTop')) {
            const letterboxTop = document.createElement('div');
            letterboxTop.id = 'letterboxTop';
            letterboxTop.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:15%;background:black;z-index:1000;opacity:0;transition:opacity 0.5s ease';
            document.body.appendChild(letterboxTop);
            
            const letterboxBottom = document.createElement('div');
            letterboxBottom.id = 'letterboxBottom';
            letterboxBottom.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;height:15%;background:black;z-index:1000;opacity:0;transition:opacity 0.5s ease';
            document.body.appendChild(letterboxBottom);
            
            const vignette = document.createElement('div');
            vignette.id = 'cinematicVignette';
            vignette.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.6) 100%);z-index:999;pointer-events:none;opacity:0;transition:opacity 0.5s ease';
            document.body.appendChild(vignette);
            
            const filmGrain = document.createElement('div');
            filmGrain.id = 'filmGrain';
            filmGrain.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:998;pointer-events:none;opacity:0;transition:opacity 0.5s ease;mix-blend-mode:overlay';
            document.body.appendChild(filmGrain);
        }
    },

    setupShowcaseElements() {
        const letterboxTop = document.getElementById('letterboxTop');
        const letterboxBottom = document.getElementById('letterboxBottom');
        const vignette = document.getElementById('cinematicVignette');
        const filmGrain = document.getElementById('filmGrain');
        
        if (letterboxTop) letterboxTop.style.opacity = '1';
        if (letterboxBottom) letterboxBottom.style.opacity = '1';
        if (vignette) vignette.style.opacity = '0.3';
        if (filmGrain) filmGrain.style.opacity = '0.15';
    },

    updateCinematicEffects(phase) {
        const letterboxTop = document.getElementById('letterboxTop');
        const letterboxBottom = document.getElementById('letterboxBottom');
        const vignette = document.getElementById('cinematicVignette');
        const filmGrain = document.getElementById('filmGrain');
        
        if (letterboxTop && letterboxBottom) {
            const barOpacity = phase.name === 'outro' ? 0.7 - phase.progress * 0.2 : 1.0;
            letterboxTop.style.opacity = barOpacity;
            letterboxBottom.style.opacity = barOpacity;
        }
        
        if (vignette) {
            let vignetteOpacity = 0.3;
            if (phase.name === 'climax') vignetteOpacity = 0.5;
            else if (phase.name === 'outro') vignetteOpacity = 0.3 - phase.progress * 0.2;
            vignette.style.opacity = vignetteOpacity;
        }
        
        if (filmGrain) {
            let grainOpacity = 0.15;
            if (phase.name === 'climax') grainOpacity = 0.25;
            else if (phase.name === 'outro') grainOpacity = 0.25 - phase.progress * 0.1;
            filmGrain.style.opacity = grainOpacity;
        }
        
        if (this.keyLight) {
            let lightIntensity = 1.8;
            if (phase.name === 'intro') lightIntensity = 0.5 + phase.progress * 1.3;
            else if (phase.name === 'outro') lightIntensity = 1.8 - phase.progress * 0.8;
            this.keyLight.intensity = lightIntensity;
        }
    },

    createEnergyBurst() {
        if (!this.currentModel) return;
        
        const box = new THREE.Box3().setFromObject(this.currentModel);
        const center = box.getCenter(new THREE.Vector3());
        
        const burstGeometry = new THREE.SphereGeometry(0.1, 16, 16);
        const burstMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 1
        });
        const burst = new THREE.Mesh(burstGeometry, burstMaterial);
        burst.position.copy(center);
        this.scene.add(burst);
        
        let scale = 1;
        const animateBurst = () => {
            scale += 0.5;
            burst.scale.set(scale, scale, scale);
            burst.material.opacity = Math.max(0, 1 - scale / 20);
            
            if (scale < 20) {
                requestAnimationFrame(animateBurst);
            } else {
                this.scene.remove(burst);
            }
        };
        animateBurst();
    },

    createBeatParticles() {
        if (!this.currentModel) return;
        
        const box = new THREE.Box3().setFromObject(this.currentModel);
        const center = box.getCenter(new THREE.Vector3());
        
        const particleCount = 50;
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = 0.5;
            
            positions[i * 3] = center.x + Math.sin(phi) * Math.cos(theta) * radius;
            positions[i * 3 + 1] = center.y + Math.sin(phi) * Math.sin(theta) * radius;
            positions[i * 3 + 2] = center.z + Math.cos(phi) * radius;
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            color: 0xffff00,
            size: 0.1,
            transparent: true,
            opacity: 1
        });
        
        const particleSystem = new THREE.Points(particles, particleMaterial);
        this.scene.add(particleSystem);
        
        let time = 0;
        const animateParticles = () => {
            time += 0.1;
            particleSystem.scale.set(1 + time, 1 + time, 1 + time);
            particleMaterial.opacity = Math.max(0, 1 - time / 5);
            
            if (time < 5) {
                requestAnimationFrame(animateParticles);
            } else {
                this.scene.remove(particleSystem);
            }
        };
        animateParticles();
    },

    addLensFlareDrama() {
        if (!this.currentModel) return;
        
        const box = new THREE.Box3().setFromObject(this.currentModel);
        const center = box.getCenter(new THREE.Vector3());
        
        if (this.lensFlare) {
            this.scene.remove(this.lensFlare);
        }
        
        const flareGeometry = new THREE.CircleGeometry(1, 32);
        const flareMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });
        this.lensFlare = new THREE.Mesh(flareGeometry, flareMaterial);
        this.lensFlare.position.set(center.x, center.y, center.z + 1);
        this.scene.add(this.lensFlare);
        
        const animateFlare = () => {
            if (!this.lensFlare || !this.superheroMode) return;
            
            const time = Date.now() * 0.002;
            const pulse = 0.8 + Math.sin(time * 3) * 0.2;
            this.lensFlare.scale.set(pulse, pulse, 1);
            
            requestAnimationFrame(animateFlare);
        };
        animateFlare();
    },

    cameraPunch(intensity = 0.1, duration = 200) {
        const originalPos = this.camera.position.clone();
        const startTime = Date.now();
        
        const animatePunch = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (progress < 1) {
                const offset = intensity * Math.sin(progress * Math.PI);
                
                this.camera.position.x = originalPos.x + (Math.random() - 0.5) * offset;
                this.camera.position.y = originalPos.y + (Math.random() - 0.5) * offset;
                this.camera.position.z = originalPos.z + (Math.random() - 0.5) * offset;
                
                requestAnimationFrame(animatePunch);
            } else {
                this.camera.position.copy(originalPos);
            }
        };
        animatePunch();
    },

    exitSuperheroMode() {
        if (!this.superheroMode) return;
        
        this.superheroMode = false;
        this.controls.enabled = true;
        
        // Fade out cinematic effects
        const letterboxTop = document.getElementById('letterboxTop');
        const letterboxBottom = document.getElementById('letterboxBottom');
        const vignette = document.getElementById('cinematicVignette');
        const filmGrain = document.getElementById('filmGrain');
        
        if (letterboxTop) letterboxTop.style.opacity = '0';
        if (letterboxBottom) letterboxBottom.style.opacity = '0';
        if (vignette) vignette.style.opacity = '0';
        if (filmGrain) filmGrain.style.opacity = '0';
        
        // Stop audio immediately
        if (this.superheroAudio) {
            this.superheroAudio.pause();
            this.superheroAudio.currentTime = 0;
            this.superheroAudio = null;
        }
        
        // Restore original scene state
        this.scene.background = this.originalBackground || new THREE.Color(0xf0f0f0);
        this.scene.fog = this.originalFog || null;
        
        // Restore original lighting
        if (this.originalLights) {
            this.lights.ambient.intensity = this.originalLights.ambientIntensity;
            this.lights.directional.intensity = this.originalLights.directionalIntensity;
            this.lights.directional.position.copy(this.originalLights.directionalPosition);
        } else {
            this.lights.ambient.intensity = 0.4;
            this.lights.directional.intensity = 1.0;
        }
        
        // Restore original camera position
        if (this.originalCameraPos) {
            this.camera.position.copy(this.originalCameraPos.position);
            this.controls.target.copy(this.originalCameraPos.target);
        }
        
        // Clean up cinematic elements
        if (this.cinematicLights) {
            this.cinematicLights.forEach(light => this.scene.remove(light));
            this.cinematicLights = [];
        }
        
        if (this.keyLight) {
            this.scene.remove(this.keyLight);
            if (this.keyLight.target) this.scene.remove(this.keyLight.target);
            this.keyLight = null;
        }
        
        if (this.rimLight) {
            this.scene.remove(this.rimLight);
            this.rimLight = null;
        }
        
        if (this.spotlight) {
            this.scene.remove(this.spotlight);
            if (this.spotlight.target) this.scene.remove(this.spotlight.target);
            this.spotlight = null;
        }
        
        if (this.energyParticles) {
            this.scene.remove(this.energyParticles);
            this.energyParticles = null;
        }
        
        if (this.lensFlare) {
            this.scene.remove(this.lensFlare);
            this.lensFlare = null;
        }
        
        // Reset bloom
        if (this.bloomPass) {
            this.bloomPass.enabled = false;
            this.bloomPass.strength = 1.5;
            this.bloomPass.radius = 0.4;
            this.bloomPass.threshold = 0.85;
        }
        
        this.controls.update();
    },

    playAmbientDrone() {
        // Skip audio effects to avoid errors
        console.log('Ambient drone effect');
    },

    playBassThump() {
        // Skip audio effects to avoid errors
        console.log('Bass thump effect');
    },

    playSuperheroMusic() {
        if (this.customAudioFile) {
            try {
                this.superheroAudio = new Audio(this.customAudioFile);
                this.superheroAudio.volume = 0.7;
                this.superheroAudio.play().catch(e => console.log('Audio play failed:', e));
            } catch (e) {
                console.log('Audio not supported');
            }
        }
    },

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
    },

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
    },

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
            
            const indicator = document.querySelector('.audio-indicator');
            const clearBtn = document.getElementById('clearAudio');
            indicator.textContent = `🎵 ${file.name} loaded`;
            clearBtn.style.display = 'block';
        };
        reader.readAsArrayBuffer(file);
    },

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
};

// Auto-integrate into ModelViewer prototype
if (typeof ModelViewer !== 'undefined') {
    Object.assign(ModelViewer.prototype, SuperheroMode);
}