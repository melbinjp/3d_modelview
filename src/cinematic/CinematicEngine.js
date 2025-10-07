import * as THREE from 'three';
import { AudioAnalyzer } from './AudioAnalyzer.js';
import { CameraSequenceLibrary } from './CameraSequenceLibrary.js';
import { LightingDirector } from './LightingDirector.js';
import { EnvironmentDirector } from './EnvironmentDirector.js';
import { NarrativeController } from './NarrativeController.js';

/**
 * CinematicEngine - Creates professional cinematic sequences for superhero mode
 * Orchestrates camera movements, lighting, and environments for movie-quality reveals
 */
export class CinematicEngine {
    constructor(renderingEngine) {
        this.renderingEngine = renderingEngine;
        this.scene = renderingEngine.scene;
        this.camera = renderingEngine.camera;
        this.renderer = renderingEngine.renderer;
        
        // Initialize cinematic components
        this.audioAnalyzer = new AudioAnalyzer();
        this.cameraSequences = new CameraSequenceLibrary();
        this.lightingDirector = new LightingDirector(this.scene, this.renderer);
        this.environmentDirector = new EnvironmentDirector(this.scene);
        this.narrativeController = new NarrativeController();
        
        // State management
        this.isActive = false;
        this.currentSequence = null;
        this.originalCameraState = null;
        this.originalLightingState = null;
        this.animationId = null;
        
        // Timing and control
        this.startTime = 0;
        this.duration = 0;
        this.onComplete = null;
        
        // Model reference
        this.targetModel = null;
        this.modelBounds = new THREE.Box3();
        this.modelCenter = new THREE.Vector3();
        this.modelSize = 0;
    }

    /**
     * Start cinematic reveal sequence
     * @param {Object} options - Configuration options
     * @param {HTMLAudioElement} options.audio - Audio element for music analysis
     * @param {THREE.Object3D} options.model - Target model for reveal
     * @param {Function} options.onComplete - Callback when sequence completes
     * @param {string} options.environmentType - Type of cinematic environment
     */
    async startReveal(options = {}) {
        try {
            if (this.isActive) {
                this.stopReveal();
            }

            const { audio, model, onComplete, environmentType = 'cosmic_scene' } = options;
            
            // Validate required parameters
            if (!model) {
                throw new Error('Model is required for cinematic reveal');
            }
            
            if (!this.scene || !this.camera || !this.renderer) {
                throw new Error('Rendering engine components are missing');
            }
            
            this.targetModel = model;
            this.onComplete = onComplete;
            
            // Analyze model for optimal positioning
            this.analyzeModel();
            
            // Validate model analysis results
            if (this.modelSize <= 0) {
                console.warn('Model size is invalid, using default size');
                this.modelSize = 2;
            }
            
            // Store original states for restoration
            this.storeOriginalStates();
            
            // Analyze audio if provided
            let musicAnalysis = { tempo: 'medium', intensity: 'moderate', mood: 'heroic' };
            if (audio) {
                try {
                    musicAnalysis = await this.audioAnalyzer.analyzeAudio(audio);
                } catch (audioError) {
                    console.warn('Audio analysis failed, using default analysis:', audioError);
                }
            }
            
            // Select appropriate cinematic sequence
            this.currentSequence = this.cameraSequences.selectSequence(musicAnalysis, this.modelSize);
            
            if (!this.currentSequence) {
                throw new Error('Failed to select cinematic sequence');
            }
            
            // Setup cinematic environment
            try {
                await this.environmentDirector.setupEnvironment(environmentType);
            } catch (envError) {
                console.warn('Environment setup failed, continuing without environment:', envError);
            }
            
            // Configure cinematic lighting
            try {
                this.lightingDirector.setupCinematicLighting(this.targetModel, this.modelCenter);
            } catch (lightError) {
                console.warn('Lighting setup failed, continuing with basic lighting:', lightError);
            }
            
            // Start narrative sequence
            try {
                this.narrativeController.startNarrative(this.currentSequence, musicAnalysis);
            } catch (narrativeError) {
                console.warn('Narrative controller failed, continuing without narrative:', narrativeError);
            }
            
            // Begin animation
            this.isActive = true;
            this.startTime = performance.now();
            this.duration = this.currentSequence.totalDuration || 15; // Default 15 seconds
            
            // Start animation loop with error handling
            this.animate();
            
            return {
                duration: this.duration,
                sequence: this.currentSequence.name || 'default_sequence'
            };
            
        } catch (error) {
            console.error('Failed to start cinematic reveal:', error);
            this.isActive = false;
            
            // Attempt cleanup
            try {
                this.restoreOriginalStates();
            } catch (cleanupError) {
                console.error('Cleanup failed:', cleanupError);
            }
            
            throw error;
        }
    }

    /**
     * Stop current cinematic sequence
     */
    stopReveal() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Restore original states
        this.restoreOriginalStates();
        
        // Clean up cinematic elements
        this.lightingDirector.cleanup();
        this.environmentDirector.cleanup();
        
        if (this.onComplete) {
            this.onComplete();
        }
    }

    /**
     * Main animation loop for cinematic sequence
     */
    animate() {
        try {
            if (!this.isActive) return;
            
            const currentTime = performance.now();
            const elapsed = (currentTime - this.startTime) / 1000; // Convert to seconds
            const progress = Math.min(elapsed / this.duration, 1);
            
            // Update narrative phase
            let currentPhase = null;
            try {
                currentPhase = this.narrativeController.updatePhase(progress);
            } catch (narrativeError) {
                console.warn('Narrative update failed:', narrativeError);
                currentPhase = { name: 'showcase' }; // Default phase
            }
            
            // Update camera position and rotation
            try {
                this.updateCamera(progress, currentPhase);
            } catch (cameraError) {
                console.warn('Camera update failed:', cameraError);
            }
            
            // Update lighting for current phase
            try {
                this.lightingDirector.updateLighting(progress, currentPhase);
            } catch (lightError) {
                console.warn('Lighting update failed:', lightError);
            }
            
            // Update environmental effects
            try {
                this.environmentDirector.updateEffects(progress, currentPhase);
            } catch (envError) {
                console.warn('Environment update failed:', envError);
            }
            
            // Check if sequence is complete
            if (progress >= 1) {
                this.completeReveal();
                return;
            }
            
            // Continue animation loop
            if (this.isActive && typeof requestAnimationFrame !== 'undefined') {
                this.animationId = requestAnimationFrame(() => this.animate());
            } else if (this.isActive) {
                // Fallback for environments without requestAnimationFrame
                setTimeout(() => this.animate(), 16); // ~60fps
            }
            
        } catch (error) {
            console.error('Animation loop error:', error);
            // Try to continue or stop gracefully
            if (this.isActive) {
                setTimeout(() => this.animate(), 100); // Retry with delay
            }
        }
    }

    /**
     * Update camera position and orientation based on sequence progress
     */
    updateCamera(progress, phase) {
        const sequence = this.currentSequence;
        const cameraState = sequence.getCameraState(progress, this.modelCenter, this.modelSize);
        
        // Apply camera position and rotation
        this.camera.position.copy(cameraState.position);
        this.camera.lookAt(cameraState.target);
        
        // Update camera properties
        if (cameraState.fov) {
            this.camera.fov = cameraState.fov;
            this.camera.updateProjectionMatrix();
        }
    }

    /**
     * Analyze target model for optimal camera positioning
     */
    analyzeModel() {
        if (!this.targetModel) return;
        
        // Calculate model bounds and center
        this.modelBounds.setFromObject(this.targetModel);
        this.modelBounds.getCenter(this.modelCenter);
        this.modelSize = this.modelBounds.getSize(new THREE.Vector3()).length();
        
        // Position model for optimal presentation
        this.positionModelForReveal();
    }

    /**
     * Position model optimally for cinematic reveal
     */
    positionModelForReveal() {
        if (!this.targetModel) return;
        
        // Center the model
        this.targetModel.position.sub(this.modelCenter);
        
        // Ensure model is properly oriented for hero shot
        // Most character models look best with slight rotation
        if (this.isCharacterModel()) {
            this.targetModel.rotation.y = Math.PI * 0.1; // Slight angle for dynamic pose
        }
        
        // Update bounds after positioning
        this.modelBounds.setFromObject(this.targetModel);
        this.modelBounds.getCenter(this.modelCenter);
    }

    /**
     * Detect if model is likely a character for optimal positioning
     */
    isCharacterModel() {
        if (!this.targetModel) return false;
        
        const size = this.modelBounds.getSize(new THREE.Vector3());
        const aspectRatio = size.y / Math.max(size.x, size.z);
        
        // Character models typically have height > width/depth
        return aspectRatio > 1.5;
    }

    /**
     * Store original camera and lighting states
     */
    storeOriginalStates() {
        this.originalCameraState = {
            position: this.camera.position.clone(),
            rotation: this.camera.rotation.clone(),
            fov: this.camera.fov
        };
        
        this.originalLightingState = this.lightingDirector.getCurrentState();
    }

    /**
     * Restore original states after cinematic sequence
     */
    restoreOriginalStates() {
        if (this.originalCameraState) {
            this.camera.position.copy(this.originalCameraState.position);
            this.camera.rotation.copy(this.originalCameraState.rotation);
            this.camera.fov = this.originalCameraState.fov;
            this.camera.updateProjectionMatrix();
        }
        
        if (this.originalLightingState) {
            this.lightingDirector.restoreState(this.originalLightingState);
        }
    }

    /**
     * Complete the cinematic reveal sequence
     */
    completeReveal() {
        // Position camera for final hero shot
        this.positionForHeroShot();
        
        // Set final lighting state
        this.lightingDirector.setHeroLighting();
        
        // Keep cinematic environment active
        this.isActive = false;
        
        if (this.onComplete) {
            this.onComplete();
        }
    }

    /**
     * Position camera for final hero shot
     */
    positionForHeroShot() {
        const distance = this.modelSize * 2.5;
        const height = this.modelSize * 0.3;
        const angle = Math.PI * 0.15; // Slight upward angle
        
        this.camera.position.set(
            Math.sin(angle) * distance,
            height,
            Math.cos(angle) * distance
        );
        
        this.camera.lookAt(this.modelCenter);
        this.camera.fov = 45;
        this.camera.updateProjectionMatrix();
    }

    /**
     * Get current cinematic state
     */
    getState() {
        return {
            isActive: this.isActive,
            progress: this.isActive ? (performance.now() - this.startTime) / (this.duration * 1000) : 0,
            currentPhase: this.narrativeController.getCurrentPhase(),
            sequenceName: this.currentSequence?.name || null
        };
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.stopReveal();
        this.audioAnalyzer.dispose();
        this.lightingDirector.dispose();
        this.environmentDirector.dispose();
    }
}