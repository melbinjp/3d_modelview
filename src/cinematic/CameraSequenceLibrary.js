import * as THREE from 'three';

/**
 * CameraSequenceLibrary - Library of professional cinematic camera movements
 * Contains pre-designed sequences that feel like actual movie scenes
 */
export class CameraSequenceLibrary {
    constructor() {
        this.sequences = new Map();
        this.initializeSequences();
    }

    /**
     * Initialize all camera sequences
     */
    initializeSequences() {
        // Marvel/Avenger Style sequences
        this.sequences.set('the_look_up', new TheLookUpSequence());
        this.sequences.set('the_hero_orbit', new TheHeroOrbitSequence());
        this.sequences.set('the_dutch_angle', new TheDutchAngleRevealSequence());
        this.sequences.set('the_action_cut', new TheActionCutSequence());
    }

    /**
     * Select appropriate sequence based on music analysis and model characteristics
     */
    selectSequence(musicAnalysis, modelSize) {
        // Create composite sequence based on analysis
        const phases = this.selectPhases(musicAnalysis.tempoValue, musicAnalysis.intensityValue, musicAnalysis.mood, modelSize);
        return new CompositeSequence(phases, musicAnalysis);
    }

    /**
     * Select sequence phases based on analysis to build a Hero Reveal
     */
    selectPhases(tempoBPM, intensity, mood, modelSize) {
        const phases = [];

        // The pacing is controlled by CinematicEngine scaling the whole duration.
        // We just define the *relative* proportions of the sequence here.

        // Phase 1: The Dutch Angle Reveal (Off-axis slow approach)
        phases.push({
            name: 'approach',
            sequence: this.sequences.get('the_dutch_angle'),
            duration: 0.25, // 25% of the total calculated song duration
            startTime: 0
        });

        // Phase 2: The Look Up (Low angle crane up)
        phases.push({
            name: 'reveal',
            sequence: this.sequences.get('the_look_up'),
            duration: 0.25,
            startTime: 0.25
        });

        // Phase 3: The Hero Orbit (360 Sweep)
        phases.push({
            name: 'showcase',
            sequence: this.sequences.get('the_hero_orbit'),
            duration: 0.40,
            startTime: 0.50
        });

        // Phase 4: The Action Cut (Dramatic final pose focus)
        phases.push({
            name: 'finale',
            sequence: this.sequences.get('the_action_cut'),
            duration: 0.10,
            startTime: 0.90
        });

        return phases;
    }

    /**
     * Get sequence by name
     */
    getSequence(name) {
        return this.sequences.get(name);
    }

    /**
     * Get all available sequences
     */
    getAllSequences() {
        return Array.from(this.sequences.keys());
    }
}

/**
 * Base class for camera sequences
 */
class CameraSequence {
    constructor(name, duration = 10) {
        this.name = name;
        this.duration = duration;
        this.keyframes = [];
    }

    /**
     * Get camera state at specific progress (0-1)
     */
    getCameraState(progress, modelCenter, modelSize) {
        progress = Math.max(0, Math.min(1, progress));

        // Find appropriate keyframes
        const keyframe = this.interpolateKeyframes(progress);

        // Scale positions based on model size
        const scaledPosition = keyframe.position.clone().multiplyScalar(modelSize);
        const target = modelCenter.clone().add(keyframe.targetOffset.clone().multiplyScalar(modelSize));

        return {
            position: scaledPosition.add(modelCenter),
            target: target,
            fov: keyframe.fov || 45
        };
    }

    /**
     * Interpolate between keyframes
     */
    interpolateKeyframes(progress) {
        if (this.keyframes.length === 0) {
            return this.getDefaultKeyframe();
        }

        if (this.keyframes.length === 1) {
            return this.keyframes[0];
        }

        // Find surrounding keyframes
        let prevFrame = this.keyframes[0];
        let nextFrame = this.keyframes[this.keyframes.length - 1];

        for (let i = 0; i < this.keyframes.length - 1; i++) {
            if (progress >= this.keyframes[i].time && progress <= this.keyframes[i + 1].time) {
                prevFrame = this.keyframes[i];
                nextFrame = this.keyframes[i + 1];
                break;
            }
        }

        // Calculate interpolation factor
        const timeDiff = nextFrame.time - prevFrame.time;
        const localProgress = timeDiff > 0 ? (progress - prevFrame.time) / timeDiff : 0;

        // Apply easing
        const easedProgress = this.applyEasing(localProgress, prevFrame.easing || 'linear');

        // Interpolate values
        return {
            position: prevFrame.position.clone().lerp(nextFrame.position, easedProgress),
            targetOffset: prevFrame.targetOffset.clone().lerp(nextFrame.targetOffset, easedProgress),
            fov: THREE.MathUtils.lerp(prevFrame.fov || 45, nextFrame.fov || 45, easedProgress)
        };
    }

    /**
     * Apply easing function
     */
    applyEasing(t, easing) {
        switch (easing) {
            case 'easeIn': return t * t;
            case 'easeOut': return 1 - Math.pow(1 - t, 2);
            case 'easeInOut': return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            case 'smooth': return t * t * (3 - 2 * t);
            default: return t; // linear
        }
    }

    /**
     * Get default keyframe
     */
    getDefaultKeyframe() {
        return {
            position: new THREE.Vector3(0, 0, 5),
            targetOffset: new THREE.Vector3(0, 0, 0),
            fov: 45
        };
    }
}

/**
 * The Dutch Angle Reveal - Off-axis slow approach that gracefully straightens
 */
class TheDutchAngleRevealSequence extends CameraSequence {
    constructor() {
        super('the_dutch_angle', 10);
        this.setupKeyframes();
    }

    setupKeyframes() {
        this.keyframes = [
            {
                time: 0,
                position: new THREE.Vector3(5, 0.5, 7), // Low, off-axis
                targetOffset: new THREE.Vector3(-1, 0.5, 0),
                fov: 35, // Telephoto zoom
                easing: 'easeInOut'
            },
            {
                time: 1.0,
                position: new THREE.Vector3(0, 1.5, 5), // Sweeps to center
                targetOffset: new THREE.Vector3(0, 0, 0),
                fov: 45, // Widens out
                easing: 'easeInOut'
            }
        ];
    }
}

/**
 * The Look Up - Starts low at the base and cranes up to hero's face
 */
class TheLookUpSequence extends CameraSequence {
    constructor() {
        super('the_look_up', 10);
        this.setupKeyframes();
    }

    setupKeyframes() {
        this.keyframes = [
            {
                time: 0,
                position: new THREE.Vector3(0, -1, 3), // Very low
                targetOffset: new THREE.Vector3(0, 0, 0), // Looking at waist
                fov: 50,
                easing: 'smooth'
            },
            {
                time: 1.0,
                position: new THREE.Vector3(0, 2, 4), // Eye level
                targetOffset: new THREE.Vector3(0, 1.5, 0), // Looking at head/face
                fov: 40,
                easing: 'easeInOut'
            }
        ];
    }
}

/**
 * The Hero Orbit - Continuous, slow, elegant 360-degree sweep
 */
class TheHeroOrbitSequence extends CameraSequence {
    constructor() {
        super('the_hero_orbit', 10);
        this.setupKeyframes();
    }

    setupKeyframes() {
        const radius = 5;
        const height = 1.5;
        const steps = 18;

        this.keyframes = [];

        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const angle = progress * Math.PI * 2;

            // Adding a slight sine wave to height for an elegant floating crane feel
            this.keyframes.push({
                time: progress,
                position: new THREE.Vector3(
                    Math.sin(angle) * radius,
                    height + Math.sin(progress * Math.PI) * 0.5,
                    Math.cos(angle) * radius
                ),
                targetOffset: new THREE.Vector3(0, height * 0.5, 0), // Focus slightly upward
                fov: 40,
                easing: 'linear' // Must be linear so orbit doesn't stutter on segments
            });
        }
    }
}

/**
 * The Action Cut - Snap zoom / focus onto the top of the model
 */
class TheActionCutSequence extends CameraSequence {
    constructor() {
        super('the_action_cut', 10);
        this.setupKeyframes();
    }

    setupKeyframes() {
        this.keyframes = [
            {
                time: 0,
                position: new THREE.Vector3(2, 2.5, 3),
                targetOffset: new THREE.Vector3(0, 1.5, 0),
                fov: 60,
                easing: 'easeIn'
            },
            {
                time: 1.0,
                position: new THREE.Vector3(1, 1.5, 2),
                targetOffset: new THREE.Vector3(0, 1.0, 0),
                fov: 30, // Sharp zoom in
                easing: 'easeOut'
            }
        ];
    }
}

/**
 * Showcase dolly sequence - smooth forward/backward movement
 */
class ShowcaseDollySequence extends CameraSequence {
    constructor() {
        super('showcase_dolly', 7);
        this.setupKeyframes();
    }

    setupKeyframes() {
        this.keyframes = [
            {
                time: 0,
                position: new THREE.Vector3(2, 1, 6),
                targetOffset: new THREE.Vector3(0, 0, 0),
                fov: 45,
                easing: 'smooth'
            },
            {
                time: 0.3,
                position: new THREE.Vector3(1, 1.2, 4),
                targetOffset: new THREE.Vector3(0, 0.2, 0),
                fov: 40,
                easing: 'smooth'
            },
            {
                time: 0.7,
                position: new THREE.Vector3(-1, 0.8, 3),
                targetOffset: new THREE.Vector3(0, -0.1, 0),
                fov: 35,
                easing: 'smooth'
            },
            {
                time: 1.0,
                position: new THREE.Vector3(-2, 1, 5),
                targetOffset: new THREE.Vector3(0, 0, 0),
                fov: 42,
                easing: 'easeOut'
            }
        ];
    }
}

/**
 * Showcase crane sequence - vertical movement like a crane shot
 */
class ShowcaseCraneSequence extends CameraSequence {
    constructor() {
        super('showcase_crane', 8);
        this.setupKeyframes();
    }

    setupKeyframes() {
        this.keyframes = [
            {
                time: 0,
                position: new THREE.Vector3(3, 0.5, 4),
                targetOffset: new THREE.Vector3(0, -0.5, 0),
                fov: 50,
                easing: 'easeIn'
            },
            {
                time: 0.4,
                position: new THREE.Vector3(2, 3, 3),
                targetOffset: new THREE.Vector3(0, 0, 0),
                fov: 45,
                easing: 'smooth'
            },
            {
                time: 0.8,
                position: new THREE.Vector3(1, 5, 2),
                targetOffset: new THREE.Vector3(0, 0.5, 0),
                fov: 40,
                easing: 'smooth'
            },
            {
                time: 1.0,
                position: new THREE.Vector3(0, 3, 4),
                targetOffset: new THREE.Vector3(0, 0, 0),
                fov: 45,
                easing: 'easeOut'
            }
        ];
    }
}

/**
 * Epic finale sequence - dramatic final positioning
 */
class EpicFinaleSequence extends CameraSequence {
    constructor(mood) {
        super(`epic_finale_${mood}`, 4);
        this.setupKeyframes(mood);
    }

    setupKeyframes(mood) {
        let finalPosition, finalFov;

        switch (mood) {
            case 'heroic':
                finalPosition = new THREE.Vector3(1, 0.5, 3);
                finalFov = 35;
                break;
            case 'powerful':
                finalPosition = new THREE.Vector3(0, -0.5, 4);
                finalFov = 40;
                break;
            case 'aggressive':
                finalPosition = new THREE.Vector3(-1, 1, 2.5);
                finalFov = 30;
                break;
            default:
                finalPosition = new THREE.Vector3(1, 0.5, 3);
                finalFov = 35;
        }

        this.keyframes = [
            {
                time: 0,
                position: new THREE.Vector3(2, 2, 5),
                targetOffset: new THREE.Vector3(0, 0, 0),
                fov: 50,
                easing: 'easeIn'
            },
            {
                time: 0.6,
                position: finalPosition.clone().multiplyScalar(1.2),
                targetOffset: new THREE.Vector3(0, 0, 0),
                fov: finalFov + 5,
                easing: 'smooth'
            },
            {
                time: 1.0,
                position: finalPosition,
                targetOffset: new THREE.Vector3(0, 0, 0),
                fov: finalFov,
                easing: 'easeOut'
            }
        ];
    }
}

/**
 * Character reveal sequence - optimized for character models
 */
class CharacterRevealSequence extends CameraSequence {
    constructor() {
        super('character_reveal', 12);
        this.setupKeyframes();
    }

    setupKeyframes() {
        this.keyframes = [
            // Start from behind and below
            {
                time: 0,
                position: new THREE.Vector3(0, -1, -6),
                targetOffset: new THREE.Vector3(0, 1, 0),
                fov: 60,
                easing: 'easeOut'
            },
            // Move to side for profile view
            {
                time: 0.3,
                position: new THREE.Vector3(4, 0, -2),
                targetOffset: new THREE.Vector3(0, 0.5, 0),
                fov: 45,
                easing: 'smooth'
            },
            // Circle around to front
            {
                time: 0.7,
                position: new THREE.Vector3(2, 1, 4),
                targetOffset: new THREE.Vector3(0, 0, 0),
                fov: 40,
                easing: 'smooth'
            },
            // Final hero position
            {
                time: 1.0,
                position: new THREE.Vector3(1, 0.3, 3),
                targetOffset: new THREE.Vector3(0, 0, 0),
                fov: 35,
                easing: 'easeIn'
            }
        ];
    }
}

/**
 * Object showcase sequence - optimized for objects and props
 */
class ObjectShowcaseSequence extends CameraSequence {
    constructor() {
        super('object_showcase', 10);
        this.setupKeyframes();
    }

    setupKeyframes() {
        this.keyframes = [
            {
                time: 0,
                position: new THREE.Vector3(5, 2, 5),
                targetOffset: new THREE.Vector3(0, 0, 0),
                fov: 50,
                easing: 'smooth'
            },
            {
                time: 0.25,
                position: new THREE.Vector3(0, 3, 4),
                targetOffset: new THREE.Vector3(0, 0, 0),
                fov: 45,
                easing: 'smooth'
            },
            {
                time: 0.5,
                position: new THREE.Vector3(-3, 1, 3),
                targetOffset: new THREE.Vector3(0, 0, 0),
                fov: 40,
                easing: 'smooth'
            },
            {
                time: 0.75,
                position: new THREE.Vector3(-1, -1, 4),
                targetOffset: new THREE.Vector3(0, 0, 0),
                fov: 45,
                easing: 'smooth'
            },
            {
                time: 1.0,
                position: new THREE.Vector3(2, 0, 4),
                targetOffset: new THREE.Vector3(0, 0, 0),
                fov: 40,
                easing: 'easeOut'
            }
        ];
    }
}

/**
 * Environment sweep sequence - for large scenes and environments
 */
class EnvironmentSweepSequence extends CameraSequence {
    constructor() {
        super('environment_sweep', 15);
        this.setupKeyframes();
    }

    setupKeyframes() {
        this.keyframes = [
            {
                time: 0,
                position: new THREE.Vector3(-10, 5, 10),
                targetOffset: new THREE.Vector3(0, 0, 0),
                fov: 70,
                easing: 'linear'
            },
            {
                time: 0.3,
                position: new THREE.Vector3(0, 8, 8),
                targetOffset: new THREE.Vector3(0, -2, 0),
                fov: 60,
                easing: 'smooth'
            },
            {
                time: 0.6,
                position: new THREE.Vector3(8, 4, 0),
                targetOffset: new THREE.Vector3(-2, 0, 0),
                fov: 50,
                easing: 'smooth'
            },
            {
                time: 1.0,
                position: new THREE.Vector3(3, 2, 6),
                targetOffset: new THREE.Vector3(0, 0, 0),
                fov: 45,
                easing: 'easeOut'
            }
        ];
    }
}

/**
 * Composite sequence that combines multiple phases
 */
class CompositeSequence {
    constructor(phases, musicAnalysis) {
        // Create unique name based on music characteristics
        const tempoCode = musicAnalysis.tempo.charAt(0).toUpperCase();
        const intensityCode = musicAnalysis.intensity.charAt(0).toUpperCase();
        const moodCode = musicAnalysis.mood.substring(0, 3).toUpperCase();

        this.name = `composite_${tempoCode}${intensityCode}_${moodCode}`;
        this.phases = phases;
        this.musicAnalysis = musicAnalysis;
        this.totalDuration = this.calculateTotalDuration();
    }

    calculateTotalDuration() {
        // Base duration varies by tempo
        const baseDuration = this.musicAnalysis.tempo === 'slow' ? 25 :
            this.musicAnalysis.tempo === 'medium' ? 20 :
                this.musicAnalysis.tempo === 'fast' ? 15 : 12;

        // Adjust for intensity
        const intensityMultiplier = this.musicAnalysis.intensity === 'subtle' ? 1.3 :
            this.musicAnalysis.intensity === 'moderate' ? 1.0 :
                this.musicAnalysis.intensity === 'high' ? 0.8 : 0.7;

        // Adjust for mood
        const moodMultiplier = this.musicAnalysis.mood === 'mysterious' ? 1.2 :
            this.musicAnalysis.mood === 'dramatic' ? 1.1 :
                this.musicAnalysis.mood === 'aggressive' ? 0.9 : 1.0;

        return baseDuration * intensityMultiplier * moodMultiplier;
    }

    getCameraState(progress, modelCenter, modelSize) {
        // Find current phase
        const currentPhase = this.getCurrentPhase(progress);
        if (!currentPhase) {
            return this.getDefaultCameraState(modelCenter, modelSize);
        }

        // Calculate local progress within phase
        const phaseProgress = (progress - currentPhase.startTime) / currentPhase.duration;

        // Get camera state from phase sequence
        return currentPhase.sequence.getCameraState(phaseProgress, modelCenter, modelSize);
    }

    getCurrentPhase(progress) {
        for (const phase of this.phases) {
            const phaseEnd = phase.startTime + phase.duration;
            if (progress >= phase.startTime && progress <= phaseEnd) {
                return phase;
            }
        }
        return this.phases[this.phases.length - 1]; // Return last phase as fallback
    }

    getDefaultCameraState(modelCenter, modelSize) {
        return {
            position: new THREE.Vector3(0, 0, modelSize * 3).add(modelCenter),
            target: modelCenter,
            fov: 45
        };
    }
}