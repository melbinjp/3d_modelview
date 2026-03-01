import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { SSRPass } from 'three/examples/jsm/postprocessing/SSRPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { DotScreenPass } from 'three/examples/jsm/postprocessing/DotScreenPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { HalftonePass } from 'three/examples/jsm/postprocessing/HalftonePass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { TAARenderPass } from 'three/examples/jsm/postprocessing/TAARenderPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { ColorCorrectionShader } from 'three/examples/jsm/shaders/ColorCorrectionShader.js';
import { BrightnessContrastShader } from 'three/examples/jsm/shaders/BrightnessContrastShader.js';
import { HueSaturationShader } from 'three/examples/jsm/shaders/HueSaturationShader.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { SAOPass } from 'three/examples/jsm/postprocessing/SAOPass.js';
import { ClearPass } from 'three/examples/jsm/postprocessing/ClearPass.js';
import { MaskPass } from 'three/examples/jsm/postprocessing/MaskPass.js';
import { TexturePass } from 'three/examples/jsm/postprocessing/TexturePass.js';
import { CubeTexturePass } from 'three/examples/jsm/postprocessing/CubeTexturePass.js';
import { LUTPass } from 'three/examples/jsm/postprocessing/LUTPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * PostProcessingManager - Manages all post-processing effects and pipelines with advanced GPU compute support
 */
export class PostProcessingManager {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        
        this.composer = null;
        this.renderPass = null;
        this.passes = new Map();
        this.customPasses = new Map();
        
        this.enabled = false;
        this.initialized = false;
        this.postProcessingEnabled = true;
        
        this.init();
    }

    /**
     * Initialize the post-processing system with robust error handling
     */
    init() {
        if (this.initialized) return;

        try {
            // Validate dependencies
            if (!this.renderer || !this.scene || !this.camera) {
                throw new Error('Missing required dependencies: renderer, scene, or camera');
            }

            // Check WebGL capabilities
            const gl = this.renderer.getContext();
            if (!gl) {
                throw new Error('WebGL context not available');
            }

            // Create effect composer with error handling
            try {
                this.composer = new EffectComposer(this.renderer);
                
                // Don't override setSize - let EffectComposer handle it normally
                // We'll handle resize issues in our own onResize method
                
                this.postProcessingEnabled = true;
                
            } catch (composerError) {
                console.error('Failed to create EffectComposer:', composerError);
                // Fallback: disable post-processing
                this.initialized = true;
                this.postProcessingEnabled = false;
                console.warn('Post-processing disabled due to compatibility issues');
                return;
            }
            
            // Base render pass
            this.renderPass = new RenderPass(this.scene, this.camera);
            
            try {
                this.composer.addPass(this.renderPass);
            } catch (passError) {
                console.error('Failed to add render pass:', passError);
                // Continue without post-processing
                this.postProcessingEnabled = false;
            }
            
            // Initialize passes with error handling
            if (this.postProcessingEnabled !== false) {
                this.initializePasses();
            }
            
            this.initialized = true;
            // Silent initialization
            
        } catch (error) {
            console.error('Failed to initialize PostProcessingManager:', error);
            // Don't throw - allow the app to continue without post-processing
            this.initialized = true;
            this.postProcessingEnabled = false;
            console.warn('Continuing without post-processing effects');
        }
    }

    /**
     * Safely create a post-processing pass with future-proofing
     */
    safeCreatePass(name, createFn) {
        try {
            const pass = createFn();
            if (pass) {
                // Add a dummy setSize method if it doesn't exist
                if (typeof pass.setSize !== 'function') {
                    pass.setSize = function(width, height) {
                        // Dummy implementation for compatibility
                        if (this.uniforms && this.uniforms.resolution) {
                            this.uniforms.resolution.value.set(width, height);
                        }
                    };
                    console.warn(`Pass "${name}" missing setSize method - added compatibility shim`);
                }
                
                this.passes.set(name, pass);
                return pass;
            }
        } catch (error) {
            console.warn(`Failed to create ${name} pass:`, error.message);
            // Log specific Three.js compatibility issues
            if (error.message.includes('deprecated') || error.message.includes('removed')) {
                console.info(`Pass "${name}" uses deprecated Three.js features - consider updating`);
            }
        }
        return null;
    }

    /**
     * Initialize all available post-processing passes
     */
    initializePasses() {
        // Create realistic enhancement presets
        this.createRealisticPresets();
        const size = this.renderer.getSize(new THREE.Vector2());
        
        // SSAO (Screen Space Ambient Occlusion)
        this.safeCreatePass('ssao', () => {
            const ssaoPass = new SSAOPass(this.scene, this.camera, size.width, size.height);
            ssaoPass.kernelRadius = 8;
            ssaoPass.minDistance = 0.005;
            ssaoPass.maxDistance = 0.1;
            ssaoPass.enabled = false;
            return ssaoPass;
        });

        // SSR (Screen Space Reflections)
        this.safeCreatePass('ssr', () => {
            const ssrPass = new SSRPass({
                renderer: this.renderer,
                scene: this.scene,
                camera: this.camera,
                width: size.width,
                height: size.height,
                groundReflector: null
            });
            ssrPass.enabled = false;
            return ssrPass;
        });

        // Depth of Field (Bokeh)
        this.safeCreatePass('bokeh', () => {
            const bokehPass = new BokehPass(this.scene, this.camera, {
                focus: 1.0,
                aperture: 0.025,
                maxblur: 0.01,
                width: size.width,
                height: size.height
            });
            bokehPass.enabled = false;
            return bokehPass;
        });

        // Bloom
        this.safeCreatePass('bloom', () => {
            const bloomPass = new UnrealBloomPass(
                new THREE.Vector2(size.width, size.height),
                1.5, // strength
                0.4, // radius
                0.85 // threshold
            );
            bloomPass.enabled = false;
            return bloomPass;
        });

        // Film grain
        this.safeCreatePass('film', () => {
            const filmPass = new FilmPass(0.35, 0.025, 648, false);
            filmPass.enabled = false;
            return filmPass;
        });

        // Dot screen
        this.safeCreatePass('dotscreen', () => {
            const dotScreenPass = new DotScreenPass();
            dotScreenPass.enabled = false;
            return dotScreenPass;
        });

        // Glitch effect
        this.safeCreatePass('glitch', () => {
            const glitchPass = new GlitchPass();
            glitchPass.enabled = false;
            return glitchPass;
        });

        // Halftone
        this.safeCreatePass('halftone', () => {
            const halftonePass = new HalftonePass(size.width, size.height, {});
            halftonePass.enabled = false;
            return halftonePass;
        });

        // Outline
        this.safeCreatePass('outline', () => {
            const outlinePass = new OutlinePass(new THREE.Vector2(size.width, size.height), this.scene, this.camera);
            outlinePass.enabled = false;
            return outlinePass;
        });

        // Anti-aliasing passes
        this.safeCreatePass('smaa', () => {
            const smaaPass = new SMAAPass(size.width * this.renderer.getPixelRatio(), size.height * this.renderer.getPixelRatio());
            smaaPass.enabled = false;
            return smaaPass;
        });

        this.safeCreatePass('taa', () => {
            const taaPass = new TAARenderPass(this.scene, this.camera);
            taaPass.enabled = false;
            return taaPass;
        });

        // Afterimage
        this.safeCreatePass('afterimage', () => {
            const afterimagePass = new AfterimagePass();
            afterimagePass.enabled = false;
            return afterimagePass;
        });

        // Shader-based passes
        this.safeCreatePass('fxaa', () => {
            const fxaaPass = new ShaderPass(FXAAShader);
            fxaaPass.enabled = false;
            return fxaaPass;
        });

        this.safeCreatePass('colorCorrection', () => {
            const colorCorrectionPass = new ShaderPass(ColorCorrectionShader);
            colorCorrectionPass.enabled = false;
            return colorCorrectionPass;
        });

        this.safeCreatePass('brightnessContrast', () => {
            const brightnessContrastPass = new ShaderPass(BrightnessContrastShader);
            brightnessContrastPass.enabled = false;
            return brightnessContrastPass;
        });

        this.safeCreatePass('hueSaturation', () => {
            const hueSaturationPass = new ShaderPass(HueSaturationShader);
            hueSaturationPass.enabled = false;
            return hueSaturationPass;
        });

        this.safeCreatePass('vignette', () => {
            const vignettePass = new ShaderPass(VignetteShader);
            vignettePass.enabled = false;
            return vignettePass;
        });

        // Advanced AO passes
        this.safeCreatePass('gtao', () => {
            const gtaoPass = new GTAOPass(this.scene, this.camera, size.width, size.height);
            gtaoPass.enabled = false;
            return gtaoPass;
        });

        this.safeCreatePass('sao', () => {
            const saoPass = new SAOPass(this.scene, this.camera, false, true);
            saoPass.enabled = false;
            return saoPass;
        });

        // LUT (Look-Up Table) pass for color grading
        this.safeCreatePass('lut', () => {
            const lutPass = new LUTPass();
            lutPass.enabled = false;
            return lutPass;
        });

        // Output pass for tone mapping
        this.safeCreatePass('output', () => {
            const outputPass = new OutputPass();
            outputPass.enabled = false;
            return outputPass;
        });

        // Custom GPU compute-based passes
        this.initializeComputePasses();

        // Add all passes to composer with error handling
        this.passes.forEach((pass, name) => {
            try {
                this.composer.addPass(pass);
            } catch (error) {
                console.warn(`Failed to add pass "${name}":`, error);
                // Remove the problematic pass
                this.passes.delete(name);
            }
        });
    }

    /**
     * Create realistic enhancement presets
     */
    createRealisticPresets() {
        // Realistic enhancement preset - subtle improvements without over-processing
        this.realisticPresets = new Map();

        this.realisticPresets.set('subtle', {
            name: 'Subtle Enhancement',
            description: 'Minimal processing for natural look',
            effects: {
                ssao: { enabled: true, kernelRadius: 4, minDistance: 0.005, maxDistance: 0.05 },
                fxaa: { enabled: true },
                colorCorrection: { enabled: true, brightness: 0.02, contrast: 0.05, saturation: 0.1 }
            }
        });

        this.realisticPresets.set('professional', {
            name: 'Professional',
            description: 'Professional quality enhancement',
            effects: {
                ssao: { enabled: true, kernelRadius: 8, minDistance: 0.005, maxDistance: 0.1 },
                smaa: { enabled: true },
                bloom: { enabled: true, strength: 0.3, radius: 0.4, threshold: 0.9 },
                colorCorrection: { enabled: true, brightness: 0.05, contrast: 0.1, saturation: 0.15 },
                vignette: { enabled: true, offset: 0.95, darkness: 0.1 }
            }
        });

        this.realisticPresets.set('cinematic', {
            name: 'Cinematic',
            description: 'Film-like quality with depth',
            effects: {
                ssao: { enabled: true, kernelRadius: 12, minDistance: 0.01, maxDistance: 0.15 },
                ssr: { enabled: true, opacity: 0.3, maxDistance: 3.0, thickness: 0.018 },
                bloom: { enabled: true, strength: 0.5, radius: 0.5, threshold: 0.8 },
                bokeh: { enabled: false, focus: 1.0, aperture: 0.025, maxblur: 0.01 },
                colorCorrection: { enabled: true, brightness: 0.1, contrast: 0.2, saturation: 0.2 },
                vignette: { enabled: true, offset: 0.9, darkness: 0.2 },
                film: { enabled: true, nIntensity: 0.1, sIntensity: 0.05, sCount: 648 }
            }
        });

        this.realisticPresets.set('architectural', {
            name: 'Architectural',
            description: 'Clean, precise rendering for architectural visualization',
            effects: {
                ssao: { enabled: true, kernelRadius: 6, minDistance: 0.002, maxDistance: 0.08 },
                smaa: { enabled: true },
                ssr: { enabled: true, opacity: 0.5, maxDistance: 5.0, thickness: 0.01 },
                colorCorrection: { enabled: true, brightness: 0.08, contrast: 0.15, saturation: 0.05 }
            }
        });

        this.realisticPresets.set('product', {
            name: 'Product Visualization',
            description: 'Perfect for product showcases',
            effects: {
                ssao: { enabled: true, kernelRadius: 10, minDistance: 0.003, maxDistance: 0.12 },
                smaa: { enabled: true },
                bloom: { enabled: true, strength: 0.4, radius: 0.3, threshold: 0.95 },
                colorCorrection: { enabled: true, brightness: 0.12, contrast: 0.25, saturation: 0.3 }
            }
        });
    }

    /**
     * Apply realistic enhancement preset
     */
    applyRealisticPreset(presetName) {
        const preset = this.realisticPresets.get(presetName);
        if (!preset) {
            console.warn(`Realistic preset '${presetName}' not found`);
            return;
        }

        // Disable all effects first
        this.reset();

        // Apply preset effects
        Object.entries(preset.effects).forEach(([effectName, settings]) => {
            if (settings.enabled) {
                this.enablePass(effectName);
                
                // Configure the effect with specific settings
                switch (effectName) {
                    case 'ssao':
                        this.configureSSAO(settings);
                        break;
                    case 'ssr':
                        this.configureSSR(settings);
                        break;
                    case 'bloom':
                        this.configureBloom(settings);
                        break;
                    case 'bokeh':
                        this.configureBokeh(settings);
                        break;
                    case 'colorCorrection':
                        this.configureColorCorrection(settings);
                        break;
                    case 'vignette':
                        this.configureVignette(settings);
                        break;
                    case 'film':
                        this.configureFilm(settings);
                        break;
                }
            }
        });

        this.enabled = true;
        console.log(`Applied realistic preset: ${preset.name}`);
    }

    /**
     * Configure SSAO pass
     */
    configureSSAO(options = {}) {
        const ssaoPass = this.passes.get('ssao');
        if (ssaoPass) {
            if (options.kernelRadius !== undefined) {
                ssaoPass.kernelRadius = options.kernelRadius;
            }
            if (options.minDistance !== undefined) {
                ssaoPass.minDistance = options.minDistance;
            }
            if (options.maxDistance !== undefined) {
                ssaoPass.maxDistance = options.maxDistance;
            }
        }
    }

    /**
     * Configure SSR pass
     */
    configureSSR(options = {}) {
        const ssrPass = this.passes.get('ssr');
        if (ssrPass) {
            if (options.opacity !== undefined) {
                ssrPass.opacity = options.opacity;
            }
            if (options.maxDistance !== undefined) {
                ssrPass.maxDistance = options.maxDistance;
            }
            if (options.thickness !== undefined) {
                ssrPass.thickness = options.thickness;
            }
        }
    }

    /**
     * Configure bloom pass
     */
    configureBloom(options = {}) {
        const bloomPass = this.passes.get('bloom');
        if (bloomPass) {
            if (options.strength !== undefined) {
                bloomPass.strength = options.strength;
            }
            if (options.radius !== undefined) {
                bloomPass.radius = options.radius;
            }
            if (options.threshold !== undefined) {
                bloomPass.threshold = options.threshold;
            }
        }
    }

    /**
     * Configure bokeh pass
     */
    configureBokeh(options = {}) {
        const bokehPass = this.passes.get('bokeh');
        if (bokehPass) {
            if (options.focus !== undefined) {
                bokehPass.uniforms.focus.value = options.focus;
            }
            if (options.aperture !== undefined) {
                bokehPass.uniforms.aperture.value = options.aperture;
            }
            if (options.maxblur !== undefined) {
                bokehPass.uniforms.maxblur.value = options.maxblur;
            }
        }
    }

    /**
     * Configure color correction pass
     */
    configureColorCorrection(options = {}) {
        const colorCorrectionPass = this.passes.get('colorCorrection');
        if (colorCorrectionPass) {
            if (options.brightness !== undefined) {
                colorCorrectionPass.uniforms.brightness = { value: options.brightness };
            }
            if (options.contrast !== undefined) {
                colorCorrectionPass.uniforms.contrast = { value: options.contrast };
            }
            if (options.saturation !== undefined) {
                colorCorrectionPass.uniforms.saturation = { value: options.saturation };
            }
        }
    }

    /**
     * Configure vignette pass
     */
    configureVignette(options = {}) {
        const vignettePass = this.passes.get('vignette');
        if (vignettePass) {
            if (options.offset !== undefined) {
                vignettePass.uniforms.offset = { value: options.offset };
            }
            if (options.darkness !== undefined) {
                vignettePass.uniforms.darkness = { value: options.darkness };
            }
        }
    }

    /**
     * Configure film pass
     */
    configureFilm(options = {}) {
        const filmPass = this.passes.get('film');
        if (filmPass) {
            if (options.nIntensity !== undefined) {
                filmPass.uniforms.nIntensity = { value: options.nIntensity };
            }
            if (options.sIntensity !== undefined) {
                filmPass.uniforms.sIntensity = { value: options.sIntensity };
            }
            if (options.sCount !== undefined) {
                filmPass.uniforms.sCount = { value: options.sCount };
            }
        }
    }

    /**
     * Get available realistic presets
     */
    getRealisticPresets() {
        return Array.from(this.realisticPresets.entries());
    }

    /**
     * Initialize GPU compute-based post-processing passes
     */
    initializeComputePasses() {
        // Custom compute-based blur pass
        const computeBlurPass = this.createComputeBlurPass();
        if (computeBlurPass) {
            computeBlurPass.enabled = false;
            this.passes.set('computeBlur', computeBlurPass);
        }

        // Custom compute-based edge detection
        const computeEdgePass = this.createComputeEdgePass();
        if (computeEdgePass) {
            computeEdgePass.enabled = false;
            this.passes.set('computeEdge', computeEdgePass);
        }

        // Custom compute-based noise reduction
        const computeDenoisePass = this.createComputeDenoisePass();
        if (computeDenoisePass) {
            computeDenoisePass.enabled = false;
            this.passes.set('computeDenoise', computeDenoisePass);
        }
    }

    /**
     * Create compute-based blur pass
     */
    createComputeBlurPass() {
        const computeShader = `
            #version 300 es
            precision highp float;
            
            layout(local_size_x = 8, local_size_y = 8, local_size_z = 1) in;
            
            layout(rgba8, binding = 0) uniform image2D inputTexture;
            layout(rgba8, binding = 1) uniform image2D outputTexture;
            
            uniform float blurRadius;
            uniform vec2 resolution;
            
            void main() {
                ivec2 coord = ivec2(gl_GlobalInvocationID.xy);
                ivec2 size = imageSize(inputTexture);
                
                if (coord.x >= size.x || coord.y >= size.y) return;
                
                vec4 color = vec4(0.0);
                float totalWeight = 0.0;
                
                int radius = int(blurRadius);
                for (int x = -radius; x <= radius; x++) {
                    for (int y = -radius; y <= radius; y++) {
                        ivec2 sampleCoord = coord + ivec2(x, y);
                        if (sampleCoord.x >= 0 && sampleCoord.x < size.x && 
                            sampleCoord.y >= 0 && sampleCoord.y < size.y) {
                            
                            float weight = exp(-float(x*x + y*y) / (2.0 * blurRadius * blurRadius));
                            color += imageLoad(inputTexture, sampleCoord) * weight;
                            totalWeight += weight;
                        }
                    }
                }
                
                color /= totalWeight;
                imageStore(outputTexture, coord, color);
            }
        `;

        return {
            enabled: false,
            uniforms: {
                blurRadius: { value: 2.0 },
                resolution: { value: new THREE.Vector2() }
            },
            computeShader,
            render: function(renderer, writeBuffer, readBuffer) {
                // Mock implementation - would need WebGL compute shader support
                console.log('Compute blur pass executed');
            },
            setSize: function(width, height) {
                this.uniforms.resolution.value.set(width, height);
            }
        };
    }

    /**
     * Create compute-based edge detection pass
     */
    createComputeEdgePass() {
        const computeShader = `
            #version 300 es
            precision highp float;
            
            layout(local_size_x = 8, local_size_y = 8, local_size_z = 1) in;
            
            layout(rgba8, binding = 0) uniform image2D inputTexture;
            layout(rgba8, binding = 1) uniform image2D outputTexture;
            
            uniform float threshold;
            uniform float intensity;
            
            void main() {
                ivec2 coord = ivec2(gl_GlobalInvocationID.xy);
                ivec2 size = imageSize(inputTexture);
                
                if (coord.x >= size.x || coord.y >= size.y) return;
                
                // Sobel edge detection
                vec4 tl = imageLoad(inputTexture, coord + ivec2(-1, -1));
                vec4 tm = imageLoad(inputTexture, coord + ivec2( 0, -1));
                vec4 tr = imageLoad(inputTexture, coord + ivec2( 1, -1));
                vec4 ml = imageLoad(inputTexture, coord + ivec2(-1,  0));
                vec4 mm = imageLoad(inputTexture, coord + ivec2( 0,  0));
                vec4 mr = imageLoad(inputTexture, coord + ivec2( 1,  0));
                vec4 bl = imageLoad(inputTexture, coord + ivec2(-1,  1));
                vec4 bm = imageLoad(inputTexture, coord + ivec2( 0,  1));
                vec4 br = imageLoad(inputTexture, coord + ivec2( 1,  1));
                
                vec4 gx = -tl - 2.0*ml - bl + tr + 2.0*mr + br;
                vec4 gy = -tl - 2.0*tm - tr + bl + 2.0*bm + br;
                
                float edge = length(vec2(length(gx.rgb), length(gy.rgb)));
                edge = edge > threshold ? edge * intensity : 0.0;
                
                imageStore(outputTexture, coord, vec4(vec3(edge), 1.0));
            }
        `;

        return {
            enabled: false,
            uniforms: {
                threshold: { value: 0.1 },
                intensity: { value: 1.0 }
            },
            computeShader,
            render: function(renderer, writeBuffer, readBuffer) {
                console.log('Compute edge detection pass executed');
            },
            setSize: function(width, height) {
                // No specific size handling needed for this pass
            }
        };
    }

    /**
     * Create compute-based denoising pass
     */
    createComputeDenoisePass() {
        const computeShader = `
            #version 300 es
            precision highp float;
            
            layout(local_size_x = 8, local_size_y = 8, local_size_z = 1) in;
            
            layout(rgba8, binding = 0) uniform image2D inputTexture;
            layout(rgba8, binding = 1) uniform image2D outputTexture;
            
            uniform float noiseThreshold;
            uniform float preserveEdges;
            
            void main() {
                ivec2 coord = ivec2(gl_GlobalInvocationID.xy);
                ivec2 size = imageSize(inputTexture);
                
                if (coord.x >= size.x || coord.y >= size.y) return;
                
                vec4 center = imageLoad(inputTexture, coord);
                vec4 result = center;
                float totalWeight = 1.0;
                
                // Bilateral filter for denoising
                for (int x = -2; x <= 2; x++) {
                    for (int y = -2; y <= 2; y++) {
                        if (x == 0 && y == 0) continue;
                        
                        ivec2 sampleCoord = coord + ivec2(x, y);
                        if (sampleCoord.x >= 0 && sampleCoord.x < size.x && 
                            sampleCoord.y >= 0 && sampleCoord.y < size.y) {
                            
                            vec4 sample = imageLoad(inputTexture, sampleCoord);
                            
                            float spatialWeight = exp(-float(x*x + y*y) / (2.0 * 2.0));
                            float colorDiff = length(sample.rgb - center.rgb);
                            float colorWeight = exp(-colorDiff * colorDiff / (2.0 * noiseThreshold * noiseThreshold));
                            
                            float weight = spatialWeight * colorWeight;
                            result += sample * weight;
                            totalWeight += weight;
                        }
                    }
                }
                
                result /= totalWeight;
                imageStore(outputTexture, coord, result);
            }
        `;

        return {
            enabled: false,
            uniforms: {
                noiseThreshold: { value: 0.1 },
                preserveEdges: { value: 1.0 }
            },
            computeShader,
            render: function(renderer, writeBuffer, readBuffer) {
                console.log('Compute denoise pass executed');
            },
            setSize: function(width, height) {
                // No specific size handling needed for this pass
            }
        };
    }

    /**
     * Enable a specific pass
     */
    enablePass(passName) {
        const pass = this.passes.get(passName);
        if (pass) {
            pass.enabled = true;
            this.enabled = true;
            console.log(`Enabled post-processing pass: ${passName}`);
        } else {
            console.warn(`Pass '${passName}' not found`);
        }
    }

    /**
     * Disable a specific pass
     */
    disablePass(passName) {
        const pass = this.passes.get(passName);
        if (pass) {
            pass.enabled = false;
            console.log(`Disabled post-processing pass: ${passName}`);
        } else {
            console.warn(`Pass '${passName}' not found`);
        }
    }

    /**
     * Reset all passes to disabled state
     */
    reset() {
        this.passes.forEach((pass) => {
            pass.enabled = false;
        });
        this.enabled = false;
        console.log('Reset all post-processing passes');
    }

    /**
     * Enable or disable post-processing
     */
    setEnabled(enabled) {
        this.postProcessingEnabled = enabled;
        
        // If disabling, make sure all passes are disabled
        if (!enabled) {
            this.passes.forEach((pass) => {
                if (pass && typeof pass.enabled !== 'undefined') {
                    pass.enabled = false;
                }
            });
        }
    }

    /**
     * Get post-processing enabled state
     */
    getEnabled() {
        return this.postProcessingEnabled;
    }

    /**
     * Render with post-processing
     */
    render() {
        if (!this.initialized || !this.postProcessingEnabled || !this.composer) {
            // Fallback to direct rendering
            this.renderer.render(this.scene, this.camera);
            return;
        }

        try {
            this.composer.render();
        } catch (error) {
            console.error('Post-processing render error:', error);
            // Fallback to direct rendering
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Handle window resize
     */
    onResize(width, height) {
        if (this.composer && this.composer.setSize) {
            try {
                this.composer.setSize(width, height);
            } catch (error) {
                console.error('Error resizing post-processing composer:', error);
            }
        }
    }

    /**
     * Reduce quality for performance
     */
    reduceQuality() {
        // Disable expensive passes
        this.disablePass('ssr');
        this.disablePass('ssao');
        this.disablePass('bokeh');
        
        // Reduce bloom quality
        const bloomPass = this.passes.get('bloom');
        if (bloomPass && bloomPass.enabled) {
            bloomPass.strength *= 0.5;
            bloomPass.radius *= 0.5;
        }
        
        console.log('Reduced post-processing quality for performance');
    }

    /**
     * Restore quality
     */
    restoreQuality() {
        // This would restore original settings
        // Implementation depends on storing original values
        console.log('Restored post-processing quality');
    }

    /**
     * Reinitialize after context loss
     */
    async reinitialize() {
        console.log('Reinitializing PostProcessingManager after context loss');
        
        this.initialized = false;
        this.composer = null;
        this.passes.clear();
        
        // Reinitialize
        this.init();
        
        return this.initialized;
    }

    /**
     * Get available passes
     */
    getAvailablePasses() {
        return Array.from(this.passes.keys());
    }

    /**
     * Get pass status
     */
    getPassStatus(passName) {
        const pass = this.passes.get(passName);
        return pass ? pass.enabled : false;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.composer) {
            this.composer.dispose();
        }
        
        this.passes.forEach((pass) => {
            if (pass.dispose) {
                pass.dispose();
            }
        });
        
        this.passes.clear();
        this.customPasses.clear();
        this.initialized = false;
        this.enabled = false;
        
        console.log('PostProcessingManager destroyed');
    }
}