/**
 * AudioAnalyzer - Analyzes music for tempo, intensity, and emotional tone
 * Used to select appropriate cinematic sequences that match the music
 */
export class AudioAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyzer = null;
        this.dataArray = null;
        this.bufferLength = 0;
        
        // Analysis parameters
        this.fftSize = 2048;
        this.smoothingTimeConstant = 0.8;
        
        // Frequency ranges for analysis
        this.frequencyRanges = {
            bass: { min: 20, max: 250 },
            lowMid: { min: 250, max: 500 },
            mid: { min: 500, max: 2000 },
            highMid: { min: 2000, max: 4000 },
            treble: { min: 4000, max: 20000 }
        };
        
        // Tempo detection
        this.beatHistory = [];
        this.lastBeatTime = 0;
        this.beatThreshold = 0.3;
        
        // Analysis results cache
        this.analysisCache = new Map();
    }

    /**
     * Analyze audio for cinematic sequence selection
     * @param {HTMLAudioElement} audioElement - Audio element to analyze
     * @returns {Promise<Object>} Analysis results
     */
    async analyzeAudio(audioElement) {
        // Check cache first
        const cacheKey = this.getCacheKey(audioElement);
        if (this.analysisCache.has(cacheKey)) {
            return this.analysisCache.get(cacheKey);
        }

        try {
            await this.setupAudioContext(audioElement);
            
            // Perform comprehensive analysis
            const analysis = await this.performAnalysis(audioElement);
            
            // Cache results
            this.analysisCache.set(cacheKey, analysis);
            
            return analysis;
        } catch (error) {
            console.warn('Audio analysis failed, using default values:', error);
            return this.getDefaultAnalysis();
        }
    }

    /**
     * Setup Web Audio API context and analyzer
     */
    async setupAudioContext(audioElement) {
        try {
            // Check if Web Audio API is available
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) {
                throw new Error('Web Audio API not supported');
            }
            
            if (!this.audioContext) {
                this.audioContext = new AudioContextClass();
            }

            // Resume context if suspended (required by some browsers)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // Create analyzer node
            this.analyzer = this.audioContext.createAnalyser();
            this.analyzer.fftSize = this.fftSize;
            this.analyzer.smoothingTimeConstant = this.smoothingTimeConstant;
            
            this.bufferLength = this.analyzer.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);

            // Connect audio source to analyzer
            try {
                const source = this.audioContext.createMediaElementSource(audioElement);
                source.connect(this.analyzer);
                source.connect(this.audioContext.destination);
            } catch (sourceError) {
                // Handle case where audio element is already connected
                console.warn('Audio source connection failed, audio analysis may be limited:', sourceError);
            }
            
        } catch (error) {
            console.warn('Web Audio API setup failed:', error);
            throw error;
        }
    }

    /**
     * Perform comprehensive audio analysis
     */
    async performAnalysis(audioElement) {
        return new Promise((resolve) => {
            const analysisData = {
                frequencyData: [],
                timeData: [],
                beats: [],
                sampleCount: 0
            };

            const sampleDuration = 30000; // Analyze first 30 seconds
            const sampleInterval = 100; // Sample every 100ms
            const maxSamples = sampleDuration / sampleInterval;

            const collectSample = () => {
                if (analysisData.sampleCount >= maxSamples || audioElement.ended) {
                    resolve(this.processAnalysisData(analysisData));
                    return;
                }

                // Get frequency data
                this.analyzer.getByteFrequencyData(this.dataArray);
                analysisData.frequencyData.push(new Uint8Array(this.dataArray));

                // Get time domain data for beat detection
                this.analyzer.getByteTimeDomainData(this.dataArray);
                analysisData.timeData.push(new Uint8Array(this.dataArray));

                // Detect beats
                const beat = this.detectBeat(this.dataArray);
                if (beat) {
                    analysisData.beats.push(audioElement.currentTime);
                }

                analysisData.sampleCount++;
                setTimeout(collectSample, sampleInterval);
            };

            // Start sampling after a brief delay
            setTimeout(collectSample, 1000);
        });
    }

    /**
     * Process collected analysis data into usable metrics
     */
    processAnalysisData(data) {
        const tempo = this.calculateTempo(data.beats);
        const intensity = this.calculateIntensity(data.frequencyData);
        const mood = this.determineMood(data.frequencyData, tempo, intensity);
        const dynamics = this.analyzeDynamics(data.frequencyData);
        
        return {
            tempo: this.categorizeTempo(tempo),
            tempoValue: tempo,
            intensity: this.categorizeIntensity(intensity),
            intensityValue: intensity,
            mood,
            dynamics,
            frequencyProfile: this.createFrequencyProfile(data.frequencyData),
            confidence: this.calculateConfidence(data)
        };
    }

    /**
     * Calculate tempo from beat detection
     */
    calculateTempo(beats) {
        if (beats.length < 2) return 120; // Default tempo

        const intervals = [];
        for (let i = 1; i < beats.length; i++) {
            intervals.push(beats[i] - beats[i - 1]);
        }

        // Calculate average interval
        const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
        
        // Convert to BPM
        return Math.round(60 / avgInterval);
    }

    /**
     * Calculate overall intensity from frequency data
     */
    calculateIntensity(frequencyData) {
        let totalEnergy = 0;
        let sampleCount = 0;

        frequencyData.forEach(sample => {
            const energy = sample.reduce((sum, value) => sum + (value / 255) ** 2, 0);
            totalEnergy += energy;
            sampleCount++;
        });

        return sampleCount > 0 ? totalEnergy / sampleCount : 0;
    }

    /**
     * Determine emotional mood from audio characteristics
     */
    determineMood(frequencyData, tempo, intensity) {
        const profile = this.createFrequencyProfile(frequencyData);
        
        // Analyze frequency distribution for mood indicators
        const bassRatio = profile.bass / (profile.bass + profile.mid + profile.treble);
        const trebleRatio = profile.treble / (profile.bass + profile.mid + profile.treble);
        
        // Mood classification based on multiple factors
        if (intensity > 0.7 && tempo > 140) {
            return trebleRatio > 0.4 ? 'aggressive' : 'energetic';
        } else if (intensity > 0.5 && tempo > 100) {
            return bassRatio > 0.4 ? 'powerful' : 'heroic';
        } else if (intensity < 0.3 && tempo < 80) {
            return trebleRatio > 0.3 ? 'mysterious' : 'dramatic';
        } else if (bassRatio > 0.5) {
            return 'epic';
        } else {
            return 'cinematic';
        }
    }

    /**
     * Analyze dynamic range and variation
     */
    analyzeDynamics(frequencyData) {
        const energyLevels = frequencyData.map(sample => 
            sample.reduce((sum, value) => sum + value, 0) / sample.length
        );

        const maxEnergy = Math.max(...energyLevels);
        const minEnergy = Math.min(...energyLevels);
        const avgEnergy = energyLevels.reduce((sum, energy) => sum + energy, 0) / energyLevels.length;

        return {
            range: maxEnergy - minEnergy,
            variation: this.calculateVariation(energyLevels),
            peaks: this.findPeaks(energyLevels),
            consistency: 1 - (this.calculateVariation(energyLevels) / avgEnergy)
        };
    }

    /**
     * Create frequency profile for mood analysis
     */
    createFrequencyProfile(frequencyData) {
        const sampleRate = this.audioContext ? this.audioContext.sampleRate : 44100;
        const binSize = sampleRate / this.fftSize;
        
        let bassTotal = 0, midTotal = 0, trebleTotal = 0;
        let sampleCount = 0;

        frequencyData.forEach(sample => {
            sample.forEach((value, index) => {
                const frequency = index * binSize;
                
                if (frequency >= this.frequencyRanges.bass.min && frequency <= this.frequencyRanges.bass.max) {
                    bassTotal += value;
                } else if (frequency >= this.frequencyRanges.mid.min && frequency <= this.frequencyRanges.mid.max) {
                    midTotal += value;
                } else if (frequency >= this.frequencyRanges.treble.min && frequency <= this.frequencyRanges.treble.max) {
                    trebleTotal += value;
                }
            });
            sampleCount++;
        });

        return {
            bass: bassTotal / sampleCount,
            mid: midTotal / sampleCount,
            treble: trebleTotal / sampleCount
        };
    }

    /**
     * Detect beats in time domain data
     */
    detectBeat(timeData) {
        // Calculate energy in current frame
        const energy = timeData.reduce((sum, value) => {
            const normalized = (value - 128) / 128;
            return sum + normalized * normalized;
        }, 0);

        const currentTime = performance.now();
        
        // Simple beat detection based on energy threshold
        if (energy > this.beatThreshold && (currentTime - this.lastBeatTime) > 300) {
            this.lastBeatTime = currentTime;
            return true;
        }
        
        return false;
    }

    /**
     * Categorize tempo into descriptive ranges
     */
    categorizeTempo(bpm) {
        if (bpm < 80) return 'slow';
        if (bpm < 120) return 'medium';
        if (bpm < 160) return 'fast';
        return 'very_fast';
    }

    /**
     * Categorize intensity into descriptive levels
     */
    categorizeIntensity(intensity) {
        if (intensity < 0.3) return 'subtle';
        if (intensity < 0.6) return 'moderate';
        if (intensity < 0.8) return 'high';
        return 'extreme';
    }

    /**
     * Calculate statistical variation
     */
    calculateVariation(values) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }

    /**
     * Find energy peaks in the audio
     */
    findPeaks(energyLevels) {
        const peaks = [];
        const threshold = Math.max(...energyLevels) * 0.7;
        
        for (let i = 1; i < energyLevels.length - 1; i++) {
            if (energyLevels[i] > threshold && 
                energyLevels[i] > energyLevels[i - 1] && 
                energyLevels[i] > energyLevels[i + 1]) {
                peaks.push(i);
            }
        }
        
        return peaks;
    }

    /**
     * Calculate confidence in analysis results
     */
    calculateConfidence(data) {
        let confidence = 0.5; // Base confidence
        
        // More samples = higher confidence
        if (data.sampleCount > 200) confidence += 0.2;
        
        // Beat detection success increases confidence
        if (data.beats.length > 10) confidence += 0.2;
        
        // Consistent frequency data increases confidence
        if (data.frequencyData.length > 100) confidence += 0.1;
        
        return Math.min(confidence, 1.0);
    }

    /**
     * Get cache key for audio element
     */
    getCacheKey(audioElement) {
        return audioElement.src || audioElement.currentSrc || 'unknown';
    }

    /**
     * Get default analysis when audio analysis fails
     */
    getDefaultAnalysis() {
        return {
            tempo: 'medium',
            tempoValue: 120,
            intensity: 'moderate',
            intensityValue: 0.5,
            mood: 'heroic',
            dynamics: {
                range: 0.5,
                variation: 0.3,
                peaks: [],
                consistency: 0.7
            },
            frequencyProfile: {
                bass: 0.3,
                mid: 0.4,
                treble: 0.3
            },
            confidence: 0.3
        };
    }

    /**
     * Dispose of audio context and resources
     */
    dispose() {
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.analyzer = null;
        this.dataArray = null;
        this.analysisCache.clear();
    }
}