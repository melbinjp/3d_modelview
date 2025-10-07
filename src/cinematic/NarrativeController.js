/**
 * NarrativeController - Manages the narrative structure of cinematic sequences
 * Controls the flow between mysterious approach, dramatic reveal, showcase, and epic finale
 */
export class NarrativeController {
    constructor() {
        // Narrative phases with timing
        this.phases = [
            {
                name: 'approach',
                startTime: 0.0,
                endTime: 0.25,
                description: 'Mysterious approach - building anticipation'
            },
            {
                name: 'reveal',
                startTime: 0.25,
                endTime: 0.55,
                description: 'Dramatic reveal - unveiling the subject'
            },
            {
                name: 'showcase',
                startTime: 0.55,
                endTime: 0.85,
                description: 'Detailed showcase - highlighting features'
            },
            {
                name: 'finale',
                startTime: 0.85,
                endTime: 1.0,
                description: 'Epic finale - heroic conclusion'
            }
        ];
        
        // Current state
        this.currentPhase = null;
        this.currentSequence = null;
        this.musicAnalysis = null;
        this.startTime = 0;
        
        // Narrative events
        this.events = [];
        this.eventCallbacks = new Map();
        
        // Pacing control
        this.pacingMultipliers = {
            slow: 1.3,
            medium: 1.0,
            fast: 0.8,
            very_fast: 0.6
        };
        
        // Intensity modifiers
        this.intensityModifiers = {
            subtle: { tension: 0.3, drama: 0.4, energy: 0.2 },
            moderate: { tension: 0.6, drama: 0.7, energy: 0.5 },
            high: { tension: 0.9, drama: 1.0, energy: 0.8 },
            extreme: { tension: 1.0, drama: 1.2, energy: 1.0 }
        };
    }

    /**
     * Start narrative sequence
     */
    startNarrative(sequence, musicAnalysis) {
        this.currentSequence = sequence;
        this.musicAnalysis = musicAnalysis;
        this.startTime = performance.now();
        
        // Adjust phase timing based on music analysis
        this.adjustPhaseTimingForMusic();
        
        // Setup narrative events
        this.setupNarrativeEvents();
        
        // Initialize first phase
        this.currentPhase = this.phases[0];
        this.triggerPhaseStart(this.currentPhase);
    }

    /**
     * Adjust phase timing based on music characteristics
     */
    adjustPhaseTimingForMusic() {
        const { tempo, intensity, mood } = this.musicAnalysis;
        
        // Get pacing multiplier
        const pacingMultiplier = this.pacingMultipliers[tempo] || 1.0;
        
        // Adjust phases based on mood and intensity
        switch (mood) {
            case 'mysterious':
                // Longer approach, shorter finale
                this.adjustPhaseTiming(0, 0.35); // Extend approach
                this.adjustPhaseTiming(3, 0.10); // Shorten finale
                break;
                
            case 'dramatic':
                // Longer reveal phase
                this.adjustPhaseTiming(1, 0.40); // Extend reveal
                this.adjustPhaseTiming(2, 0.25); // Shorten showcase
                break;
                
            case 'heroic':
                // Balanced with strong finale
                this.adjustPhaseTiming(3, 0.20); // Extend finale
                break;
                
            case 'aggressive':
                // Quick approach, extended showcase
                this.adjustPhaseTiming(0, 0.15); // Shorten approach
                this.adjustPhaseTiming(2, 0.40); // Extend showcase
                break;
                
            case 'epic':
                // Extended finale for maximum impact
                this.adjustPhaseTiming(3, 0.25); // Extend finale
                break;
        }
        
        // Apply intensity modifiers
        const intensityMod = this.intensityModifiers[intensity] || this.intensityModifiers.moderate;
        
        if (intensityMod.tension > 0.8) {
            // High tension - extend approach and reveal
            this.adjustPhaseTiming(0, Math.min(this.phases[0].endTime + 0.05, 0.35));
            this.adjustPhaseTiming(1, Math.min(this.phases[1].endTime + 0.05, 0.45));
        }
        
        // Recalculate phase boundaries after adjustments
        this.recalculatePhases();
    }

    /**
     * Adjust timing for specific phase
     */
    adjustPhaseTiming(phaseIndex, newDuration) {
        if (phaseIndex >= 0 && phaseIndex < this.phases.length) {
            const phase = this.phases[phaseIndex];
            const currentDuration = phase.endTime - phase.startTime;
            const adjustment = newDuration - currentDuration;
            
            // Adjust this phase
            phase.endTime = phase.startTime + newDuration;
            
            // Adjust subsequent phases
            for (let i = phaseIndex + 1; i < this.phases.length; i++) {
                this.phases[i].startTime = Math.max(0, this.phases[i].startTime + adjustment);
                this.phases[i].endTime = Math.min(1, this.phases[i].endTime + adjustment);
            }
        }
    }

    /**
     * Recalculate phase boundaries to ensure they sum to 1.0
     */
    recalculatePhases() {
        let totalDuration = 0;
        
        // Calculate current total duration
        this.phases.forEach(phase => {
            totalDuration += (phase.endTime - phase.startTime);
        });
        
        // Normalize if necessary
        if (Math.abs(totalDuration - 1.0) > 0.01) {
            const scale = 1.0 / totalDuration;
            let currentStart = 0;
            
            this.phases.forEach(phase => {
                const duration = (phase.endTime - phase.startTime) * scale;
                phase.startTime = currentStart;
                phase.endTime = currentStart + duration;
                currentStart = phase.endTime;
            });
        }
    }

    /**
     * Setup narrative events based on sequence and music
     */
    setupNarrativeEvents() {
        this.events = [];
        
        // Phase transition events
        this.phases.forEach((phase, index) => {
            this.events.push({
                time: phase.startTime,
                type: 'phase_start',
                phase: phase.name,
                data: { phaseIndex: index, phase }
            });
            
            this.events.push({
                time: phase.endTime,
                type: 'phase_end',
                phase: phase.name,
                data: { phaseIndex: index, phase }
            });
        });
        
        // Music-synchronized events
        this.addMusicSynchronizedEvents();
        
        // Dramatic moments
        this.addDramaticMoments();
        
        // Sort events by time
        this.events.sort((a, b) => a.time - b.time);
    }

    /**
     * Add events synchronized to music characteristics
     */
    addMusicSynchronizedEvents() {
        const { tempo, intensity, mood } = this.musicAnalysis;
        
        // Add tempo-based events
        if (tempo === 'slow') {
            // Fewer, more impactful events
            this.events.push({
                time: 0.4,
                type: 'dramatic_pause',
                data: { duration: 1.0 }
            });
        } else if (tempo === 'fast' || tempo === 'very_fast') {
            // More frequent events
            for (let i = 0.1; i < 1.0; i += 0.15) {
                this.events.push({
                    time: i,
                    type: 'energy_burst',
                    data: { intensity: 0.8 }
                });
            }
        }
        
        // Add intensity-based events
        if (intensity === 'high' || intensity === 'extreme') {
            this.events.push({
                time: 0.6,
                type: 'climax_moment',
                data: { peak: true }
            });
        }
        
        // Add mood-specific events
        switch (mood) {
            case 'mysterious':
                this.events.push({
                    time: 0.2,
                    type: 'mystery_deepens',
                    data: { suspense: true }
                });
                break;
                
            case 'heroic':
                this.events.push({
                    time: 0.9,
                    type: 'heroic_moment',
                    data: { triumph: true }
                });
                break;
                
            case 'dramatic':
                this.events.push({
                    time: 0.45,
                    type: 'dramatic_revelation',
                    data: { impact: 'high' }
                });
                break;
        }
    }

    /**
     * Add dramatic moments for enhanced storytelling
     */
    addDramaticMoments() {
        // First glimpse moment
        this.events.push({
            time: 0.28,
            type: 'first_glimpse',
            data: { reveal: 'partial' }
        });
        
        // Full reveal moment
        this.events.push({
            time: 0.35,
            type: 'full_reveal',
            data: { reveal: 'complete' }
        });
        
        // Beauty shot moment
        this.events.push({
            time: 0.7,
            type: 'beauty_shot',
            data: { focus: 'aesthetic' }
        });
        
        // Final hero moment
        this.events.push({
            time: 0.95,
            type: 'hero_moment',
            data: { finale: true }
        });
    }

    /**
     * Update narrative based on current progress
     */
    updatePhase(progress) {
        // Find current phase
        const newPhase = this.getCurrentPhaseByProgress(progress);
        
        // Check for phase transition
        if (newPhase && (!this.currentPhase || newPhase.name !== this.currentPhase.name)) {
            if (this.currentPhase) {
                this.triggerPhaseEnd(this.currentPhase);
            }
            this.currentPhase = newPhase;
            this.triggerPhaseStart(newPhase);
        }
        
        // Process events at current progress
        this.processEvents(progress);
        
        return this.currentPhase;
    }

    /**
     * Get current phase by progress value
     */
    getCurrentPhaseByProgress(progress) {
        for (const phase of this.phases) {
            if (progress >= phase.startTime && progress <= phase.endTime) {
                return phase;
            }
        }
        return this.phases[this.phases.length - 1]; // Return last phase as fallback
    }

    /**
     * Process narrative events at current progress
     */
    processEvents(progress) {
        this.events.forEach(event => {
            if (!event.triggered && progress >= event.time) {
                event.triggered = true;
                this.triggerEvent(event);
            }
        });
    }

    /**
     * Trigger phase start
     */
    triggerPhaseStart(phase) {
        this.executeCallback('phase_start', {
            phase: phase.name,
            description: phase.description,
            startTime: phase.startTime,
            endTime: phase.endTime
        });
        
        // Phase-specific setup
        switch (phase.name) {
            case 'approach':
                this.setupApproachPhase();
                break;
            case 'reveal':
                this.setupRevealPhase();
                break;
            case 'showcase':
                this.setupShowcasePhase();
                break;
            case 'finale':
                this.setupFinalePhase();
                break;
        }
    }

    /**
     * Trigger phase end
     */
    triggerPhaseEnd(phase) {
        this.executeCallback('phase_end', {
            phase: phase.name,
            description: phase.description
        });
    }

    /**
     * Trigger narrative event
     */
    triggerEvent(event) {
        this.executeCallback(event.type, event.data);
        
        // Handle specific event types
        switch (event.type) {
            case 'dramatic_pause':
                this.handleDramaticPause(event.data);
                break;
            case 'climax_moment':
                this.handleClimaxMoment(event.data);
                break;
            case 'heroic_moment':
                this.handleHeroicMoment(event.data);
                break;
        }
    }

    /**
     * Setup approach phase characteristics
     */
    setupApproachPhase() {
        // Approach phase focuses on building tension and mystery
        this.executeCallback('narrative_instruction', {
            phase: 'approach',
            mood: 'mysterious',
            cameraStyle: 'distant_stalking',
            lightingStyle: 'low_key',
            pacing: 'deliberate'
        });
    }

    /**
     * Setup reveal phase characteristics
     */
    setupRevealPhase() {
        // Reveal phase focuses on dramatic unveiling
        this.executeCallback('narrative_instruction', {
            phase: 'reveal',
            mood: 'dramatic',
            cameraStyle: 'dynamic_reveal',
            lightingStyle: 'dramatic_contrast',
            pacing: 'accelerating'
        });
    }

    /**
     * Setup showcase phase characteristics
     */
    setupShowcasePhase() {
        // Showcase phase focuses on beauty and detail
        this.executeCallback('narrative_instruction', {
            phase: 'showcase',
            mood: 'appreciative',
            cameraStyle: 'beauty_shots',
            lightingStyle: 'flattering',
            pacing: 'flowing'
        });
    }

    /**
     * Setup finale phase characteristics
     */
    setupFinalePhase() {
        // Finale phase focuses on heroic conclusion
        this.executeCallback('narrative_instruction', {
            phase: 'finale',
            mood: 'triumphant',
            cameraStyle: 'hero_shot',
            lightingStyle: 'heroic',
            pacing: 'resolving'
        });
    }

    /**
     * Handle dramatic pause event
     */
    handleDramaticPause(data) {
        this.executeCallback('dramatic_pause', {
            duration: data.duration,
            instruction: 'slow_camera_movement'
        });
    }

    /**
     * Handle climax moment event
     */
    handleClimaxMoment(data) {
        this.executeCallback('climax_moment', {
            peak: data.peak,
            instruction: 'maximum_drama'
        });
    }

    /**
     * Handle heroic moment event
     */
    handleHeroicMoment(data) {
        this.executeCallback('heroic_moment', {
            triumph: data.triumph,
            instruction: 'hero_positioning'
        });
    }

    /**
     * Register callback for narrative events
     */
    on(eventType, callback) {
        if (!this.eventCallbacks.has(eventType)) {
            this.eventCallbacks.set(eventType, []);
        }
        this.eventCallbacks.get(eventType).push(callback);
    }

    /**
     * Execute callbacks for event type
     */
    executeCallback(eventType, data) {
        if (this.eventCallbacks.has(eventType)) {
            this.eventCallbacks.get(eventType).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.warn(`Narrative callback error for ${eventType}:`, error);
                }
            });
        }
    }

    /**
     * Get current phase information
     */
    getCurrentPhase() {
        return this.currentPhase;
    }

    /**
     * Get phase progress (0-1 within current phase)
     */
    getPhaseProgress(globalProgress) {
        if (!this.currentPhase) return 0;
        
        const phaseStart = this.currentPhase.startTime;
        const phaseEnd = this.currentPhase.endTime;
        const phaseDuration = phaseEnd - phaseStart;
        
        if (phaseDuration <= 0) return 1;
        
        const phaseProgress = (globalProgress - phaseStart) / phaseDuration;
        return Math.max(0, Math.min(1, phaseProgress));
    }

    /**
     * Get narrative state
     */
    getNarrativeState() {
        return {
            currentPhase: this.currentPhase?.name || null,
            phases: this.phases.map(phase => ({
                name: phase.name,
                startTime: phase.startTime,
                endTime: phase.endTime,
                description: phase.description
            })),
            musicAnalysis: this.musicAnalysis,
            eventCount: this.events.length,
            triggeredEvents: this.events.filter(e => e.triggered).length
        };
    }

    /**
     * Reset narrative controller
     */
    reset() {
        this.currentPhase = null;
        this.currentSequence = null;
        this.musicAnalysis = null;
        this.events = [];
        this.startTime = 0;
        
        // Reset phase timings to default
        this.phases = [
            { name: 'approach', startTime: 0.0, endTime: 0.25, description: 'Mysterious approach - building anticipation' },
            { name: 'reveal', startTime: 0.25, endTime: 0.55, description: 'Dramatic reveal - unveiling the subject' },
            { name: 'showcase', startTime: 0.55, endTime: 0.85, description: 'Detailed showcase - highlighting features' },
            { name: 'finale', startTime: 0.85, endTime: 1.0, description: 'Epic finale - heroic conclusion' }
        ];
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.reset();
        this.eventCallbacks.clear();
    }
}