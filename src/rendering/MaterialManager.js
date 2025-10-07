import * as THREE from 'three';

/**
 * MaterialManager - Advanced PBR material system with metallic and roughness workflows
 */
export class MaterialManager {
    constructor(core, renderer) {
        this.core = core;
        this.renderer = renderer;
        
        // Material collections
        this.materials = new Map();
        this.materialPresets = new Map();
        this.textureCache = new Map();
        
        // PBR workflow settings
        this.defaultPBRSettings = {
            metalness: 0.0,
            roughness: 0.5,
            clearcoat: 0.0,
            clearcoatRoughness: 0.0,
            sheen: 0.0,
            sheenRoughness: 1.0,
            sheenColor: new THREE.Color(0xffffff),
            transmission: 0.0,
            thickness: 0.0,
            ior: 1.5,
            reflectivity: 0.5,
            iridescence: 0.0,
            iridescenceIOR: 1.3,
            iridescenceThicknessRange: [100, 400]
        };
        
        // Material validation
        this.materialValidator = new MaterialValidator();
        
        this.initialized = false;
        this.init();
    }

    /**
     * Initialize the material system
     */
    init() {
        if (this.initialized) return;

        try {
            this.createMaterialPresets();
            this.setupEventListeners();
            
            this.initialized = true;
            this.core.emit('materials:initialized');
        } catch (error) {
            console.error('Failed to initialize MaterialManager:', error);
            throw error;
        }
    }

    /**
     * Create material presets
     */
    createMaterialPresets() {
        // Metal presets
        this.materialPresets.set('aluminum', {
            name: 'Aluminum',
            type: 'metal',
            properties: {
                color: new THREE.Color(0xc0c0c0),
                metalness: 1.0,
                roughness: 0.1,
                reflectivity: 0.9
            }
        });

        this.materialPresets.set('gold', {
            name: 'Gold',
            type: 'metal',
            properties: {
                color: new THREE.Color(0xffd700),
                metalness: 1.0,
                roughness: 0.05,
                reflectivity: 0.95
            }
        });

        this.materialPresets.set('copper', {
            name: 'Copper',
            type: 'metal',
            properties: {
                color: new THREE.Color(0xb87333),
                metalness: 1.0,
                roughness: 0.15,
                reflectivity: 0.85
            }
        });

        this.materialPresets.set('steel', {
            name: 'Steel',
            type: 'metal',
            properties: {
                color: new THREE.Color(0x8c8c8c),
                metalness: 1.0,
                roughness: 0.2,
                reflectivity: 0.8
            }
        });

        this.materialPresets.set('chrome', {
            name: 'Chrome',
            type: 'metal',
            properties: {
                color: new THREE.Color(0xffffff),
                metalness: 1.0,
                roughness: 0.01,
                reflectivity: 0.98
            }
        });

        // Dielectric presets
        this.materialPresets.set('plastic', {
            name: 'Plastic',
            type: 'dielectric',
            properties: {
                color: new THREE.Color(0xffffff),
                metalness: 0.0,
                roughness: 0.5,
                reflectivity: 0.04,
                ior: 1.46
            }
        });

        this.materialPresets.set('rubber', {
            name: 'Rubber',
            type: 'dielectric',
            properties: {
                color: new THREE.Color(0x2c2c2c),
                metalness: 0.0,
                roughness: 0.9,
                reflectivity: 0.02
            }
        });

        this.materialPresets.set('ceramic', {
            name: 'Ceramic',
            type: 'dielectric',
            properties: {
                color: new THREE.Color(0xf5f5f5),
                metalness: 0.0,
                roughness: 0.1,
                reflectivity: 0.08,
                ior: 1.5
            }
        });

        this.materialPresets.set('glass', {
            name: 'Glass',
            type: 'transparent',
            properties: {
                color: new THREE.Color(0xffffff),
                metalness: 0.0,
                roughness: 0.0,
                transmission: 1.0,
                thickness: 0.5,
                ior: 1.52,
                opacity: 0.1,
                transparent: true
            }
        });

        this.materialPresets.set('diamond', {
            name: 'Diamond',
            type: 'transparent',
            properties: {
                color: new THREE.Color(0xffffff),
                metalness: 0.0,
                roughness: 0.0,
                transmission: 0.9,
                thickness: 1.0,
                ior: 2.42,
                iridescence: 0.3,
                iridescenceIOR: 1.3,
                opacity: 0.2,
                transparent: true
            }
        });

        // Fabric presets
        this.materialPresets.set('cotton', {
            name: 'Cotton',
            type: 'fabric',
            properties: {
                color: new THREE.Color(0xf0f0f0),
                metalness: 0.0,
                roughness: 0.8,
                sheen: 0.1,
                sheenRoughness: 0.9,
                sheenColor: new THREE.Color(0xffffff)
            }
        });

        this.materialPresets.set('silk', {
            name: 'Silk',
            type: 'fabric',
            properties: {
                color: new THREE.Color(0xffffff),
                metalness: 0.0,
                roughness: 0.3,
                sheen: 0.8,
                sheenRoughness: 0.2,
                sheenColor: new THREE.Color(0xffffff)
            }
        });

        this.materialPresets.set('velvet', {
            name: 'Velvet',
            type: 'fabric',
            properties: {
                color: new THREE.Color(0x8b0000),
                metalness: 0.0,
                roughness: 0.9,
                sheen: 0.9,
                sheenRoughness: 0.8,
                sheenColor: new THREE.Color(0xff6b6b)
            }
        });

        // Organic presets
        this.materialPresets.set('wood', {
            name: 'Wood',
            type: 'organic',
            properties: {
                color: new THREE.Color(0x8b4513),
                metalness: 0.0,
                roughness: 0.7,
                reflectivity: 0.02
            }
        });

        this.materialPresets.set('leather', {
            name: 'Leather',
            type: 'organic',
            properties: {
                color: new THREE.Color(0x654321),
                metalness: 0.0,
                roughness: 0.6,
                reflectivity: 0.03
            }
        });

        // Special effect presets
        this.materialPresets.set('car_paint', {
            name: 'Car Paint',
            type: 'special',
            properties: {
                color: new THREE.Color(0xff0000),
                metalness: 0.0,
                roughness: 0.1,
                clearcoat: 1.0,
                clearcoatRoughness: 0.03,
                reflectivity: 0.1
            }
        });

        this.materialPresets.set('carbon_fiber', {
            name: 'Carbon Fiber',
            type: 'special',
            properties: {
                color: new THREE.Color(0x1a1a1a),
                metalness: 0.8,
                roughness: 0.2,
                reflectivity: 0.6
            }
        });
    }

    /**
     * Create PBR material with advanced properties
     */
    createPBRMaterial(name, options = {}) {
        const material = new THREE.MeshPhysicalMaterial({
            // Base properties
            color: options.color || new THREE.Color(0xffffff),
            
            // PBR properties
            metalness: options.metalness !== undefined ? options.metalness : this.defaultPBRSettings.metalness,
            roughness: options.roughness !== undefined ? options.roughness : this.defaultPBRSettings.roughness,
            
            // Advanced properties
            clearcoat: options.clearcoat !== undefined ? options.clearcoat : this.defaultPBRSettings.clearcoat,
            clearcoatRoughness: options.clearcoatRoughness !== undefined ? options.clearcoatRoughness : this.defaultPBRSettings.clearcoatRoughness,
            
            sheen: options.sheen !== undefined ? options.sheen : this.defaultPBRSettings.sheen,
            sheenRoughness: options.sheenRoughness !== undefined ? options.sheenRoughness : this.defaultPBRSettings.sheenRoughness,
            sheenColor: options.sheenColor || this.defaultPBRSettings.sheenColor.clone(),
            
            transmission: options.transmission !== undefined ? options.transmission : this.defaultPBRSettings.transmission,
            thickness: options.thickness !== undefined ? options.thickness : this.defaultPBRSettings.thickness,
            ior: options.ior !== undefined ? options.ior : this.defaultPBRSettings.ior,
            
            reflectivity: options.reflectivity !== undefined ? options.reflectivity : this.defaultPBRSettings.reflectivity,
            
            iridescence: options.iridescence !== undefined ? options.iridescence : this.defaultPBRSettings.iridescence,
            iridescenceIOR: options.iridescenceIOR !== undefined ? options.iridescenceIOR : this.defaultPBRSettings.iridescenceIOR,
            iridescenceThicknessRange: options.iridescenceThicknessRange || [...this.defaultPBRSettings.iridescenceThicknessRange],
            
            // Transparency
            transparent: options.transparent || false,
            opacity: options.opacity !== undefined ? options.opacity : 1.0,
            
            // Other properties
            side: options.side || THREE.FrontSide,
            flatShading: options.flatShading || false,
            wireframe: options.wireframe || false
        });

        // Apply textures if provided
        if (options.textures) {
            this.applyTexturesToMaterial(material, options.textures);
        }

        // Validate material
        if (!this.materialValidator.validate(material)) {
            console.warn(`Material '${name}' validation failed`);
        }

        this.materials.set(name, material);
        this.core.emit('materials:created', { name, material });
        
        return material;
    }

    /**
     * Apply textures to material
     */
    applyTexturesToMaterial(material, textures) {
        const textureLoader = new THREE.TextureLoader();

        // Diffuse/Albedo map
        if (textures.diffuse || textures.albedo || textures.baseColor) {
            const diffuseUrl = textures.diffuse || textures.albedo || textures.baseColor;
            material.map = this.loadTexture(diffuseUrl, textureLoader);
        }

        // Normal map
        if (textures.normal) {
            material.normalMap = this.loadTexture(textures.normal, textureLoader);
            material.normalScale = new THREE.Vector2(1, 1);
        }

        // Roughness map
        if (textures.roughness) {
            material.roughnessMap = this.loadTexture(textures.roughness, textureLoader);
        }

        // Metalness map
        if (textures.metalness || textures.metallic) {
            const metalnessUrl = textures.metalness || textures.metallic;
            material.metalnessMap = this.loadTexture(metalnessUrl, textureLoader);
        }

        // Ambient occlusion map
        if (textures.ao || textures.occlusion) {
            const aoUrl = textures.ao || textures.occlusion;
            material.aoMap = this.loadTexture(aoUrl, textureLoader);
            material.aoMapIntensity = 1.0;
        }

        // Emission map
        if (textures.emission || textures.emissive) {
            const emissionUrl = textures.emission || textures.emissive;
            material.emissiveMap = this.loadTexture(emissionUrl, textureLoader);
            material.emissive = new THREE.Color(0xffffff);
            material.emissiveIntensity = 1.0;
        }

        // Displacement map
        if (textures.displacement || textures.height) {
            const displacementUrl = textures.displacement || textures.height;
            material.displacementMap = this.loadTexture(displacementUrl, textureLoader);
            material.displacementScale = 0.1;
            material.displacementBias = 0.0;
        }

        // Alpha map
        if (textures.alpha || textures.opacity) {
            const alphaUrl = textures.alpha || textures.opacity;
            material.alphaMap = this.loadTexture(alphaUrl, textureLoader);
            material.transparent = true;
        }

        // Clearcoat maps
        if (textures.clearcoat) {
            material.clearcoatMap = this.loadTexture(textures.clearcoat, textureLoader);
        }
        if (textures.clearcoatRoughness) {
            material.clearcoatRoughnessMap = this.loadTexture(textures.clearcoatRoughness, textureLoader);
        }
        if (textures.clearcoatNormal) {
            material.clearcoatNormalMap = this.loadTexture(textures.clearcoatNormal, textureLoader);
        }

        // Sheen maps
        if (textures.sheen) {
            material.sheenColorMap = this.loadTexture(textures.sheen, textureLoader);
        }
        if (textures.sheenRoughness) {
            material.sheenRoughnessMap = this.loadTexture(textures.sheenRoughness, textureLoader);
        }

        // Transmission maps
        if (textures.transmission) {
            material.transmissionMap = this.loadTexture(textures.transmission, textureLoader);
        }
        if (textures.thickness) {
            material.thicknessMap = this.loadTexture(textures.thickness, textureLoader);
        }

        // Iridescence maps
        if (textures.iridescence) {
            material.iridescenceMap = this.loadTexture(textures.iridescence, textureLoader);
        }
        if (textures.iridescenceThickness) {
            material.iridescenceThicknessMap = this.loadTexture(textures.iridescenceThickness, textureLoader);
        }
    }

    /**
     * Load texture with caching
     */
    loadTexture(url, loader) {
        if (this.textureCache.has(url)) {
            return this.textureCache.get(url);
        }

        const texture = loader.load(url);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;

        this.textureCache.set(url, texture);
        return texture;
    }

    /**
     * Apply material preset
     */
    applyPreset(materialName, presetName) {
        const preset = this.materialPresets.get(presetName);
        if (!preset) {
            console.warn(`Material preset '${presetName}' not found`);
            return null;
        }

        const material = this.createPBRMaterial(materialName, preset.properties);
        this.core.emit('materials:preset:applied', { materialName, presetName, material });
        
        return material;
    }

    /**
     * Update material properties
     */
    updateMaterial(name, properties) {
        const material = this.materials.get(name);
        if (!material) {
            console.warn(`Material '${name}' not found`);
            return;
        }

        Object.entries(properties).forEach(([key, value]) => {
            if (material[key] !== undefined) {
                if (value instanceof THREE.Color) {
                    material[key].copy(value);
                } else {
                    material[key] = value;
                }
            }
        });

        material.needsUpdate = true;
        this.core.emit('materials:updated', { name, material, properties });
    }

    /**
     * Clone material
     */
    cloneMaterial(sourceName, targetName) {
        const sourceMaterial = this.materials.get(sourceName);
        if (!sourceMaterial) {
            console.warn(`Source material '${sourceName}' not found`);
            return null;
        }

        const clonedMaterial = sourceMaterial.clone();
        this.materials.set(targetName, clonedMaterial);
        
        this.core.emit('materials:cloned', { sourceName, targetName, material: clonedMaterial });
        return clonedMaterial;
    }

    /**
     * Apply material to mesh
     */
    applyMaterialToMesh(mesh, materialName) {
        const material = this.materials.get(materialName);
        if (!material) {
            console.warn(`Material '${materialName}' not found`);
            return;
        }

        if (mesh.isMesh) {
            mesh.material = material;
            this.core.emit('materials:applied', { mesh, materialName, material });
        }
    }

    /**
     * Apply material to model
     */
    applyMaterialToModel(model, materialName, meshFilter = null) {
        const material = this.materials.get(materialName);
        if (!material) {
            console.warn(`Material '${materialName}' not found`);
            return;
        }

        model.traverse((child) => {
            if (child.isMesh) {
                if (!meshFilter || meshFilter(child)) {
                    child.material = material;
                }
            }
        });

        this.core.emit('materials:applied:model', { model, materialName, material });
    }

    /**
     * Get material analysis
     */
    analyzeMaterial(name) {
        const material = this.materials.get(name);
        if (!material) {
            console.warn(`Material '${name}' not found`);
            return null;
        }

        const analysis = {
            name,
            type: material.type,
            workflow: this.detectWorkflow(material),
            properties: {
                color: material.color ? material.color.getHexString() : null,
                metalness: material.metalness,
                roughness: material.roughness,
                transmission: material.transmission,
                clearcoat: material.clearcoat,
                sheen: material.sheen,
                iridescence: material.iridescence,
                transparent: material.transparent,
                opacity: material.opacity
            },
            textures: this.getTextureInfo(material),
            validation: this.materialValidator.validate(material)
        };

        return analysis;
    }

    /**
     * Detect material workflow
     */
    detectWorkflow(material) {
        if (material.metalness > 0.5) {
            return 'metallic';
        } else if (material.transmission > 0.1) {
            return 'transmission';
        } else if (material.clearcoat > 0.1) {
            return 'clearcoat';
        } else if (material.sheen > 0.1) {
            return 'sheen';
        } else {
            return 'dielectric';
        }
    }

    /**
     * Get texture information from material
     */
    getTextureInfo(material) {
        const textures = {};
        
        const textureProperties = [
            'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap',
            'emissiveMap', 'displacementMap', 'alphaMap', 'clearcoatMap',
            'clearcoatRoughnessMap', 'clearcoatNormalMap', 'sheenColorMap',
            'sheenRoughnessMap', 'transmissionMap', 'thicknessMap',
            'iridescenceMap', 'iridescenceThicknessMap'
        ];

        textureProperties.forEach(prop => {
            if (material[prop]) {
                textures[prop] = {
                    image: material[prop].image,
                    format: material[prop].format,
                    type: material[prop].type,
                    wrapS: material[prop].wrapS,
                    wrapT: material[prop].wrapT,
                    repeat: material[prop].repeat,
                    offset: material[prop].offset
                };
            }
        });

        return textures;
    }

    /**
     * Optimize material for performance
     */
    optimizeMaterial(name) {
        const material = this.materials.get(name);
        if (!material) {
            console.warn(`Material '${name}' not found`);
            return;
        }

        // Disable unnecessary features
        if (material.transmission === 0) {
            material.transmission = undefined;
        }
        if (material.clearcoat === 0) {
            material.clearcoat = undefined;
            material.clearcoatRoughness = undefined;
        }
        if (material.sheen === 0) {
            material.sheen = undefined;
            material.sheenRoughness = undefined;
        }
        if (material.iridescence === 0) {
            material.iridescence = undefined;
        }

        material.needsUpdate = true;
        this.core.emit('materials:optimized', { name, material });
    }

    /**
     * Get material by name
     */
    getMaterial(name) {
        return this.materials.get(name);
    }

    /**
     * Get all materials
     */
    getAllMaterials() {
        return Array.from(this.materials.entries());
    }

    /**
     * Get available presets
     */
    getPresets() {
        return Array.from(this.materialPresets.entries());
    }

    /**
     * Remove material
     */
    removeMaterial(name) {
        const material = this.materials.get(name);
        if (material) {
            material.dispose();
            this.materials.delete(name);
            this.core.emit('materials:removed', { name });
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.core.on('model:loaded', (data) => {
            this.analyzeModelMaterials(data.model);
        });
    }

    /**
     * Analyze materials in loaded model
     */
    analyzeModelMaterials(model) {
        const materials = new Set();
        
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => materials.add(mat));
                } else {
                    materials.add(child.material);
                }
            }
        });

        const analysis = Array.from(materials).map((material, index) => {
            const name = material.name || `material_${index}`;
            this.materials.set(name, material);
            return this.analyzeMaterial(name);
        });

        this.core.emit('materials:model:analyzed', { model, analysis });
    }

    /**
     * Cleanup resources
     */
    destroy() {
        // Dispose all materials
        this.materials.forEach((material, name) => {
            material.dispose();
        });
        this.materials.clear();

        // Dispose cached textures
        this.textureCache.forEach((texture, url) => {
            texture.dispose();
        });
        this.textureCache.clear();

        this.materialPresets.clear();
        this.initialized = false;
    }
}

/**
 * Material validation utility
 */
class MaterialValidator {
    validate(material) {
        const issues = [];

        // Check for common issues
        if (material.metalness > 0.5 && material.transmission > 0.1) {
            issues.push('High metalness and transmission values are physically incorrect');
        }

        if (material.roughness === 0 && material.metalness < 1) {
            issues.push('Zero roughness on dielectric materials is unrealistic');
        }

        if (material.clearcoat > 0 && !material.clearcoatRoughness) {
            issues.push('Clearcoat without roughness may cause rendering issues');
        }

        if (material.transmission > 0 && !material.transparent) {
            issues.push('Transmission requires transparent flag to be enabled');
        }

        return {
            valid: issues.length === 0,
            issues
        };
    }
}