import * as THREE from 'three';

/**
 * AnalysisManager - Professional analysis and measurement tools
 * Provides detailed model statistics, measurement tools, and comparison features
 */
export class AnalysisManager {
    constructor(core) {
        this.core = core;
        this.renderingEngine = null;
        
        // Measurement system
        this.measurementMode = 'none'; // 'distance', 'angle', 'area', 'none'
        this.measurementPoints = [];
        this.measurementMarkers = [];
        this.measurementLines = [];
        this.measurementLabels = [];
        this.raycaster = new THREE.Raycaster();
        
        // Model comparison
        this.comparisonModels = [];
        this.comparisonActive = false;
        
        // Statistics tracking
        this.currentStats = null;
        
        // Material analysis
        this.materialInspector = null;
        
        // Presentation mode
        this.presentationMode = false;
        this.presentationCameras = [];
        this.currentPresentationView = 0;
        
        this.initialized = false;
    }

    /**
     * Initialize the analysis manager
     */
    init() {
        if (this.initialized) {
            console.warn('AnalysisManager already initialized');
            return;
        }

        this.renderingEngine = this.core.getModule('rendering');
        if (!this.renderingEngine) {
            throw new Error('RenderingEngine not found');
        }

        this.setupEventListeners();
        this.setupUI();
        this.initializeMaterialInspector();
        this.setupPresentationCameras();
        
        this.initialized = true;
        this.core.emit('analysis:initialized');
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen for model loading events
        this.core.on('assets:model:loaded', (data) => this.onModelLoaded(data));
        this.core.on('rendering:model:added', (data) => this.analyzeModel(data.model));
        
        // Listen for viewport clicks for measurements
        const viewerContainer = document.getElementById('viewerContainer');
        if (viewerContainer) {
            viewerContainer.addEventListener('click', (e) => this.onViewportClick(e));
        }
    }

    /**
     * Setup analysis UI
     */
    setupUI() {
        this.setupMeasurementEventListeners();
        this.setupMaterialInspectorEventListeners();
        this.setupPresentationEventListeners();
    }

    /**
     * Setup measurement event listeners
     */
    setupMeasurementEventListeners() {
        // Tool selection buttons
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                this.setMeasurementMode(tool);
            });
        });

        // Clear measurements
        const clearBtn = document.getElementById('clearMeasurements');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllMeasurements());
        }

        // Settings
        const showLabels = document.getElementById('showMeasurementLabels');
        if (showLabels) {
            showLabels.addEventListener('change', (e) => {
                this.toggleMeasurementLabels(e.target.checked);
            });
        }

        const snapToVertices = document.getElementById('snapToVertices');
        if (snapToVertices) {
            snapToVertices.addEventListener('change', (e) => {
                this.snapToVertices = e.target.checked;
            });
        }

        const units = document.getElementById('measurementUnits');
        if (units) {
            units.addEventListener('change', (e) => {
                this.measurementUnits = e.target.value;
                this.updateMeasurementDisplays();
            });
        }
    }



    /**
     * Setup material inspector event listeners
     */
    setupMaterialInspectorEventListeners() {
        const materialSelect = document.getElementById('materialSelect');
        if (materialSelect) {
            materialSelect.addEventListener('change', (e) => {
                this.inspectMaterial(e.target.value);
            });
        }
    }

    /**
     * Setup presentation event listeners
     */
    setupPresentationEventListeners() {
        const enterBtn = document.getElementById('enterPresentation');
        const controls = document.getElementById('presentationSidebarControls');

        if (enterBtn) {
            enterBtn.addEventListener('click', () => {
                this.enterPresentationMode();
                enterBtn.classList.add('hidden');
                if (controls) controls.classList.remove('hidden');
            });
        }

        // Camera presets
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.applyCameraPreset(btn.dataset.preset);
            });
        });

        // Lighting presets
        document.querySelectorAll('.lighting-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.applyLightingPreset(btn.dataset.lighting);
            });
        });

        // Navigation
        const prevBtn = document.getElementById('prevView');
        const nextBtn = document.getElementById('nextView');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousPresentationView());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextPresentationView());
        }
    }

    /**
     * Handle model loaded event
     */
    onModelLoaded(data) {
        if (data.model) {
            this.analyzeModel(data.model);
            this.updateMaterialInspector(data.model);
        }
    }

    /**
     * Analyze model and update statistics
     */
    analyzeModel(model) {
        const stats = this.calculateModelStatistics(model);
        this.currentStats = stats;
        this.updateStatisticsDisplay(stats);
    }

    /**
     * Calculate comprehensive model statistics
     */
    calculateModelStatistics(model) {
        const stats = {
            vertices: 0,
            faces: 0,
            materials: new Set(),
            textures: new Set(),
            animations: 0,
            meshes: 0,
            lights: 0,
            cameras: 0,
            boundingBox: null,
            memoryUsage: 0,
            drawCalls: 0
        };

        // Calculate bounding box
        const box = new THREE.Box3().setFromObject(model);
        stats.boundingBox = {
            min: box.min.clone(),
            max: box.max.clone(),
            size: box.getSize(new THREE.Vector3()),
            center: box.getCenter(new THREE.Vector3())
        };

        // Traverse model and collect statistics
        model.traverse((child) => {
            if (child.isMesh) {
                stats.meshes++;
                
                if (child.geometry) {
                    const geometry = child.geometry;
                    
                    // Count vertices
                    if (geometry.attributes.position) {
                        stats.vertices += geometry.attributes.position.count;
                    }
                    
                    // Count faces
                    if (geometry.index) {
                        stats.faces += geometry.index.count / 3;
                    } else if (geometry.attributes.position) {
                        stats.faces += geometry.attributes.position.count / 3;
                    }
                    
                    // Estimate memory usage
                    stats.memoryUsage += this.estimateGeometryMemory(geometry);
                }
                
                // Count materials and textures
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            stats.materials.add(mat.uuid);
                            this.collectTextures(mat, stats.textures);
                        });
                        stats.drawCalls += child.material.length;
                    } else {
                        stats.materials.add(child.material.uuid);
                        this.collectTextures(child.material, stats.textures);
                        stats.drawCalls++;
                    }
                }
            } else if (child.isLight) {
                stats.lights++;
            } else if (child.isCamera) {
                stats.cameras++;
            }
        });

        // Count animations
        if (model.animations) {
            stats.animations = model.animations.length;
        }

        // Convert sets to counts
        stats.materialCount = stats.materials.size;
        stats.textureCount = stats.textures.size;
        
        // Round face count
        stats.faces = Math.floor(stats.faces);

        return stats;
    }

    /**
     * Collect textures from material
     */
    collectTextures(material, textureSet) {
        const textureProperties = [
            'map', 'normalMap', 'bumpMap', 'displacementMap',
            'roughnessMap', 'metalnessMap', 'alphaMap',
            'emissiveMap', 'envMap', 'lightMap', 'aoMap'
        ];

        textureProperties.forEach(prop => {
            if (material[prop] && material[prop].isTexture) {
                textureSet.add(material[prop].uuid);
            }
        });
    }

    /**
     * Estimate geometry memory usage
     */
    estimateGeometryMemory(geometry) {
        let memory = 0;
        
        // Estimate attribute memory
        Object.values(geometry.attributes).forEach(attribute => {
            memory += attribute.array.byteLength;
        });
        
        // Estimate index memory
        if (geometry.index) {
            memory += geometry.index.array.byteLength;
        }
        
        return memory;
    }

    /**
     * Update statistics display
     */
    updateStatisticsDisplay(stats) {
        // Update basic stats
        this.updateElement('vertexCountSidebar', stats.vertices.toLocaleString());
        this.updateElement('faceCountSidebar', stats.faces.toLocaleString());
        this.updateElement('materialCountSidebar', stats.materialCount);
        this.updateElement('textureCountSidebar', stats.textureCount);
        this.updateElement('animationCountSidebar', stats.animations);
        
        // Update bounding box
        if (stats.boundingBox) {
            const size = stats.boundingBox.size;
            const sizeStr = `${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)}`;
            this.updateElement('boundingBoxSidebar', sizeStr);
        }
        
        // Update memory usage
        const memoryMB = (stats.memoryUsage / (1024 * 1024)).toFixed(2);
        this.updateElement('memoryUsageSidebar', `${memoryMB} MB`);
        
        // Update draw calls
        this.updateElement('drawCallsSidebar', stats.drawCalls);
    }

    /**
     * Update element text content safely
     */
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    /**
     * Set measurement mode
     */
    setMeasurementMode(mode) {
        // Clear previous mode
        this.clearMeasurementMode();
        
        this.measurementMode = mode;
        this.measurementPoints = [];
        
        // Update UI
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === mode);
        });
        
        // Update instructions
        const instructions = this.getMeasurementInstructions(mode);
        const resultsDiv = document.getElementById('measurementResults');
        if (resultsDiv) {
            resultsDiv.innerHTML = `<div class="measurement-instructions">${instructions}</div>`;
        }
    }

    /**
     * Get measurement instructions for mode
     */
    getMeasurementInstructions(mode) {
        switch (mode) {
            case 'distance':
                return 'Click on two points to measure distance.';
            case 'angle':
                return 'Click on three points to measure angle (vertex in middle).';
            case 'area':
                return 'Click on multiple points to define an area (double-click to finish).';
            default:
                return 'Select a measurement tool to begin.';
        }
    }

    /**
     * Clear measurement mode
     */
    clearMeasurementMode() {
        this.measurementMode = 'none';
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.classList.remove('active');
        });
    }

    /**
     * Handle viewport click for measurements
     */
    onViewportClick(event) {
        if (this.measurementMode === 'none' || !this.core.getState().currentModel) {
            return;
        }

        const intersection = this.getIntersection(event);
        if (intersection) {
            this.addMeasurementPoint(intersection.point);
        }
    }

    /**
     * Get intersection point from mouse event
     */
    getIntersection(event) {
        const container = document.getElementById('viewerContainer');
        const rect = container.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(mouse, this.renderingEngine.camera);
        const intersects = this.raycaster.intersectObject(this.core.getState().currentModel, true);

        return intersects.length > 0 ? intersects[0] : null;
    }

    /**
     * Add measurement point
     */
    addMeasurementPoint(point) {
        this.measurementPoints.push(point);
        this.createMeasurementMarker(point);
        
        switch (this.measurementMode) {
            case 'distance':
                if (this.measurementPoints.length === 2) {
                    this.calculateDistance();
                    this.clearMeasurementMode();
                }
                break;
            case 'angle':
                if (this.measurementPoints.length === 3) {
                    this.calculateAngle();
                    this.clearMeasurementMode();
                }
                break;
            case 'area':
                // Area calculation continues until double-click or explicit finish
                this.updateAreaCalculation();
                break;
        }
    }

    /**
     * Create measurement marker
     */
    createMeasurementMarker(point) {
        const marker = new THREE.Mesh(
            new THREE.SphereGeometry(0.015, 16, 16),
            new THREE.MeshBasicMaterial({ 
                color: 0x6366f1,
                transparent: true,
                opacity: 0.8,
                depthTest: false
            })
        );
        
        // Add a secondary glow sphere
        const glow = new THREE.Mesh(
            new THREE.SphereGeometry(0.03, 16, 16),
            new THREE.MeshBasicMaterial({ 
                color: 0x6366f1,
                transparent: true,
                opacity: 0.2,
                depthTest: false
            })
        );
        marker.add(glow);
        
        marker.position.copy(point);
        marker.renderOrder = 999;
        
        this.renderingEngine.scene.add(marker);
        this.measurementMarkers.push(marker);
    }

    /**
     * Calculate distance between two points
     */
    calculateDistance() {
        if (this.measurementPoints.length < 2) return;
        
        const point1 = this.measurementPoints[0];
        const point2 = this.measurementPoints[1];
        const distance = point1.distanceTo(point2);
        const formatted = this.formatDistance(distance);
        
        // Create line
        this.createMeasurementLine([point1, point2]);
        
        // Create label in the middle
        const midPoint = new THREE.Vector3().lerpVectors(point1, point2, 0.5);
        this.createMeasurementLabel(formatted, midPoint);
        
        // Display result
        this.displayMeasurementResult('Distance', formatted);
    }

    /**
     * Calculate angle between three points
     */
    calculateAngle() {
        if (this.measurementPoints.length < 3) return;
        
        const point1 = this.measurementPoints[0];
        const vertex = this.measurementPoints[1];
        const point2 = this.measurementPoints[2];
        
        // Calculate vectors
        const vector1 = new THREE.Vector3().subVectors(point1, vertex).normalize();
        const vector2 = new THREE.Vector3().subVectors(point2, vertex).normalize();
        
        // Calculate angle
        const angle = Math.acos(vector1.dot(vector2));
        const angleDegrees = THREE.MathUtils.radToDeg(angle);
        
        // Create lines
        this.createMeasurementLine([point1, vertex]);
        this.createMeasurementLine([vertex, point2]);
        
        // Display result
        this.displayMeasurementResult('Angle', `${angleDegrees.toFixed(2)}°`);
    }

    /**
     * Update area calculation
     */
    updateAreaCalculation() {
        if (this.measurementPoints.length < 3) return;
        
        // Create polygon outline
        this.createMeasurementLine(this.measurementPoints, true);
        
        // Calculate area using shoelace formula (for 2D projection)
        const area = this.calculatePolygonArea(this.measurementPoints);
        this.displayMeasurementResult('Area', this.formatArea(area));
    }

    /**
     * Calculate polygon area
     */
    calculatePolygonArea(points) {
        if (points.length < 3) return 0;
        
        // Project points to best-fit plane
        const projectedPoints = this.projectPointsToPlane(points);
        
        // Use shoelace formula
        let area = 0;
        for (let i = 0; i < projectedPoints.length; i++) {
            const j = (i + 1) % projectedPoints.length;
            area += projectedPoints[i].x * projectedPoints[j].y;
            area -= projectedPoints[j].x * projectedPoints[i].y;
        }
        
        return Math.abs(area) / 2;
    }

    /**
     * Project points to best-fit plane
     */
    projectPointsToPlane(points) {
        // For simplicity, project to XY plane
        // In a full implementation, you'd calculate the best-fit plane
        return points.map(p => new THREE.Vector2(p.x, p.y));
    }

    /**
     * Create measurement line
     */
    createMeasurementLine(points, closed = false) {
        const linePoints = closed ? [...points, points[0]] : points;
        const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
        const material = new THREE.LineBasicMaterial({ 
            color: 0xff4444,
            linewidth: 2
        });
        
        const line = new THREE.Line(geometry, material);
        this.renderingEngine.scene.add(line);
        this.measurementLines.push(line);
    }

    /**
     * Display measurement result
     */
    displayMeasurementResult(type, value) {
        const resultsDiv = document.getElementById('measurementResults');
        if (!resultsDiv) return;
        
        const resultElement = document.createElement('div');
        resultElement.className = 'measurement-result';
        resultElement.innerHTML = `
            <div class="result-header">
                <span class="result-type">${type}</span>
                <button class="remove-result" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
            <div class="result-value">${value}</div>
        `;
        
        resultsDiv.appendChild(resultElement);
    }

    /**
     * Format distance with units
     */
    formatDistance(distance) {
        const units = document.getElementById('measurementUnits')?.value || 'meters';
        const conversions = {
            meters: 1,
            centimeters: 100,
            millimeters: 1000,
            inches: 39.3701,
            feet: 3.28084
        };
        
        const converted = distance * conversions[units];
        return `${converted.toFixed(3)} ${units}`;
    }

    /**
     * Format area with units
     */
    formatArea(area) {
        const units = document.getElementById('measurementUnits')?.value || 'meters';
        const conversions = {
            meters: 1,
            centimeters: 10000,
            millimeters: 1000000,
            inches: 1550.0031,
            feet: 10.7639
        };
        
        const converted = area * conversions[units];
        const unitLabel = units === 'feet' ? 'sq ft' : `sq ${units}`;
        return `${converted.toFixed(3)} ${unitLabel}`;
    }

    /**
     * Clear all measurements
     */
    clearAllMeasurements() {
        // Remove markers
        this.measurementMarkers.forEach(marker => {
            this.renderingEngine.scene.remove(marker);
        });
        this.measurementMarkers = [];
        
        // Remove lines
        this.measurementLines.forEach(line => {
            this.renderingEngine.scene.remove(line);
        });
        this.measurementLines = [];
        
        // Clear points
        this.measurementPoints = [];
        
        // Clear results
        const resultsDiv = document.getElementById('measurementResults');
        if (resultsDiv) {
            resultsDiv.innerHTML = '<div class="measurement-instructions">Select a measurement tool and click on the model to start measuring.</div>';
        }
        
        // Clear mode
        this.clearMeasurementMode();
    }

    /**
     * Toggle measurement labels
     */
    toggleMeasurementLabels(show) {
        this.measurementLabels.forEach(label => {
            label.visible = show;
        });
    }

    /**
     * Create a 3D label for measurements
     */
    createMeasurementLabel(text, position) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 64;
        
        context.fillStyle = 'rgba(15, 23, 42, 0.85)';
        context.roundRect(0, 0, 256, 64, 12);
        context.fill();
        
        context.strokeStyle = '#6366f1';
        context.lineWidth = 4;
        context.roundRect(2, 2, 252, 60, 10);
        context.stroke();
        
        context.fillStyle = '#ffffff';
        context.font = 'bold 24px Outfit, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, 128, 32);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            depthTest: false
        });
        
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.position.copy(position);
        sprite.position.y += 0.1; // Offset above the point
        sprite.scale.set(0.2, 0.05, 1);
        sprite.renderOrder = 1000;
        
        this.renderingEngine.scene.add(sprite);
        this.measurementLabels.push(sprite);
        return sprite;
    }

    /**
     * Update measurement displays when units change
     */
    updateMeasurementDisplays() {
        // Re-calculate and update all existing measurements
        const results = document.querySelectorAll('.measurement-result');
        results.forEach(result => {
            // This would need to store the original values to recalculate
            // For now, just notify user to re-measure
        });
    }

    /**
     * Initialize material inspector
     */
    initializeMaterialInspector() {
        this.materialInspector = {
            currentMaterial: null,
            materials: new Map()
        };
    }

    /**
     * Update material inspector with model materials
     */
    updateMaterialInspector(model) {
        const materials = new Map();
        let materialIndex = 0;
        
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((mat, idx) => {
                        const key = `${materialIndex}_${idx}`;
                        materials.set(key, {
                            material: mat,
                            name: mat.name || `Material ${materialIndex}_${idx}`,
                            mesh: child
                        });
                    });
                } else {
                    const key = `${materialIndex}`;
                    materials.set(key, {
                        material: child.material,
                        name: child.material.name || `Material ${materialIndex}`,
                        mesh: child
                    });
                }
                materialIndex++;
            }
        });
        
        this.materialInspector.materials = materials;
        this.populateMaterialSelect();
    }

    /**
     * Populate material selection dropdown
     */
    populateMaterialSelect() {
        const accordion = document.getElementById('sidebarAccordion');
        if (!accordion) return;
        
        const select = document.getElementById('materialSelect');
        select.innerHTML = '<option value="">Select a material...</option>';
        
        this.materialInspector.materials.forEach((matInfo, key) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = matInfo.name;
            select.appendChild(option);
        });
    }

    /**
     * Inspect specific material
     */
    inspectMaterial(materialKey) {
        if (!materialKey || !this.materialInspector.materials.has(materialKey)) {
            this.clearMaterialInspection();
            return;
        }
        
        const matInfo = this.materialInspector.materials.get(materialKey);
        this.materialInspector.currentMaterial = matInfo;
        this.displayMaterialProperties(matInfo.material);
    }

    /**
     * Display material properties
     */
    displayMaterialProperties(material) {
        const propertiesDiv = document.getElementById('materialProperties');
        if (!propertiesDiv) return;
        
        const properties = this.extractMaterialProperties(material);
        
        propertiesDiv.innerHTML = `
            <div class="material-info">
                <h4>${material.name || 'Unnamed Material'}</h4>
                <div class="material-type">${material.type}</div>
            </div>
            
            <div class="property-grid">
                ${properties.map(prop => `
                    <div class="property-item">
                        <span class="property-label">${prop.label}:</span>
                        <span class="property-value">${prop.value}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="material-textures">
                <h5>Textures</h5>
                ${this.getMaterialTextures(material)}
            </div>
        `;
        
        // Enable action buttons
        document.getElementById('exportMaterial').disabled = false;
        document.getElementById('replaceMaterial').disabled = false;
    }

    /**
     * Extract material properties
     */
    extractMaterialProperties(material) {
        const properties = [];
        
        // Common properties
        if (material.color) {
            properties.push({
                label: 'Color',
                value: `#${material.color.getHexString()}`
            });
        }
        
        if (material.opacity !== undefined) {
            properties.push({
                label: 'Opacity',
                value: material.opacity.toFixed(2)
            });
        }
        
        if (material.transparent !== undefined) {
            properties.push({
                label: 'Transparent',
                value: material.transparent ? 'Yes' : 'No'
            });
        }
        
        // PBR properties
        if (material.metalness !== undefined) {
            properties.push({
                label: 'Metalness',
                value: material.metalness.toFixed(2)
            });
        }
        
        if (material.roughness !== undefined) {
            properties.push({
                label: 'Roughness',
                value: material.roughness.toFixed(2)
            });
        }
        
        if (material.emissive) {
            properties.push({
                label: 'Emissive',
                value: `#${material.emissive.getHexString()}`
            });
        }
        
        return properties;
    }

    /**
     * Get material textures HTML
     */
    getMaterialTextures(material) {
        const textureProperties = [
            { key: 'map', label: 'Diffuse' },
            { key: 'normalMap', label: 'Normal' },
            { key: 'roughnessMap', label: 'Roughness' },
            { key: 'metalnessMap', label: 'Metalness' },
            { key: 'emissiveMap', label: 'Emissive' },
            { key: 'bumpMap', label: 'Bump' },
            { key: 'displacementMap', label: 'Displacement' },
            { key: 'alphaMap', label: 'Alpha' },
            { key: 'aoMap', label: 'AO' }
        ];
        
        const textures = textureProperties
            .filter(prop => material[prop.key])
            .map(prop => {
                const texture = material[prop.key];
                return `
                    <div class="texture-item">
                        <span class="texture-label">${prop.label}:</span>
                        <span class="texture-info">
                            ${texture.image ? `${texture.image.width}×${texture.image.height}` : 'Loaded'}
                        </span>
                    </div>
                `;
            });
        
        return textures.length > 0 ? textures.join('') : '<div class="no-textures">No textures</div>';
    }

    /**
     * Clear material inspection
     */
    clearMaterialInspection() {
        const propertiesDiv = document.getElementById('materialProperties');
        if (propertiesDiv) {
            propertiesDiv.innerHTML = '<div class="no-material">Load a model to inspect materials.</div>';
        }
        
        document.getElementById('exportMaterial').disabled = true;
        document.getElementById('replaceMaterial').disabled = true;
    }

    /**
     * Setup presentation cameras
     */
    setupPresentationCameras() {
        this.presentationCameras = [
            { name: 'Front', position: [0, 0, 5], target: [0, 0, 0] },
            { name: 'Back', position: [0, 0, -5], target: [0, 0, 0] },
            { name: 'Left', position: [-5, 0, 0], target: [0, 0, 0] },
            { name: 'Right', position: [5, 0, 0], target: [0, 0, 0] },
            { name: 'Top', position: [0, 5, 0], target: [0, 0, 0] },
            { name: 'Bottom', position: [0, -5, 0], target: [0, 0, 0] },
            { name: 'Isometric', position: [3, 3, 3], target: [0, 0, 0] }
        ];
    }

    /**
     * Enter presentation mode
     */
    enterPresentationMode() {
        this.presentationMode = true;
        this.currentPresentationView = 0;
        
        // Hide UI elements
        document.body.classList.add('presentation-mode');
        
        // Create HUD
        this.createPresentationHUD();
        
        // Apply first camera preset
        this.applyCameraPreset('front');
        
        this.core.emit('analysis:presentation:entered');
    }

    /**
     * Create floating HUD for presentation mode
     */
    createPresentationHUD() {
        if (document.querySelector('.presentation-hud')) return;

        const hud = document.createElement('div');
        hud.className = 'presentation-hud';
        hud.innerHTML = `
            <div class="hud-group">
                <button id="hudPrev" class="hud-btn" title="Previous View">
                    <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                </button>
                <div id="hudCounter" class="hud-counter">1 / ${this.presentationCameras.length}</div>
                <button id="hudNext" class="hud-btn" title="Next View">
                    <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                </button>
            </div>
            <div class="hud-group" style="padding-left: 1rem; border-left: 1px solid rgba(255,255,255,0.1)">
                <button class="hud-btn" data-preset="front" title="Front View">F</button>
                <button class="hud-btn" data-preset="top" title="Top View">T</button>
                <button class="hud-btn" data-preset="isometric" title="Isometric View">I</button>
            </div>
            <button id="hudExit" class="hud-exit">Exit Presentation</button>
        `;

        document.body.appendChild(hud);

        // Bind HUD events
        document.getElementById('hudPrev').addEventListener('click', () => this.previousPresentationView());
        document.getElementById('hudNext').addEventListener('click', () => this.nextPresentationView());
        document.getElementById('hudExit').addEventListener('click', () => this.exitPresentationMode());
        
        hud.querySelectorAll('.hud-btn[data-preset]').forEach(btn => {
            btn.addEventListener('click', () => this.applyCameraPreset(btn.dataset.preset));
        });
    }

    /**
     * Exit presentation mode
     */
    exitPresentationMode() {
        this.presentationMode = false;
        
        // Show UI elements
        document.body.classList.remove('presentation-mode');
        
        // Remove HUD
        const hud = document.querySelector('.presentation-hud');
        if (hud) hud.remove();
        
        // Restore sidebar controls state
        const enterBtn = document.getElementById('enterPresentation');
        const controls = document.getElementById('presentationControls');
        if (enterBtn) enterBtn.style.display = 'block';
        if (controls) controls.style.display = 'none';
        
        this.core.emit('analysis:presentation:exited');
    }

    /**
     * Apply camera preset
     */
    applyCameraPreset(preset) {
        const camera = this.presentationCameras.find(cam => 
            cam.name.toLowerCase() === preset.toLowerCase()
        );
        
        if (!camera) return;
        
        const model = this.core.getState().currentModel;
        if (!model) return;
        
        // Calculate model bounds
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // Position camera relative to model
        const distance = maxDim * 2;
        const position = new THREE.Vector3(...camera.position).normalize().multiplyScalar(distance);
        position.add(center);
        
        // Animate camera to position
        this.animateCameraTo(position, center);
    }

    /**
     * Apply lighting preset
     */
    applyLightingPreset(preset) {
        const renderingEngine = this.renderingEngine;
        if (!renderingEngine) return;
        
        switch (preset) {
            case 'studio':
                renderingEngine.lights.ambient.intensity = 0.4;
                renderingEngine.lights.directional.intensity = 1.0;
                renderingEngine.lights.directional.position.set(2, 4, 2);
                break;
            case 'outdoor':
                renderingEngine.lights.ambient.intensity = 0.6;
                renderingEngine.lights.directional.intensity = 0.8;
                renderingEngine.lights.directional.position.set(-1, 3, 1);
                break;
            case 'dramatic':
                renderingEngine.lights.ambient.intensity = 0.1;
                renderingEngine.lights.directional.intensity = 1.5;
                renderingEngine.lights.directional.position.set(3, 1, -2);
                break;
            case 'soft':
                renderingEngine.lights.ambient.intensity = 0.8;
                renderingEngine.lights.directional.intensity = 0.3;
                renderingEngine.lights.directional.position.set(0, 2, 1);
                break;
        }
    }

    /**
     * Navigate to previous presentation view
     */
    previousPresentationView() {
        this.currentPresentationView = Math.max(0, this.currentPresentationView - 1);
        this.updatePresentationView();
    }

    /**
     * Navigate to next presentation view
     */
    nextPresentationView() {
        this.currentPresentationView = Math.min(
            this.presentationCameras.length - 1, 
            this.currentPresentationView + 1
        );
        this.updatePresentationView();
    }

    /**
     * Update presentation view
     */
    updatePresentationView() {
        const camera = this.presentationCameras[this.currentPresentationView];
        if (camera) {
            this.applyCameraPreset(camera.name.toLowerCase());
        }
        
        // Update counter
        const counter = document.getElementById('viewCounter');
        if (counter) {
            counter.textContent = `${this.currentPresentationView + 1} / ${this.presentationCameras.length}`;
        }

        const hudCounter = document.getElementById('hudCounter');
        if (hudCounter) {
            hudCounter.textContent = `${this.currentPresentationView + 1} / ${this.presentationCameras.length}`;
        }
    }

    /**
     * Animate camera to position
     */
    animateCameraTo(position, target) {
        const camera = this.renderingEngine.camera;
        const controls = this.renderingEngine.controls;
        
        const smoothTransitions = document.getElementById('smoothTransitions');
        const isSmooth = smoothTransitions ? smoothTransitions.checked : true;

        if (!isSmooth) {
            camera.position.copy(position);
            controls.target.copy(target);
            controls.update();
            return;
        }

        // Use simple lerp animation for camera and target
        const startPos = camera.position.clone();
        const startTarget = controls.target.clone();
        const duration = 1000;
        const startTime = performance.now();

        const animate = (time) => {
            if (!this.presentationMode && !this.isAnimating) return;
            
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out cubic)
            const ease = 1 - Math.pow(1 - progress, 3);
            
            camera.position.lerpVectors(startPos, position, ease);
            controls.target.lerpVectors(startTarget, target, ease);
            controls.update();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isAnimating = false;
            }
        };

        this.isAnimating = true;
        requestAnimationFrame(animate);
    }

    /**
     * Enable comparison mode
     */
    enableComparison() {
        this.comparisonActive = true;
        // Implementation for side-by-side comparison
        // This would involve creating split viewport or dual rendering
    }

    /**
     * Disable comparison mode
     */
    disableComparison() {
        this.comparisonActive = false;
        this.comparisonModels = [];
        // Reset to single model view
    }

    /**
     * Load comparison model
     */
    loadComparisonModel(slot) {
        // Create file input for loading comparison model
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.glb,.gltf,.fbx,.obj,.dae,.stl,.ply';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                // Load model for comparison
                this.loadModelForComparison(file, slot);
            }
        };
        
        input.click();
    }

    /**
     * Load model for comparison
     */
    async loadModelForComparison(file, slot) {
        try {
            const assetManager = this.core.getModule('assets');
            const model = await assetManager.loadModelFromFile(file);
            
            this.comparisonModels[slot === 'A' ? 0 : 1] = {
                model: model,
                name: file.name,
                stats: this.calculateModelStatistics(model)
            };
            
            this.updateComparisonDisplay(slot);
            
        } catch (error) {
            console.error('Error loading comparison model:', error);
        }
    }

    /**
     * Update comparison display
     */
    updateComparisonDisplay(slot) {
        const infoElement = document.getElementById(`model${slot}Info`);
        const modelData = this.comparisonModels[slot === 'A' ? 0 : 1];
        
        if (infoElement && modelData) {
            infoElement.innerHTML = `
                <div class="model-name">${modelData.name}</div>
                <div class="model-stats">
                    <div>Vertices: ${modelData.stats.vertices.toLocaleString()}</div>
                    <div>Faces: ${modelData.stats.faces.toLocaleString()}</div>
                    <div>Materials: ${modelData.stats.materialCount}</div>
                </div>
            `;
        }
        
        // Update comparison results if both models loaded
        if (this.comparisonModels[0] && this.comparisonModels[1]) {
            this.updateComparisonResults();
        }
    }

    /**
     * Update comparison results
     */
    updateComparisonResults() {
        const resultsDiv = document.getElementById('comparisonResults');
        if (!resultsDiv) return;
        
        const modelA = this.comparisonModels[0];
        const modelB = this.comparisonModels[1];
        
        const vertexDiff = modelB.stats.vertices - modelA.stats.vertices;
        const faceDiff = modelB.stats.faces - modelA.stats.faces;
        const materialDiff = modelB.stats.materialCount - modelA.stats.materialCount;
        
        resultsDiv.innerHTML = `
            <div class="comparison-stat">
                <span>Vertex Difference:</span>
                <span class="${vertexDiff >= 0 ? 'positive' : 'negative'}">
                    ${vertexDiff >= 0 ? '+' : ''}${vertexDiff.toLocaleString()}
                </span>
            </div>
            <div class="comparison-stat">
                <span>Face Difference:</span>
                <span class="${faceDiff >= 0 ? 'positive' : 'negative'}">
                    ${faceDiff >= 0 ? '+' : ''}${faceDiff.toLocaleString()}
                </span>
            </div>
            <div class="comparison-stat">
                <span>Material Difference:</span>
                <span class="${materialDiff >= 0 ? 'positive' : 'negative'}">
                    ${materialDiff >= 0 ? '+' : ''}${materialDiff}
                </span>
            </div>
        `;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.clearAllMeasurements();
        this.exitPresentationMode();
        this.disableComparison();
        this.initialized = false;
    }
}