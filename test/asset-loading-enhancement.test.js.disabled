import { LoaderRegistry } from '../src/assets/LoaderRegistry.js';
import { TextureManager } from '../src/assets/TextureManager.js';
import { OnlineLibraryManager } from '../src/assets/OnlineLibraryManager.js';
import { AssetManager } from '../src/assets/AssetManager.js';
import * as THREE from 'three';

describe('Enhanced Asset Loading System', () => {
    let loadingManager;
    let loaderRegistry;
    let textureManager;
    let onlineLibraryManager;
    let assetManager;
    let mockCore;

    beforeEach(() => {
        loadingManager = new THREE.LoadingManager();
        loaderRegistry = new LoaderRegistry(loadingManager);
        textureManager = new TextureManager(loadingManager, loaderRegistry);
        
        // Mock core for AssetManager
        mockCore = {
            emit: jasmine.createSpy('emit'),
            setState: jasmine.createSpy('setState')
        };
        
        assetManager = new AssetManager(mockCore);
        onlineLibraryManager = new OnlineLibraryManager(assetManager);
    });

    afterEach(() => {
        if (textureManager) {
            textureManager.destroy();
        }
        if (onlineLibraryManager) {
            onlineLibraryManager.clearCache();
        }
    });

    describe('LoaderRegistry', () => {
        it('should support all available model formats', () => {
            const availableFormats = [
                'gltf', 'glb', 'fbx', 'obj', 'dae', 'stl', 'ply',
                '3ds', 'usdz', 'usd', 'amf'
            ];

            availableFormats.forEach(format => {
                expect(loaderRegistry.isFormatSupported(format)).toBe(true);
                expect(loaderRegistry.getLoader(format)).toBeDefined();
            });
        });

        it('should recognize planned formats but not have loaders for them', () => {
            const plannedFormats = ['x3d', '3mf', 'ifc', 'step'];

            plannedFormats.forEach(format => {
                const formatInfo = loaderRegistry.getFormatInfo(format);
                expect(formatInfo).toBeDefined();
                expect(formatInfo.available).toBe(false);
                expect(loaderRegistry.getLoader(format)).toBeUndefined();
            });
        });

        it('should support compressed texture formats', () => {
            const compressedFormats = ['dds', 'ktx2', 'ktx'];
            
            compressedFormats.forEach(format => {
                expect(loaderRegistry.isFormatSupported(format)).toBe(true);
                expect(loaderRegistry.getLoader(format)).toBeDefined();
            });
        });

        it('should support HDR formats', () => {
            const hdrFormats = ['hdr', 'exr'];
            
            hdrFormats.forEach(format => {
                expect(loaderRegistry.isFormatSupported(format)).toBe(true);
                expect(loaderRegistry.getLoader(format)).toBeDefined();
            });
        });

        it('should provide format information', () => {
            const gltfInfo = loaderRegistry.getFormatInfo('gltf');
            expect(gltfInfo).toBeDefined();
            expect(gltfInfo.type).toBe('model');
            expect(gltfInfo.hasAnimations).toBe(true);
            expect(gltfInfo.hasMaterials).toBe(true);
            expect(gltfInfo.hasTextures).toBe(true);
        });

        it('should extract file extensions correctly', () => {
            expect(loaderRegistry.extractExtension('model.gltf')).toBe('gltf');
            expect(loaderRegistry.extractExtension('texture.jpg')).toBe('jpg');
            expect(loaderRegistry.extractExtension('file.with.dots.fbx')).toBe('fbx');
            expect(loaderRegistry.extractExtension('https://example.com/model.glb?param=1')).toBe('glb');
        });

        it('should categorize formats correctly', () => {
            const modelFormats = loaderRegistry.getSupportedModelFormats();
            const textureFormats = loaderRegistry.getSupportedTextureFormats();
            const hdrFormats = loaderRegistry.getSupportedHDRFormats();
            const compressedFormats = loaderRegistry.getSupportedCompressedFormats();

            expect(modelFormats).toContain('gltf');
            expect(modelFormats).toContain('fbx');
            expect(modelFormats).toContain('3ds');
            expect(modelFormats).toContain('usdz');
            
            expect(textureFormats).toContain('jpg');
            expect(textureFormats).toContain('png');
            expect(textureFormats).toContain('dds');
            
            expect(hdrFormats).toContain('hdr');
            expect(hdrFormats).toContain('exr');
            
            expect(compressedFormats).toContain('dds');
            expect(compressedFormats).toContain('ktx2');
        });
    });

    describe('TextureManager', () => {
        it('should detect texture types from filenames', () => {
            const testCases = [
                { filename: 'model_diffuse.jpg', expected: 'diffuse' },
                { filename: 'model_normal.png', expected: 'normal' },
                { filename: 'model_roughness.jpg', expected: 'roughness' },
                { filename: 'model_metallic.png', expected: 'metallic' },
                { filename: 'model_ao.jpg', expected: 'ao' },
                { filename: 'model_emission.png', expected: 'emission' },
                { filename: 'texture_basecolor.jpg', expected: 'diffuse' },
                { filename: 'material_bump.png', expected: 'normal' }
            ];

            testCases.forEach(({ filename, expected }) => {
                const detected = textureManager.detectTextureType(filename, 'model');
                expect(detected).toBe(expected);
            });
        });

        it('should setup texture patterns correctly', () => {
            const patterns = textureManager.texturePatterns;
            
            expect(patterns.diffuse).toContain('_diffuse');
            expect(patterns.diffuse).toContain('_albedo');
            expect(patterns.diffuse).toContain('_basecolor');
            
            expect(patterns.normal).toContain('_normal');
            expect(patterns.normal).toContain('_bump');
            
            expect(patterns.roughness).toContain('_roughness');
            expect(patterns.metallic).toContain('_metallic');
        });

        it('should detect GPU compression support', () => {
            const support = textureManager.compressionSupport;
            
            expect(typeof support.s3tc).toBe('boolean');
            expect(typeof support.etc1).toBe('boolean');
            expect(typeof support.etc2).toBe('boolean');
            expect(typeof support.astc).toBe('boolean');
            expect(typeof support.bptc).toBe('boolean');
        });

        it('should generate cache keys correctly', () => {
            const key1 = textureManager.generateCacheKey('texture.jpg', {});
            const key2 = textureManager.generateCacheKey('texture.jpg', { repeat: { x: 2, y: 2 } });
            
            expect(key1).toBeDefined();
            expect(key2).toBeDefined();
            expect(key1).not.toBe(key2);
        });

        it('should create PBR materials from texture maps', () => {
            const textureMap = new Map();
            
            // Create mock textures
            const diffuseTexture = new THREE.Texture();
            const normalTexture = new THREE.Texture();
            const roughnessTexture = new THREE.Texture();
            
            textureMap.set('diffuse', diffuseTexture);
            textureMap.set('normal', normalTexture);
            textureMap.set('roughness', roughnessTexture);
            
            const material = textureManager.createPBRMaterial(textureMap);
            
            expect(material).toBeInstanceOf(THREE.MeshStandardMaterial);
            expect(material.map).toBe(diffuseTexture);
            expect(material.normalMap).toBe(normalTexture);
            expect(material.roughnessMap).toBe(roughnessTexture);
        });
    });

    describe('OnlineLibraryManager', () => {
        it('should setup supported libraries', () => {
            const libraries = onlineLibraryManager.getAvailableLibraries();
            
            expect(libraries.length).toBeGreaterThan(0);
            
            const libraryIds = libraries.map(lib => lib.id);
            expect(libraryIds).toContain('sketchfab');
            expect(libraryIds).toContain('polyhaven');
            expect(libraryIds).toContain('threejs-examples');
            expect(libraryIds).toContain('gltf-samples');
        });

        it('should provide library information', () => {
            const sketchfabInfo = onlineLibraryManager.getLibraryInfo('sketchfab');
            
            expect(sketchfabInfo).toBeDefined();
            expect(sketchfabInfo.name).toBe('Sketchfab');
            expect(sketchfabInfo.requiresAuth).toBe(true);
            expect(sketchfabInfo.supportedFormats).toContain('gltf');
        });

        it('should get Three.js examples', async () => {
            const examples = await onlineLibraryManager.getThreeJSExamples();
            
            expect(examples.length).toBeGreaterThan(0);
            expect(examples[0].id).toBeDefined();
            expect(examples[0].name).toBeDefined();
            expect(examples[0].downloadUrl).toBeDefined();
            expect(examples[0].format).toBeDefined();
        });

        it('should get glTF samples', async () => {
            const samples = await onlineLibraryManager.getGLTFSamples();
            
            expect(samples.length).toBeGreaterThan(0);
            expect(samples[0].id).toBeDefined();
            expect(samples[0].name).toBeDefined();
            expect(samples[0].downloadUrl).toBeDefined();
            expect(samples[0].format).toBe('glb');
        });

        it('should detect Poly Haven formats', () => {
            const hdriAsset = { type: 'hdri' };
            const textureAsset = { type: 'texture' };
            const modelAsset = { type: 'model' };
            
            expect(onlineLibraryManager.detectPolyHavenFormat(hdriAsset)).toBe('hdr');
            expect(onlineLibraryManager.detectPolyHavenFormat(textureAsset)).toBe('jpg');
            expect(onlineLibraryManager.detectPolyHavenFormat(modelAsset)).toBe('gltf');
        });
    });

    describe('AssetManager Integration', () => {
        it('should initialize with enhanced components', () => {
            expect(assetManager.loaderRegistry).toBeInstanceOf(LoaderRegistry);
            expect(assetManager.textureManager).toBeInstanceOf(TextureManager);
            expect(assetManager.onlineLibraryManager).toBeInstanceOf(OnlineLibraryManager);
        });

        it('should provide enhanced format support methods', () => {
            expect(typeof assetManager.getSupportedModelFormats).toBe('function');
            expect(typeof assetManager.getSupportedTextureFormats).toBe('function');
            expect(typeof assetManager.getSupportedHDRFormats).toBe('function');
            expect(typeof assetManager.getFormatInfo).toBe('function');
        });

        it('should provide online library methods', () => {
            expect(typeof assetManager.searchOnlineAssets).toBe('function');
            expect(typeof assetManager.loadAssetFromLibrary).toBe('function');
            expect(typeof assetManager.getAvailableLibraries).toBe('function');
        });

        it('should provide texture loading methods', () => {
            expect(typeof assetManager.loadTexture).toBe('function');
            expect(typeof assetManager.loadModelFromFolder).toBe('function');
        });

        it('should get format information correctly', () => {
            const gltfInfo = assetManager.getFormatInfo('gltf');
            expect(gltfInfo).toBeDefined();
            expect(gltfInfo.type).toBe('model');
        });

        it('should list supported formats correctly', () => {
            const allFormats = assetManager.getSupportedFormats();
            const modelFormats = assetManager.getSupportedModelFormats();
            const textureFormats = assetManager.getSupportedTextureFormats();
            const hdrFormats = assetManager.getSupportedHDRFormats();

            expect(allFormats.length).toBeGreaterThan(0);
            expect(modelFormats.length).toBeGreaterThan(0);
            expect(textureFormats.length).toBeGreaterThan(0);
            expect(hdrFormats.length).toBeGreaterThan(0);

            // Check that categories don't overlap incorrectly
            expect(modelFormats).toContain('gltf');
            expect(textureFormats).toContain('jpg');
            expect(hdrFormats).toContain('hdr');
        });
    });

    describe('Error Handling', () => {
        it('should handle unsupported formats gracefully', () => {
            expect(loaderRegistry.isFormatSupported('unsupported')).toBe(false);
            expect(loaderRegistry.getLoader('unsupported')).toBeUndefined();
        });

        it('should handle invalid filenames', () => {
            expect(loaderRegistry.extractExtension('')).toBe('');
            expect(loaderRegistry.extractExtension('noextension')).toBe('');
            expect(textureManager.detectTextureType('', '')).toBe('diffuse');
        });

        it('should handle missing library gracefully', () => {
            expect(onlineLibraryManager.getLibraryInfo('nonexistent')).toBeUndefined();
        });
    });

    describe('Performance and Caching', () => {
        it('should provide cache statistics', () => {
            const textureStats = textureManager.getCacheStats();
            const libraryStats = onlineLibraryManager.getCacheStats();

            expect(textureStats.textureCount).toBeDefined();
            expect(textureStats.materialCount).toBeDefined();
            expect(textureStats.compressionSupport).toBeDefined();

            expect(libraryStats.cachedAssets).toBeDefined();
            expect(libraryStats.libraries).toBeDefined();
        });

        it('should clear caches properly', () => {
            textureManager.clearCache();
            onlineLibraryManager.clearCache();

            const textureStats = textureManager.getCacheStats();
            const libraryStats = onlineLibraryManager.getCacheStats();

            expect(textureStats.textureCount).toBe(0);
            expect(textureStats.materialCount).toBe(0);
            expect(libraryStats.cachedAssets).toBe(0);
        });
    });
});