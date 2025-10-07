import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { TDSLoader } from 'three/examples/jsm/loaders/TDSLoader.js';
import { USDZLoader } from 'three/examples/jsm/loaders/USDZLoader.js';
import { AMFLoader } from 'three/examples/jsm/loaders/AMFLoader.js';
// Note: 3MFLoader is named differently in Three.js
// import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import { DDSLoader } from 'three/examples/jsm/loaders/DDSLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

/**
 * LoaderRegistry - Manages all file format loaders and their configurations
 */
export class LoaderRegistry {
    constructor(loadingManager) {
        this.loadingManager = loadingManager || new THREE.LoadingManager();
        this.loaders = new Map();
        this.formatSupport = new Map();
        
        this.setupLoaders();
        this.setupFormatSupport();
    }

    /**
     * Setup all supported loaders
     */
    setupLoaders() {
        // Model loaders
        this.loaders.set('gltf', new GLTFLoader(this.loadingManager));
        this.loaders.set('glb', new GLTFLoader(this.loadingManager));
        this.loaders.set('fbx', new FBXLoader(this.loadingManager));
        this.loaders.set('obj', new OBJLoader(this.loadingManager));
        this.loaders.set('mtl', new MTLLoader(this.loadingManager));
        this.loaders.set('dae', new ColladaLoader(this.loadingManager));
        this.loaders.set('stl', new STLLoader(this.loadingManager));
        this.loaders.set('ply', new PLYLoader(this.loadingManager));
        
        // Additional format loaders
        this.loaders.set('3ds', new TDSLoader(this.loadingManager));
        this.loaders.set('usdz', new USDZLoader(this.loadingManager));
        this.loaders.set('usd', new USDZLoader(this.loadingManager)); // USD files can use USDZ loader
        this.loaders.set('amf', new AMFLoader(this.loadingManager));
        
        // Note: Some loaders may not be available in all Three.js versions
        // X3D, IFC, STEP, and 3MF loaders are not available in the current Three.js version
        // These would need to be implemented separately or use external libraries
        
        // Placeholder for future loader implementations
        this.setupFutureLoaders();
        
        // Texture loaders
        this.loaders.set('exr', new EXRLoader(this.loadingManager));
        this.loaders.set('hdr', new EXRLoader(this.loadingManager)); // EXRLoader handles HDR
        this.loaders.set('dds', new DDSLoader(this.loadingManager));
        
        // KTX2 loader setup
        const ktx2Loader = new KTX2Loader(this.loadingManager);
        // KTX2 loader needs to be configured with decoder path
        ktx2Loader.setTranscoderPath('https://unpkg.com/three@0.164.1/examples/jsm/libs/basis/');
        this.loaders.set('ktx2', ktx2Loader);
        this.loaders.set('ktx', ktx2Loader);
        
        // Standard texture loaders
        const textureLoader = new THREE.TextureLoader(this.loadingManager);
        this.loaders.set('jpg', textureLoader);
        this.loaders.set('jpeg', textureLoader);
        this.loaders.set('png', textureLoader);
        this.loaders.set('webp', textureLoader);
        this.loaders.set('avif', textureLoader);
        this.loaders.set('tga', textureLoader);
        this.loaders.set('bmp', textureLoader);
    }

    /**
     * Setup format support information
     */
    setupFormatSupport() {
        // Model formats
        this.formatSupport.set('gltf', { 
            type: 'model', 
            hasAnimations: true, 
            hasMaterials: true, 
            hasTextures: true,
            description: 'GL Transmission Format - Industry standard for 3D assets'
        });
        this.formatSupport.set('glb', { 
            type: 'model', 
            hasAnimations: true, 
            hasMaterials: true, 
            hasTextures: true,
            description: 'Binary GL Transmission Format'
        });
        this.formatSupport.set('fbx', { 
            type: 'model', 
            hasAnimations: true, 
            hasMaterials: true, 
            hasTextures: true,
            description: 'Autodesk FBX format'
        });
        this.formatSupport.set('obj', { 
            type: 'model', 
            hasAnimations: false, 
            hasMaterials: true, 
            hasTextures: true,
            description: 'Wavefront OBJ format'
        });
        this.formatSupport.set('dae', { 
            type: 'model', 
            hasAnimations: true, 
            hasMaterials: true, 
            hasTextures: true,
            description: 'COLLADA Digital Asset Exchange'
        });
        this.formatSupport.set('stl', { 
            type: 'model', 
            hasAnimations: false, 
            hasMaterials: false, 
            hasTextures: false,
            description: 'Stereolithography format for 3D printing'
        });
        this.formatSupport.set('ply', { 
            type: 'model', 
            hasAnimations: false, 
            hasMaterials: true, 
            hasTextures: false,
            description: 'Polygon File Format'
        });
        this.formatSupport.set('3ds', { 
            type: 'model', 
            hasAnimations: false, 
            hasMaterials: true, 
            hasTextures: true,
            description: '3D Studio Max format'
        });
        this.formatSupport.set('x3d', { 
            type: 'model', 
            hasAnimations: true, 
            hasMaterials: true, 
            hasTextures: true,
            description: 'Extensible 3D format (planned)',
            available: false
        });
        this.formatSupport.set('usdz', { 
            type: 'model', 
            hasAnimations: true, 
            hasMaterials: true, 
            hasTextures: true,
            description: 'Universal Scene Description (Apple AR format)'
        });
        this.formatSupport.set('usd', { 
            type: 'model', 
            hasAnimations: true, 
            hasMaterials: true, 
            hasTextures: true,
            description: 'Universal Scene Description'
        });
        this.formatSupport.set('amf', { 
            type: 'model', 
            hasAnimations: false, 
            hasMaterials: true, 
            hasTextures: false,
            description: 'Additive Manufacturing Format'
        });
        this.formatSupport.set('3mf', { 
            type: 'model', 
            hasAnimations: false, 
            hasMaterials: true, 
            hasTextures: true,
            description: '3D Manufacturing Format (planned)',
            available: false
        });
        this.formatSupport.set('ifc', { 
            type: 'model', 
            hasAnimations: false, 
            hasMaterials: true, 
            hasTextures: false,
            description: 'Industry Foundation Classes (BIM format, planned)',
            available: false
        });
        this.formatSupport.set('step', { 
            type: 'model', 
            hasAnimations: false, 
            hasMaterials: false, 
            hasTextures: false,
            description: 'STEP CAD format (planned)',
            available: false
        });

        // Texture formats
        this.formatSupport.set('jpg', { type: 'texture', compressed: false, hdr: false });
        this.formatSupport.set('jpeg', { type: 'texture', compressed: false, hdr: false });
        this.formatSupport.set('png', { type: 'texture', compressed: false, hdr: false });
        this.formatSupport.set('webp', { type: 'texture', compressed: true, hdr: false });
        this.formatSupport.set('avif', { type: 'texture', compressed: true, hdr: false });
        this.formatSupport.set('tga', { type: 'texture', compressed: false, hdr: false });
        this.formatSupport.set('bmp', { type: 'texture', compressed: false, hdr: false });
        this.formatSupport.set('exr', { type: 'texture', compressed: false, hdr: true });
        this.formatSupport.set('hdr', { type: 'texture', compressed: false, hdr: true });
        this.formatSupport.set('dds', { type: 'texture', compressed: true, hdr: false });
        this.formatSupport.set('ktx2', { type: 'texture', compressed: true, hdr: false });
        this.formatSupport.set('ktx', { type: 'texture', compressed: true, hdr: false });
    }

    /**
     * Get loader for file extension
     */
    getLoader(extension) {
        const normalizedExt = extension.toLowerCase().replace('.', '');
        return this.loaders.get(normalizedExt);
    }

    /**
     * Get loader for URL
     */
    getLoaderForUrl(url) {
        const extension = this.extractExtension(url);
        return this.getLoader(extension);
    }

    /**
     * Get loader for file
     */
    getLoaderForFile(file) {
        const extension = this.extractExtension(file.name);
        return this.getLoader(extension);
    }

    /**
     * Check if format is supported
     */
    isFormatSupported(extension) {
        const normalizedExt = extension.toLowerCase().replace('.', '');
        return this.loaders.has(normalizedExt);
    }

    /**
     * Get format information
     */
    getFormatInfo(extension) {
        const normalizedExt = extension.toLowerCase().replace('.', '');
        return this.formatSupport.get(normalizedExt);
    }

    /**
     * Get all supported formats
     */
    getSupportedFormats() {
        return Array.from(this.loaders.keys());
    }

    /**
     * Get supported model formats
     */
    getSupportedModelFormats() {
        return Array.from(this.formatSupport.entries())
            .filter(([, info]) => info.type === 'model')
            .map(([ext]) => ext);
    }

    /**
     * Get supported texture formats
     */
    getSupportedTextureFormats() {
        return Array.from(this.formatSupport.entries())
            .filter(([, info]) => info.type === 'texture')
            .map(([ext]) => ext);
    }

    /**
     * Get supported HDR formats
     */
    getSupportedHDRFormats() {
        return Array.from(this.formatSupport.entries())
            .filter(([, info]) => info.type === 'texture' && info.hdr)
            .map(([ext]) => ext);
    }

    /**
     * Get supported compressed texture formats
     */
    getSupportedCompressedFormats() {
        return Array.from(this.formatSupport.entries())
            .filter(([, info]) => info.type === 'texture' && info.compressed)
            .map(([ext]) => ext);
    }

    /**
     * Extract file extension from filename or URL
     */
    extractExtension(filename) {
        if (!filename) return '';
        
        // Handle URLs with query parameters
        const cleanFilename = filename.split('?')[0];
        const parts = cleanFilename.split('.');
        
        if (parts.length < 2) return '';
        
        return parts.pop().toLowerCase();
    }

    /**
     * Register a custom loader
     */
    registerLoader(extension, loader, formatInfo = {}) {
        const normalizedExt = extension.toLowerCase().replace('.', '');
        this.loaders.set(normalizedExt, loader);
        
        if (Object.keys(formatInfo).length > 0) {
            this.formatSupport.set(normalizedExt, formatInfo);
        }
    }

    /**
     * Unregister a loader
     */
    unregisterLoader(extension) {
        const normalizedExt = extension.toLowerCase().replace('.', '');
        this.loaders.delete(normalizedExt);
        this.formatSupport.delete(normalizedExt);
    }

    /**
     * Setup future loaders (placeholder for formats not yet available)
     */
    setupFutureLoaders() {
        // These loaders are not available in the current Three.js version
        // but are planned for future implementation
        
        // X3D loader would go here when available
        // IFC loader would go here when available  
        // STEP loader would go here when available
        // 3MF loader would go here when available
        
        // Silent - future loaders planned
    }

    /**
     * Get loader configuration for debugging
     */
    getLoaderInfo() {
        const info = {};
        for (const [ext, loader] of this.loaders.entries()) {
            info[ext] = {
                loaderType: loader.constructor.name,
                formatInfo: this.formatSupport.get(ext) || {}
            };
        }
        return info;
    }

    /**
     * Get supported formats
     */
    getSupportedFormats() {
        return Array.from(this.loaders.keys());
    }

    /**
     * Get format information
     */
    getFormatInfo(extension) {
        return this.formatSupport.get(extension) || null;
    }
}