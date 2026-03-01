import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import { PLYExporter } from 'three/examples/jsm/exporters/PLYExporter.js';
import * as THREE from 'three';

/**
 * ExportSystem - Handles multi-format export with optimization and platform-specific presets
 */
export class ExportSystem {
    constructor(core) {
        this.core = core;
        this.exporters = new Map();
        this.presets = new Map();
        this.optimizers = new Map();
        this.validators = new Map();
        
        this.initialized = false;
        this.batchQueue = [];
        this.isProcessingBatch = false;
        
        this.setupExporters();
        this.setupPresets();
        this.setupOptimizers();
        this.setupValidators();
    }

    /**
     * Initialize the export system
     */
    init() {
        if (this.initialized) {
            console.warn('ExportSystem already initialized');
            return;
        }

        this.initialized = true;
        this.core.emit('export:initialized');
    }

    /**
     * Setup mesh optimizers
     */
    setupOptimizers() {
        // Mesh simplification optimizer
        this.optimizers.set('simplify', (geometry, options = {}) => {
            const { targetRatio = 0.5, preserveUVs = true } = options;
            
            // Simple vertex reduction (would use more sophisticated algorithms in production)
            if (geometry.index) {
                const indexCount = geometry.index.count;
                const targetCount = Math.floor(indexCount * targetRatio);
                
                // This is a simplified approach - real implementation would use edge collapse
                const newIndices = new Uint32Array(targetCount);
                for (let i = 0; i < targetCount; i++) {
                    newIndices[i] = geometry.index.array[i];
                }
                
                geometry.setIndex(new THREE.BufferAttribute(newIndices, 1));
            }
            
            return geometry;
        });

        // Vertex merging optimizer
        this.optimizers.set('mergeVertices', (geometry, options = {}) => {
            const { tolerance = 1e-4 } = options;
            
            // Use Three.js built-in method
            const mergedGeometry = geometry.clone();
            mergedGeometry.mergeVertices(tolerance);
            
            return mergedGeometry;
        });

        // Texture compression optimizer
        this.optimizers.set('compressTextures', (model, options = {}) => {
            const { maxSize = 1024, format = 'webp', quality = 0.8 } = options;
            
            model.traverse((child) => {
                if (child.material && child.material.map) {
                    const texture = child.material.map;
                    if (texture.image && (texture.image.width > maxSize || texture.image.height > maxSize)) {
                        // Create canvas for resizing
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        const scale = Math.min(maxSize / texture.image.width, maxSize / texture.image.height);
                        canvas.width = texture.image.width * scale;
                        canvas.height = texture.image.height * scale;
                        
                        ctx.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
                        
                        // Update texture
                        texture.image = canvas;
                        texture.needsUpdate = true;
                    }
                }
            });
            
            return model;
        });
    }

    /**
     * Setup mesh validators
     */
    setupValidators() {
        // 3D printing mesh validator
        this.validators.set('3d-printing', (geometry) => {
            const issues = [];
            
            // Check for manifold mesh
            if (!this.isManifold(geometry)) {
                issues.push({
                    type: 'non-manifold',
                    severity: 'error',
                    message: 'Mesh is not manifold - may cause printing issues'
                });
            }
            
            // Check for minimum thickness
            const thickness = this.calculateMinThickness(geometry);
            if (thickness < 0.8) { // 0.8mm minimum for most printers
                issues.push({
                    type: 'thin-walls',
                    severity: 'warning',
                    message: `Minimum wall thickness (${thickness.toFixed(2)}mm) may be too thin for printing`
                });
            }
            
            // Check for overhangs
            const overhangs = this.detectOverhangs(geometry);
            if (overhangs.length > 0) {
                issues.push({
                    type: 'overhangs',
                    severity: 'warning',
                    message: `Found ${overhangs.length} areas that may need support structures`
                });
            }
            
            return {
                valid: issues.filter(i => i.severity === 'error').length === 0,
                issues,
                recommendations: this.generate3DPrintingRecommendations(issues)
            };
        });

        // General mesh validator
        this.validators.set('general', (geometry) => {
            const issues = [];
            
            // Check for degenerate triangles
            const degenerateCount = this.countDegenerateTriangles(geometry);
            if (degenerateCount > 0) {
                issues.push({
                    type: 'degenerate-triangles',
                    severity: 'warning',
                    message: `Found ${degenerateCount} degenerate triangles`
                });
            }
            
            // Check for duplicate vertices
            const duplicateCount = this.countDuplicateVertices(geometry);
            if (duplicateCount > 0) {
                issues.push({
                    type: 'duplicate-vertices',
                    severity: 'info',
                    message: `Found ${duplicateCount} duplicate vertices that could be merged`
                });
            }
            
            return {
                valid: issues.filter(i => i.severity === 'error').length === 0,
                issues
            };
        });
    }

    /**
     * Setup available exporters
     */
    setupExporters() {
        // Register GLTF/GLB exporter
        this.exporters.set('gltf', new GLTFExporter());
        this.exporters.set('glb', new GLTFExporter());
        
        // Register OBJ exporter
        this.exporters.set('obj', new OBJExporter());
        
        // Register STL exporter
        this.exporters.set('stl', new STLExporter());
        
        // Register PLY exporter
        this.exporters.set('ply', new PLYExporter());
        
        // DAE (Collada) exporter not available in this Three.js version
        
        // Register custom exporters for additional formats
        this.setupCustomExporters();
    }

    /**
     * Setup custom exporters for formats not directly supported by Three.js
     */
    setupCustomExporters() {
        // FBX exporter (simplified - would need FBX SDK integration for full support)
        this.exporters.set('fbx', {
            parse: (scene, onDone, onError, options) => {
                // Convert to GLTF first, then note that FBX conversion would need external service
                const gltfExporter = new GLTFExporter();
                gltfExporter.parse(scene, (gltfResult) => {
                    onDone({
                        data: gltfResult,
                        format: 'fbx',
                        note: 'FBX export requires external conversion service'
                    });
                }, onError, options);
            }
        });
        
        // USD exporter (simplified - would need USD SDK)
        this.exporters.set('usd', {
            parse: (scene, onDone, onError, options) => {
                const gltfExporter = new GLTFExporter();
                gltfExporter.parse(scene, (gltfResult) => {
                    onDone({
                        data: gltfResult,
                        format: 'usd',
                        note: 'USD export requires external conversion service'
                    });
                }, onError, options);
            }
        });
        
        // X3D exporter (basic implementation)
        this.exporters.set('x3d', {
            parse: (scene, onDone, onError, options) => {
                try {
                    const x3dContent = this.generateX3D(scene, options);
                    onDone(x3dContent);
                } catch (error) {
                    onError(error);
                }
            }
        });
    }

    /**
     * Setup export presets
     */
    setupPresets() {
        // Unity preset
        this.presets.set('unity', {
            format: 'glb',
            name: 'Unity Engine',
            description: 'Optimized for Unity 3D engine with embedded textures',
            options: {
                binary: true,
                embedImages: true,
                maxTextureSize: 2048,
                includeCustomExtensions: false,
                animations: true,
                morphTargets: true,
                skins: true
            }
        });

        // Unreal Engine preset
        this.presets.set('unreal', {
            format: 'gltf',
            name: 'Unreal Engine',
            description: 'Optimized for Unreal Engine with separate texture files',
            options: {
                binary: false,
                embedImages: false,
                maxTextureSize: 4096,
                includeCustomExtensions: true,
                animations: true,
                morphTargets: true,
                skins: true
            }
        });

        // Blender preset
        this.presets.set('blender', {
            format: 'gltf',
            name: 'Blender',
            description: 'Compatible with Blender 3D software',
            options: {
                binary: false,
                embedImages: false,
                includeCustomExtensions: true,
                animations: true,
                morphTargets: true,
                skins: true,
                materials: true
            }
        });

        // Web deployment preset
        this.presets.set('web', {
            format: 'glb',
            name: 'Web Deployment',
            description: 'Optimized for web browsers with small file size',
            options: {
                binary: true,
                embedImages: true,
                maxTextureSize: 1024,
                includeCustomExtensions: false,
                animations: true,
                morphTargets: false,
                skins: true
            }
        });

        // 3D Printing preset
        this.presets.set('3d-printing', {
            format: 'stl',
            name: '3D Printing',
            description: 'Optimized for 3D printing with mesh validation',
            options: {
                binary: true,
                validate: true,
                fixMesh: true,
                mergeVertices: true,
                removeDoubles: true,
                scale: 1.0
            }
        });

        // CAD Software preset
        this.presets.set('cad', {
            format: 'obj',
            name: 'CAD Software',
            description: 'Compatible with CAD applications',
            options: {
                includeNormals: true,
                includeUVs: true,
                includeMaterials: true,
                precision: 6
            }
        });

        // Archive/Backup preset
        this.presets.set('archive', {
            format: 'gltf',
            name: 'Archive/Backup',
            description: 'High quality preservation with all data',
            options: {
                binary: false,
                embedImages: false,
                includeCustomExtensions: true,
                animations: true,
                morphTargets: true,
                skins: true,
                materials: true,
                lights: true,
                cameras: true
            }
        });
    }

    /**
     * Export model in specified format
     */
    async exportModel(format = 'glb', options = {}) {
        try {
            const currentModel = this.core.getState().currentModel;
            if (!currentModel) {
                throw new Error('No model to export');
            }

            const exporter = this.exporters.get(format.toLowerCase());
            if (!exporter) {
                throw new Error(`Unsupported export format: ${format}`);
            }

            const defaultOptions = {
                binary: format.toLowerCase() === 'glb',
                embedImages: true,
                includeCustomExtensions: false,
                optimize: false,
                validate: false,
                ...options
            };

            this.core.emit('export:start', { format, options: defaultOptions });

            // Clone model for processing
            let modelToExport = currentModel.clone();

            // Apply optimizations if requested
            if (defaultOptions.optimize) {
                modelToExport = await this.optimizeModel(modelToExport, defaultOptions);
            }

            // Validate model if requested
            if (defaultOptions.validate) {
                const validation = await this.validateModel(modelToExport, format);
                if (!validation.valid && defaultOptions.strictValidation) {
                    throw new Error(`Model validation failed: ${validation.issues.map(i => i.message).join(', ')}`);
                }
                this.core.emit('export:validation', validation);
            }

            const result = await this.exportWithExporter(exporter, modelToExport, defaultOptions);
            
            // Create download
            const filename = options.filename || `model.${format.toLowerCase()}`;
            await this.downloadFile(result, filename, defaultOptions.binary, format);

            this.core.emit('export:complete', { format, filename, size: this.getFileSize(result) });
            
            return {
                success: true,
                format,
                filename,
                size: this.getFileSize(result)
            };
            
        } catch (error) {
            this.core.emit('export:error', { error, format });
            throw error;
        }
    }

    /**
     * Export model using preset
     */
    async exportWithPreset(presetName) {
        const preset = this.presets.get(presetName);
        if (!preset) {
            throw new Error(`Unknown preset: ${presetName}`);
        }

        return this.exportModel(preset.format, preset.options);
    }

    /**
     * Export screenshot with advanced options
     */
    async exportScreenshot(options = {}) {
        try {
            const renderingEngine = this.core.getModule('rendering');
            if (!renderingEngine || !renderingEngine.renderer) {
                throw new Error('Rendering engine not available');
            }

            const defaultOptions = {
                width: window.innerWidth,
                height: window.innerHeight,
                format: 'png',
                quality: 1.0,
                transparent: false,
                scale: 1.0,
                antialias: true,
                filename: null,
                ...options
            };

            this.core.emit('export:screenshot:start', defaultOptions);

            // Calculate actual dimensions
            const actualWidth = Math.floor(defaultOptions.width * defaultOptions.scale);
            const actualHeight = Math.floor(defaultOptions.height * defaultOptions.scale);

            let dataURL;

            if (defaultOptions.scale !== 1.0 || actualWidth !== renderingEngine.renderer.domElement.width) {
                // Render at custom resolution
                dataURL = await this.renderAtResolution(renderingEngine, actualWidth, actualHeight, defaultOptions);
            } else {
                // Use current render
                renderingEngine.render();
                const canvas = renderingEngine.renderer.domElement;
                dataURL = canvas.toDataURL(`image/${defaultOptions.format}`, defaultOptions.quality);
            }

            // Create filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = defaultOptions.filename || `screenshot_${timestamp}.${defaultOptions.format}`;

            // Download
            this.downloadDataURL(dataURL, filename);

            const result = {
                filename,
                width: actualWidth,
                height: actualHeight,
                format: defaultOptions.format,
                size: this.estimateImageSize(dataURL)
            };

            this.core.emit('export:screenshot:complete', result);
            return result;
            
        } catch (error) {
            this.core.emit('export:screenshot:error', { error });
            throw error;
        }
    }

    /**
     * Render scene at specific resolution
     */
    async renderAtResolution(renderingEngine, width, height, options) {
        // Store original size
        const originalSize = renderingEngine.renderer.getSize(new THREE.Vector2());
        const originalPixelRatio = renderingEngine.renderer.getPixelRatio();

        try {
            // Set new size
            renderingEngine.renderer.setSize(width, height, false);
            renderingEngine.renderer.setPixelRatio(1);

            // Update camera aspect ratio if needed
            if (renderingEngine.camera.isPerspectiveCamera) {
                renderingEngine.camera.aspect = width / height;
                renderingEngine.camera.updateProjectionMatrix();
            }

            // Render
            renderingEngine.render();

            // Get canvas data
            const canvas = renderingEngine.renderer.domElement;
            return canvas.toDataURL(`image/${options.format}`, options.quality);

        } finally {
            // Restore original size
            renderingEngine.renderer.setSize(originalSize.x, originalSize.y, false);
            renderingEngine.renderer.setPixelRatio(originalPixelRatio);

            // Restore camera
            if (renderingEngine.camera.isPerspectiveCamera) {
                renderingEngine.camera.aspect = originalSize.x / originalSize.y;
                renderingEngine.camera.updateProjectionMatrix();
            }
        }
    }

    /**
     * Enhanced batch export with progress tracking
     */
    async batchExport(models, format, options = {}) {
        if (this.isProcessingBatch) {
            throw new Error('Batch export already in progress');
        }

        this.isProcessingBatch = true;
        const results = [];
        const totalModels = models.length;

        try {
            this.core.emit('export:batch:start', { totalModels, format, options });

            for (let i = 0; i < models.length; i++) {
                const progress = {
                    current: i + 1,
                    total: totalModels,
                    percentage: Math.round(((i + 1) / totalModels) * 100)
                };

                this.core.emit('export:batch:progress', progress);

                try {
                    // Temporarily set the model as current
                    const originalModel = this.core.getState().currentModel;
                    this.core.setState({ currentModel: models[i] });
                    
                    const filename = options.filenameTemplate 
                        ? options.filenameTemplate.replace('{index}', i + 1).replace('{name}', models[i].name || `model_${i + 1}`)
                        : `model_${i + 1}.${format.toLowerCase()}`;
                    
                    const result = await this.exportModel(format, {
                        ...options,
                        filename
                    });
                    
                    results.push({ 
                        success: true, 
                        result,
                        modelIndex: i,
                        modelName: models[i].name || `Model ${i + 1}`
                    });
                    
                    // Restore original model
                    this.core.setState({ currentModel: originalModel });
                    
                } catch (error) {
                    results.push({ 
                        success: false, 
                        error: error.message,
                        modelIndex: i,
                        modelName: models[i].name || `Model ${i + 1}`
                    });
                }

                // Add small delay to prevent UI blocking
                if (i < models.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }

            const summary = {
                total: totalModels,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
                results,
                format
            };

            this.core.emit('export:batch:complete', summary);
            return summary;

        } finally {
            this.isProcessingBatch = false;
        }
    }

    /**
     * Export with Three.js exporter (Promise wrapper)
     */
    exportWithExporter(exporter, model, options) {
        return new Promise((resolve, reject) => {
            exporter.parse(
                model,
                (result) => resolve(result),
                (error) => reject(error),
                options
            );
        });
    }

    /**
     * Download file
     */
    downloadFile(data, filename, isBinary = false) {
        let blob;
        
        if (isBinary) {
            blob = new Blob([data], { type: 'application/octet-stream' });
        } else {
            blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        }

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        
        // Cleanup
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
    }

    /**
     * Download data URL
     */
    downloadDataURL(dataURL, filename) {
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = filename;
        link.click();
    }

    /**
     * Register custom exporter
     */
    registerExporter(format, exporter) {
        this.exporters.set(format.toLowerCase(), exporter);
        this.core.emit('export:exporter:registered', { format });
    }

    /**
     * Register custom preset
     */
    registerPreset(name, preset) {
        this.presets.set(name, preset);
        this.core.emit('export:preset:registered', { name, preset });
    }

    /**
     * Get available formats
     */
    getAvailableFormats() {
        return Array.from(this.exporters.keys());
    }

    /**
     * Get available presets
     */
    getAvailablePresets() {
        return Array.from(this.presets.keys());
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.exporters.clear();
        this.presets.clear();
        this.initialized = false;
    }

    /**
     * Optimize model for export
     */
    async optimizeModel(model, options) {
        let optimizedModel = model.clone();

        if (options.mergeVertices) {
            optimizedModel.traverse((child) => {
                if (child.geometry) {
                    const optimizer = this.optimizers.get('mergeVertices');
                    child.geometry = optimizer(child.geometry, options);
                }
            });
        }

        if (options.simplify && options.simplifyRatio) {
            optimizedModel.traverse((child) => {
                if (child.geometry) {
                    const optimizer = this.optimizers.get('simplify');
                    child.geometry = optimizer(child.geometry, { targetRatio: options.simplifyRatio });
                }
            });
        }

        if (options.compressTextures) {
            const optimizer = this.optimizers.get('compressTextures');
            optimizedModel = optimizer(optimizedModel, options);
        }

        return optimizedModel;
    }

    /**
     * Validate model for export
     */
    async validateModel(model, format) {
        const validatorType = format === 'stl' ? '3d-printing' : 'general';
        const validator = this.validators.get(validatorType);
        
        if (!validator) {
            return { valid: true, issues: [] };
        }

        const issues = [];
        
        model.traverse((child) => {
            if (child.geometry) {
                const validation = validator(child.geometry);
                issues.push(...validation.issues);
            }
        });

        return {
            valid: issues.filter(i => i.severity === 'error').length === 0,
            issues,
            recommendations: this.generate3DPrintingRecommendations(issues)
        };
    }

    /**
     * Generate X3D content
     */
    generateX3D(scene, options = {}) {
        const { precision = 3 } = options;
        
        let x3dContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE X3D PUBLIC "ISO//Web3D//DTD X3D 3.3//EN" "http://www.web3d.org/specifications/x3d-3.3.dtd">
<X3D profile='Interchange' version='3.3'>
  <head>
    <meta name='title' content='Exported from 3D Model Viewer'/>
    <meta name='generator' content='3D Model Viewer Pro'/>
  </head>
  <Scene>
`;

        scene.traverse((child) => {
            if (child.isMesh && child.geometry) {
                x3dContent += this.meshToX3D(child, precision);
            }
        });

        x3dContent += `  </Scene>
</X3D>`;

        return x3dContent;
    }

    /**
     * Convert mesh to X3D format
     */
    meshToX3D(mesh, precision) {
        const geometry = mesh.geometry;
        const positions = geometry.attributes.position.array;
        const indices = geometry.index ? geometry.index.array : null;

        let x3d = '    <Shape>\n';
        
        // Add appearance if material exists
        if (mesh.material) {
            x3d += '      <Appearance>\n';
            x3d += '        <Material diffuseColor="0.8 0.8 0.8"/>\n';
            x3d += '      </Appearance>\n';
        }

        x3d += '      <IndexedFaceSet coordIndex="';
        
        if (indices) {
            for (let i = 0; i < indices.length; i += 3) {
                x3d += `${indices[i]} ${indices[i + 1]} ${indices[i + 2]} -1 `;
            }
        } else {
            for (let i = 0; i < positions.length / 9; i++) {
                const base = i * 3;
                x3d += `${base} ${base + 1} ${base + 2} -1 `;
            }
        }
        
        x3d += '">\n';
        x3d += '        <Coordinate point="';
        
        for (let i = 0; i < positions.length; i += 3) {
            x3d += `${positions[i].toFixed(precision)} ${positions[i + 1].toFixed(precision)} ${positions[i + 2].toFixed(precision)} `;
        }
        
        x3d += '"/>\n';
        x3d += '      </IndexedFaceSet>\n';
        x3d += '    </Shape>\n';

        return x3d;
    }

    /**
     * Mesh validation helper methods
     */
    isManifold(geometry) {
        // Simplified manifold check - real implementation would be more complex
        const positions = geometry.attributes.position.array;
        const indices = geometry.index ? geometry.index.array : null;
        
        if (!indices) return false;
        
        // Check for consistent winding order and edge connectivity
        const edges = new Map();
        
        for (let i = 0; i < indices.length; i += 3) {
            const triangle = [indices[i], indices[i + 1], indices[i + 2]];
            
            for (let j = 0; j < 3; j++) {
                const edge = [triangle[j], triangle[(j + 1) % 3]].sort().join(',');
                edges.set(edge, (edges.get(edge) || 0) + 1);
            }
        }
        
        // Each edge should be shared by exactly 2 triangles in a manifold mesh
        for (const count of edges.values()) {
            if (count !== 2) return false;
        }
        
        return true;
    }

    calculateMinThickness(geometry) {
        // Simplified thickness calculation
        const box = new THREE.Box3().setFromBufferAttribute(geometry.attributes.position);
        const size = box.getSize(new THREE.Vector3());
        return Math.min(size.x, size.y, size.z);
    }

    detectOverhangs(geometry, threshold = 45) {
        // Simplified overhang detection
        const normals = geometry.attributes.normal;
        const overhangs = [];
        
        if (normals) {
            for (let i = 0; i < normals.count; i++) {
                const normal = new THREE.Vector3(
                    normals.getX(i),
                    normals.getY(i),
                    normals.getZ(i)
                );
                
                const angle = Math.acos(Math.abs(normal.y)) * 180 / Math.PI;
                if (angle > threshold) {
                    overhangs.push(i);
                }
            }
        }
        
        return overhangs;
    }

    countDegenerateTriangles(geometry) {
        const positions = geometry.attributes.position.array;
        const indices = geometry.index ? geometry.index.array : null;
        let count = 0;
        
        if (indices) {
            for (let i = 0; i < indices.length; i += 3) {
                const v1 = new THREE.Vector3(
                    positions[indices[i] * 3],
                    positions[indices[i] * 3 + 1],
                    positions[indices[i] * 3 + 2]
                );
                const v2 = new THREE.Vector3(
                    positions[indices[i + 1] * 3],
                    positions[indices[i + 1] * 3 + 1],
                    positions[indices[i + 1] * 3 + 2]
                );
                const v3 = new THREE.Vector3(
                    positions[indices[i + 2] * 3],
                    positions[indices[i + 2] * 3 + 1],
                    positions[indices[i + 2] * 3 + 2]
                );
                
                const area = new THREE.Vector3()
                    .crossVectors(v2.sub(v1), v3.sub(v1))
                    .length() / 2;
                
                if (area < 1e-10) count++;
            }
        }
        
        return count;
    }

    countDuplicateVertices(geometry) {
        const positions = geometry.attributes.position.array;
        const vertices = new Set();
        let duplicates = 0;
        
        for (let i = 0; i < positions.length; i += 3) {
            const vertex = `${positions[i].toFixed(6)},${positions[i + 1].toFixed(6)},${positions[i + 2].toFixed(6)}`;
            if (vertices.has(vertex)) {
                duplicates++;
            } else {
                vertices.add(vertex);
            }
        }
        
        return duplicates;
    }

    generate3DPrintingRecommendations(issues) {
        const recommendations = [];
        
        issues.forEach(issue => {
            switch (issue.type) {
                case 'non-manifold':
                    recommendations.push('Use mesh repair tools to fix non-manifold geometry');
                    break;
                case 'thin-walls':
                    recommendations.push('Increase wall thickness or use higher resolution printer');
                    break;
                case 'overhangs':
                    recommendations.push('Add support structures or reorient the model');
                    break;
            }
        });
        
        return recommendations;
    }

    /**
     * Get file size estimate
     */
    getFileSize(data) {
        if (typeof data === 'string') {
            return new Blob([data]).size;
        } else if (data instanceof ArrayBuffer) {
            return data.byteLength;
        } else if (data instanceof Uint8Array) {
            return data.length;
        }
        return 0;
    }

    /**
     * Estimate image size from data URL
     */
    estimateImageSize(dataURL) {
        const base64 = dataURL.split(',')[1];
        return Math.round(base64.length * 0.75); // Base64 is ~33% larger than binary
    }

    /**
     * Enhanced download with format-specific handling
     */
    async downloadFile(data, filename, isBinary = false, format = '') {
        let blob;
        let mimeType = 'application/octet-stream';
        
        // Set appropriate MIME type based on format
        switch (format.toLowerCase()) {
            case 'gltf':
                mimeType = 'model/gltf+json';
                break;
            case 'glb':
                mimeType = 'model/gltf-binary';
                break;
            case 'obj':
                mimeType = 'text/plain';
                break;
            case 'stl':
                mimeType = 'application/sla';
                break;
            case 'ply':
                mimeType = 'application/ply';
                break;
            case 'dae':
                mimeType = 'model/vnd.collada+xml';
                break;
            case 'x3d':
                mimeType = 'model/x3d+xml';
                break;
        }
        
        if (isBinary || data instanceof ArrayBuffer || data instanceof Uint8Array) {
            blob = new Blob([data], { type: mimeType });
        } else if (typeof data === 'object') {
            blob = new Blob([JSON.stringify(data, null, 2)], { type: mimeType });
        } else {
            blob = new Blob([data], { type: mimeType });
        }

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        
        // Add to DOM temporarily for Firefox compatibility
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Cleanup
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
    }

    /**
     * Get export statistics
     */
    getExportStatistics() {
        return {
            availableFormats: this.getAvailableFormats(),
            availablePresets: this.getAvailablePresets(),
            supportedOptimizations: Array.from(this.optimizers.keys()),
            supportedValidations: Array.from(this.validators.keys()),
            isProcessingBatch: this.isProcessingBatch,
            queueLength: this.batchQueue.length
        };
    }

    /**
     * Validate export options
     */
    validateExportOptions(options) {
        if (!options) {
            return false;
        }

        // Validate format
        if (!options.format) {
            return false;
        }
        
        const supportedFormats = ['glb', 'gltf', 'obj', 'stl', 'ply'];
        if (!supportedFormats.includes(options.format.toLowerCase())) {
            return false;
        }

        // Validate quality settings
        if (options.quality !== undefined) {
            if (typeof options.quality !== 'number' || options.quality < 0 || options.quality > 1) {
                return false;
            }
        }

        // Validate compression settings
        if (options.compression !== undefined) {
            if (typeof options.compression !== 'boolean') {
                return false;
            }
        }

        // Validate file size limits
        if (options.maxFileSize !== undefined) {
            if (typeof options.maxFileSize !== 'number' || options.maxFileSize <= 0) {
                return false;
            }
        }

        return true;
    }

    /**
     * Enhanced cleanup
     */
    destroy() {
        // Cancel any ongoing batch operations
        this.isProcessingBatch = false;
        this.batchQueue = [];
        
        // Clear all maps
        this.exporters.clear();
        this.presets.clear();
        this.optimizers.clear();
        this.validators.clear();
        
        this.initialized = false;
        this.core.emit('export:destroyed');
    }
}