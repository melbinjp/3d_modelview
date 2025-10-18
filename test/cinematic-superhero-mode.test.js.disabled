import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { CinematicEngine } from '../src/cinematic/CinematicEngine.js';
import { AudioAnalyzer } from '../src/cinematic/AudioAnalyzer.js';
import { CameraSequenceLibrary } from '../src/cinematic/CameraSequenceLibrary.js';
import { LightingDirector } from '../src/cinematic/LightingDirector.js';
import { EnvironmentDirector } from '../src/cinematic/EnvironmentDirector.js';
import { NarrativeController } from '../src/cinematic/NarrativeController.js';

// Mock Web Audio API
global.AudioContext = vi.fn(() => ({
    createAnalyser: vi.fn(() => ({
        fftSize: 2048,
        frequencyBinCount: 1024,
        getByteFrequencyData: vi.fn(),
        getByteTimeDomainData: vi.fn()
    })),
    createMediaElementSource: vi.fn(() => ({
        connect: vi.fn()
    })),
    destination: {},
    resume: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    state: 'running',
    sampleRate: 44100
}));

global.webkitAudioContext = global.AudioContext;

describe('Cinematic Superhero Mode', () => {
    let mockRenderingEngine;
    let cinematicEngine;
    let mockModel;

    beforeEach(() => {
        // Mock rendering engine
        mockRenderingEngine = {
            scene: new THREE.Scene(),
            camera: new THREE.PerspectiveCamera(75, 1, 0.1, 1000),
            renderer: {
                shadowMap: {
                    enabled: false,
                    type: THREE.PCFSoftShadowMap,
                    autoUpdate: true
                }
            }
        };

        // Create mock model
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        mockModel = new THREE.Mesh(geometry, material);
        mockRenderingEngine.scene.add(mockModel);

        cinematicEngine = new CinematicEngine(mockRenderingEngine);
    });

    describe('CinematicEngine', () => {
        it('should initialize with all required components', () => {
            expect(cinematicEngine.audioAnalyzer).toBeInstanceOf(AudioAnalyzer);
            expect(cinematicEngine.cameraSequences).toBeInstanceOf(CameraSequenceLibrary);
            expect(cinematicEngine.lightingDirector).toBeInstanceOf(LightingDirector);
            expect(cinematicEngine.environmentDirector).toBeInstanceOf(EnvironmentDirector);
            expect(cinematicEngine.narrativeController).toBeInstanceOf(NarrativeController);
        });

        it('should not be active initially', () => {
            expect(cinematicEngine.isActive).toBe(false);
        });

        it('should start reveal sequence', async () => {
            const options = {
                model: mockModel,
                environmentType: 'cosmic_scene'
            };

            const result = await cinematicEngine.startReveal(options);
            
            expect(cinematicEngine.isActive).toBe(true);
            expect(result).toHaveProperty('duration');
            expect(result).toHaveProperty('sequence');
            expect(typeof result.duration).toBe('number');
            expect(typeof result.sequence).toBe('string');
        });

        it('should stop reveal sequence', async () => {
            const options = {
                model: mockModel,
                environmentType: 'cosmic_scene'
            };

            await cinematicEngine.startReveal(options);
            expect(cinematicEngine.isActive).toBe(true);

            cinematicEngine.stopReveal();
            expect(cinematicEngine.isActive).toBe(false);
        });

        it('should analyze model bounds correctly', async () => {
            cinematicEngine.targetModel = mockModel;
            cinematicEngine.analyzeModel();

            expect(cinematicEngine.modelBounds).toBeInstanceOf(THREE.Box3);
            expect(cinematicEngine.modelCenter).toBeInstanceOf(THREE.Vector3);
            expect(cinematicEngine.modelSize).toBeGreaterThan(0);
        });
    });

    describe('AudioAnalyzer', () => {
        let audioAnalyzer;

        beforeEach(() => {
            audioAnalyzer = new AudioAnalyzer();
        });

        it('should initialize with default values', () => {
            expect(audioAnalyzer.fftSize).toBe(2048);
            expect(audioAnalyzer.smoothingTimeConstant).toBe(0.8);
            expect(audioAnalyzer.frequencyRanges).toHaveProperty('bass');
            expect(audioAnalyzer.frequencyRanges).toHaveProperty('mid');
            expect(audioAnalyzer.frequencyRanges).toHaveProperty('treble');
        });

        it('should return default analysis when audio fails', async () => {
            const mockAudio = { src: 'test.mp3' };
            const analysis = await audioAnalyzer.analyzeAudio(mockAudio);

            expect(analysis).toHaveProperty('tempo');
            expect(analysis).toHaveProperty('intensity');
            expect(analysis).toHaveProperty('mood');
            expect(analysis.tempo).toBe('medium');
            expect(analysis.intensity).toBe('moderate');
            expect(analysis.mood).toBe('heroic');
        });

        it('should categorize tempo correctly', () => {
            expect(audioAnalyzer.categorizeTempo(70)).toBe('slow');
            expect(audioAnalyzer.categorizeTempo(100)).toBe('medium');
            expect(audioAnalyzer.categorizeTempo(140)).toBe('fast');
            expect(audioAnalyzer.categorizeTempo(180)).toBe('very_fast');
        });

        it('should categorize intensity correctly', () => {
            expect(audioAnalyzer.categorizeIntensity(0.2)).toBe('subtle');
            expect(audioAnalyzer.categorizeIntensity(0.5)).toBe('moderate');
            expect(audioAnalyzer.categorizeIntensity(0.7)).toBe('high');
            expect(audioAnalyzer.categorizeIntensity(0.9)).toBe('extreme');
        });
    });

    describe('CameraSequenceLibrary', () => {
        let sequenceLibrary;

        beforeEach(() => {
            sequenceLibrary = new CameraSequenceLibrary();
        });

        it('should initialize with predefined sequences', () => {
            const sequences = sequenceLibrary.getAllSequences();
            expect(sequences.length).toBeGreaterThan(0);
            expect(sequences).toContain('mysterious_approach_slow');
            expect(sequences).toContain('dramatic_reveal_moderate');
            expect(sequences).toContain('showcase_orbit');
            expect(sequences).toContain('epic_finale_heroic');
        });

        it('should select appropriate sequence based on music analysis', () => {
            const musicAnalysis = {
                tempo: 'medium',
                intensity: 'moderate',
                mood: 'heroic'
            };

            const sequence = sequenceLibrary.selectSequence(musicAnalysis, 5);
            expect(sequence).toHaveProperty('name');
            expect(sequence).toHaveProperty('phases');
            expect(sequence).toHaveProperty('totalDuration');
            expect(sequence.phases.length).toBeGreaterThan(0);
        });

        it('should provide camera states for sequences', () => {
            const sequence = sequenceLibrary.getSequence('showcase_orbit');
            expect(sequence).toBeDefined();

            const cameraState = sequence.getCameraState(0.5, new THREE.Vector3(0, 0, 0), 5);
            expect(cameraState).toHaveProperty('position');
            expect(cameraState).toHaveProperty('target');
            expect(cameraState).toHaveProperty('fov');
            expect(cameraState.position).toBeInstanceOf(THREE.Vector3);
            expect(cameraState.target).toBeInstanceOf(THREE.Vector3);
        });
    });

    describe('LightingDirector', () => {
        let lightingDirector;

        beforeEach(() => {
            lightingDirector = new LightingDirector(mockRenderingEngine.scene, mockRenderingEngine.renderer);
        });

        it('should initialize with default configuration', () => {
            expect(lightingDirector.config).toHaveProperty('enableShadows');
            expect(lightingDirector.config).toHaveProperty('shadowMapSize');
            expect(lightingDirector.config).toHaveProperty('rimLightIntensity');
            expect(lightingDirector.lights).toBeInstanceOf(Map);
        });

        it('should setup cinematic lighting', () => {
            const modelCenter = new THREE.Vector3(0, 0, 0);
            lightingDirector.setupCinematicLighting(mockModel, modelCenter);

            expect(lightingDirector.keyLight).toBeInstanceOf(THREE.DirectionalLight);
            expect(lightingDirector.fillLight).toBeInstanceOf(THREE.DirectionalLight);
            expect(lightingDirector.rimLight).toBeInstanceOf(THREE.DirectionalLight);
            expect(lightingDirector.lights.size).toBeGreaterThan(0);
        });

        it('should update lighting based on phase', () => {
            const modelCenter = new THREE.Vector3(0, 0, 0);
            lightingDirector.setupCinematicLighting(mockModel, modelCenter);

            const initialIntensity = lightingDirector.keyLight.intensity;
            lightingDirector.updateLighting(0.5, 'reveal');
            
            // Lighting should be updated (intensity may change)
            expect(lightingDirector.currentPhase).toBe('reveal');
        });

        it('should cleanup lighting properly', () => {
            const modelCenter = new THREE.Vector3(0, 0, 0);
            lightingDirector.setupCinematicLighting(mockModel, modelCenter);
            
            const lightCount = lightingDirector.lights.size;
            expect(lightCount).toBeGreaterThan(0);

            lightingDirector.cleanup();
            expect(lightingDirector.lights.size).toBe(0);
            expect(lightingDirector.keyLight).toBeNull();
        });
    });

    describe('EnvironmentDirector', () => {
        let environmentDirector;

        beforeEach(() => {
            environmentDirector = new EnvironmentDirector(mockRenderingEngine.scene);
        });

        it('should initialize with available environments', () => {
            expect(environmentDirector.environments.size).toBeGreaterThan(0);
            expect(environmentDirector.environments.has('cosmic_scene')).toBe(true);
            expect(environmentDirector.environments.has('stormy_skies')).toBe(true);
            expect(environmentDirector.environments.has('urban_landscape')).toBe(true);
        });

        it('should setup environment', async () => {
            await environmentDirector.setupEnvironment('cosmic_scene');
            expect(environmentDirector.currentEnvironment).toBe('cosmic_scene');
            expect(environmentDirector.environmentMeshes.length).toBeGreaterThan(0);
        });

        it('should update environment effects', () => {
            // Should not throw error even without environment setup
            expect(() => {
                environmentDirector.updateEffects(0.5, 'showcase');
            }).not.toThrow();
        });

        it('should cleanup environment', async () => {
            await environmentDirector.setupEnvironment('cosmic_scene');
            const meshCount = environmentDirector.environmentMeshes.length;
            expect(meshCount).toBeGreaterThan(0);

            environmentDirector.cleanup();
            expect(environmentDirector.environmentMeshes.length).toBe(0);
            expect(environmentDirector.currentEnvironment).toBeNull();
        });
    });

    describe('NarrativeController', () => {
        let narrativeController;

        beforeEach(() => {
            narrativeController = new NarrativeController();
        });

        it('should initialize with default phases', () => {
            expect(narrativeController.phases.length).toBe(4);
            expect(narrativeController.phases[0].name).toBe('approach');
            expect(narrativeController.phases[1].name).toBe('reveal');
            expect(narrativeController.phases[2].name).toBe('showcase');
            expect(narrativeController.phases[3].name).toBe('finale');
        });

        it('should start narrative sequence', () => {
            const mockSequence = { name: 'test_sequence', totalDuration: 20 };
            const mockAnalysis = { tempo: 'medium', intensity: 'moderate', mood: 'heroic' };

            narrativeController.startNarrative(mockSequence, mockAnalysis);
            
            expect(narrativeController.currentSequence).toBe(mockSequence);
            expect(narrativeController.musicAnalysis).toBe(mockAnalysis);
            expect(narrativeController.currentPhase).toBe(narrativeController.phases[0]);
        });

        it('should update phase based on progress', () => {
            const mockSequence = { name: 'test_sequence', totalDuration: 20 };
            const mockAnalysis = { tempo: 'medium', intensity: 'moderate', mood: 'heroic' };

            narrativeController.startNarrative(mockSequence, mockAnalysis);
            
            // Test phase transitions
            let phase = narrativeController.updatePhase(0.1); // Should be approach
            expect(phase.name).toBe('approach');

            phase = narrativeController.updatePhase(0.4); // Should be reveal
            expect(phase.name).toBe('reveal');

            phase = narrativeController.updatePhase(0.7); // Should be showcase
            expect(phase.name).toBe('showcase');

            phase = narrativeController.updatePhase(0.9); // Should be finale
            expect(phase.name).toBe('finale');
        });

        it('should register and execute callbacks', () => {
            let callbackExecuted = false;
            let callbackData = null;

            narrativeController.on('test_event', (data) => {
                callbackExecuted = true;
                callbackData = data;
            });

            narrativeController.executeCallback('test_event', { test: 'data' });
            
            expect(callbackExecuted).toBe(true);
            expect(callbackData).toEqual({ test: 'data' });
        });
    });

    describe('Integration Tests', () => {
        it('should complete full cinematic sequence', async () => {
            const options = {
                model: mockModel,
                environmentType: 'cosmic_scene'
            };

            // Start sequence
            const result = await cinematicEngine.startReveal(options);
            expect(cinematicEngine.isActive).toBe(true);

            // Simulate animation progress
            cinematicEngine.animate = vi.fn(); // Mock animate to prevent actual animation loop
            
            // Test state retrieval
            const state = cinematicEngine.getState();
            expect(state).toHaveProperty('isActive');
            expect(state).toHaveProperty('progress');
            expect(state).toHaveProperty('currentPhase');
            expect(state.isActive).toBe(true);

            // Stop sequence
            cinematicEngine.stopReveal();
            expect(cinematicEngine.isActive).toBe(false);
        });

        it('should handle multiple environment types', async () => {
            const environments = ['cosmic_scene', 'stormy_skies', 'urban_landscape', 'studio_setup', 'heroic_dawn'];
            
            for (const envType of environments) {
                const options = {
                    model: mockModel,
                    environmentType: envType
                };

                await cinematicEngine.startReveal(options);
                expect(cinematicEngine.isActive).toBe(true);
                
                cinematicEngine.stopReveal();
                expect(cinematicEngine.isActive).toBe(false);
            }
        });
    });
});