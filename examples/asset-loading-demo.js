/**
 * Asset Loading Enhancement Demo
 * 
 * This demo showcases the enhanced asset loading system with:
 * - Extended format support (3DS, USD, AMF, etc.)
 * - Automatic texture detection and loading
 * - Compressed texture format support (DDS, KTX2)
 * - HDR environment loading
 * - Online library integration
 * - Efficient texture management
 */

import { AssetManager } from '../src/assets/AssetManager.js';
import { CoreEngine } from '../src/core/CoreEngine.js';

// Initialize the core engine and asset manager
const core = new CoreEngine();
const assetManager = new AssetManager(core);

// Demo: Show supported formats
console.log('=== Enhanced Asset Loading System Demo ===\n');

console.log('Supported Model Formats:');
console.log(assetManager.getSupportedModelFormats().join(', '));

console.log('\nSupported Texture Formats:');
console.log(assetManager.getSupportedTextureFormats().join(', '));

console.log('\nSupported HDR Formats:');
console.log(assetManager.getSupportedHDRFormats().join(', '));

// Demo: Format information
console.log('\n=== Format Information ===');
const gltfInfo = assetManager.getFormatInfo('gltf');
console.log('GLTF Format Info:', gltfInfo);

const ddsInfo = assetManager.getFormatInfo('dds');
console.log('DDS Format Info:', ddsInfo);

// Demo: Online libraries
console.log('\n=== Available Online Libraries ===');
const libraries = assetManager.getAvailableLibraries();
libraries.forEach(lib => {
    console.log(`${lib.name}: ${lib.description}`);
    console.log(`  - Requires Auth: ${lib.requiresAuth}`);
    console.log(`  - Formats: ${lib.supportedFormats.join(', ')}`);
});

// Demo: Texture pattern detection
console.log('\n=== Texture Pattern Detection ===');
const textureManager = assetManager.textureManager;

const testFilenames = [
    'model_diffuse.jpg',
    'character_normal.png', 
    'material_roughness.jpg',
    'object_metallic.png',
    'scene_ao.jpg',
    'light_emission.png'
];

testFilenames.forEach(filename => {
    const type = textureManager.detectTextureType(filename, 'model');
    console.log(`${filename} -> ${type}`);
});

// Demo: GPU compression support
console.log('\n=== GPU Compression Support ===');
const compressionSupport = textureManager.compressionSupport;
Object.entries(compressionSupport).forEach(([format, supported]) => {
    console.log(`${format.toUpperCase()}: ${supported ? 'Supported' : 'Not Supported'}`);
});

// Demo: Async loading example (commented out to avoid actual network requests)
/*
async function demoAsyncLoading() {
    try {
        console.log('\n=== Async Loading Demo ===');
        
        // Search for assets in online libraries
        const searchResults = await assetManager.searchOnlineAssets('duck', 'gltf-samples');
        console.log('Search Results:', searchResults);
        
        // Load a sample model
        if (searchResults.length > 0) {
            const model = await assetManager.loadAssetFromLibrary(searchResults[0]);
            console.log('Loaded Model:', model);
        }
        
    } catch (error) {
        console.error('Loading demo failed:', error);
    }
}

// Uncomment to run async demo
// demoAsyncLoading();
*/

// Demo: Cache statistics
console.log('\n=== Cache Statistics ===');
const textureStats = textureManager.getCacheStats();
console.log('Texture Cache:', textureStats);

const libraryStats = assetManager.onlineLibraryManager.getCacheStats();
console.log('Library Cache:', libraryStats);

console.log('\n=== Demo Complete ===');
console.log('The enhanced asset loading system is ready for use!');
console.log('Key improvements:');
console.log('- Support for 15+ model formats including 3DS, USD, AMF');
console.log('- Automatic texture detection and PBR material creation');
console.log('- Compressed texture support (DDS, KTX2) with GPU detection');
console.log('- HDR environment loading (EXR, HDR)');
console.log('- Online library integration (Sketchfab, Poly Haven, etc.)');
console.log('- Efficient caching and memory management');
console.log('- Comprehensive error handling and format validation');

export { assetManager };