/**
 * ExportPanel - UI component for the comprehensive export system
 */
export class ExportPanel {
    constructor(core) {
        this.core = core;
        this.exportSystem = core.getModule('export');
        this.isVisible = false;
        this.currentTab = 'single';
        
        this.createElement();
        this.setupEventListeners();
    }

    /**
     * Create the export panel UI
     */
    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'export-panel';
        this.element.innerHTML = `
            <div class="export-panel-header">
                <h3>Export Model</h3>
                <button class="close-btn" data-action="close">×</button>
            </div>
            
            <div class="export-tabs">
                <button class="tab-btn active" data-tab="single">Single Export</button>
                <button class="tab-btn" data-tab="batch">Batch Export</button>
                <button class="tab-btn" data-tab="screenshot">Screenshot</button>
            </div>
            
            <div class="export-content">
                <!-- Single Export Tab -->
                <div class="tab-content active" data-tab="single">
                    <div class="export-section">
                        <label>Export Format:</label>
                        <select class="format-select">
                            <option value="glb">GLB (Binary GLTF)</option>
                            <option value="gltf">GLTF (JSON)</option>
                            <option value="obj">OBJ (Wavefront)</option>
                            <option value="stl">STL (3D Printing)</option>
                            <option value="ply">PLY (Polygon)</option>
                            <option value="dae">DAE (Collada)</option>
                            <option value="fbx">FBX (Autodesk)</option>
                            <option value="usd">USD (Universal Scene)</option>
                            <option value="x3d">X3D (Web3D)</option>
                        </select>
                    </div>
                    
                    <div class="export-section">
                        <label>Preset:</label>
                        <select class="preset-select">
                            <option value="">Custom Settings</option>
                            <option value="unity">Unity Engine</option>
                            <option value="unreal">Unreal Engine</option>
                            <option value="blender">Blender</option>
                            <option value="web">Web Deployment</option>
                            <option value="3d-printing">3D Printing</option>
                            <option value="cad">CAD Software</option>
                            <option value="archive">Archive/Backup</option>
                        </select>
                    </div>
                    
                    <div class="export-section">
                        <label>Filename:</label>
                        <input type="text" class="filename-input" placeholder="model" />
                    </div>
                    
                    <div class="export-options">
                        <div class="option-group">
                            <h4>Export Options</h4>
                            <label class="checkbox-label">
                                <input type="checkbox" class="embed-images" checked />
                                Embed Images
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" class="include-animations" checked />
                                Include Animations
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" class="include-materials" checked />
                                Include Materials
                            </label>
                        </div>
                        
                        <div class="option-group">
                            <h4>Optimization</h4>
                            <label class="checkbox-label">
                                <input type="checkbox" class="optimize-model" />
                                Optimize Model
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" class="merge-vertices" />
                                Merge Vertices
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" class="compress-textures" />
                                Compress Textures
                            </label>
                        </div>
                        
                        <div class="option-group">
                            <h4>Validation</h4>
                            <label class="checkbox-label">
                                <input type="checkbox" class="validate-model" />
                                Validate Model
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" class="strict-validation" />
                                Strict Validation
                            </label>
                        </div>
                    </div>
                    
                    <div class="export-actions">
                        <button class="export-btn primary">Export Model</button>
                        <button class="preview-btn">Preview Export</button>
                    </div>
                </div>
                
                <!-- Batch Export Tab -->
                <div class="tab-content" data-tab="batch">
                    <div class="batch-info">
                        <p>Export multiple models with the same settings</p>
                    </div>
                    
                    <div class="model-list">
                        <h4>Models to Export:</h4>
                        <div class="model-items">
                            <!-- Dynamically populated -->
                        </div>
                        <button class="add-models-btn">Add Models</button>
                    </div>
                    
                    <div class="batch-settings">
                        <div class="export-section">
                            <label>Format:</label>
                            <select class="batch-format-select">
                                <option value="glb">GLB</option>
                                <option value="gltf">GLTF</option>
                                <option value="obj">OBJ</option>
                                <option value="stl">STL</option>
                            </select>
                        </div>
                        
                        <div class="export-section">
                            <label>Filename Template:</label>
                            <input type="text" class="filename-template" placeholder="{name}_{index}" />
                            <small>Use {name} for model name, {index} for number</small>
                        </div>
                    </div>
                    
                    <div class="batch-progress" style="display: none;">
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                        <div class="progress-text">0 / 0 models exported</div>
                    </div>
                    
                    <div class="export-actions">
                        <button class="batch-export-btn primary">Export All</button>
                        <button class="cancel-batch-btn" style="display: none;">Cancel</button>
                    </div>
                </div>
                
                <!-- Screenshot Tab -->
                <div class="tab-content" data-tab="screenshot">
                    <div class="screenshot-options">
                        <div class="export-section">
                            <label>Resolution:</label>
                            <select class="resolution-select">
                                <option value="current">Current View</option>
                                <option value="1920x1080">1920×1080 (Full HD)</option>
                                <option value="2560x1440">2560×1440 (2K)</option>
                                <option value="3840x2160">3840×2160 (4K)</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>
                        
                        <div class="custom-resolution" style="display: none;">
                            <div class="resolution-inputs">
                                <input type="number" class="width-input" placeholder="Width" min="100" max="7680" />
                                <span>×</span>
                                <input type="number" class="height-input" placeholder="Height" min="100" max="4320" />
                            </div>
                        </div>
                        
                        <div class="export-section">
                            <label>Format:</label>
                            <select class="image-format-select">
                                <option value="png">PNG (Lossless)</option>
                                <option value="jpeg">JPEG (Compressed)</option>
                                <option value="webp">WebP (Modern)</option>
                            </select>
                        </div>
                        
                        <div class="export-section">
                            <label>Quality:</label>
                            <input type="range" class="quality-slider" min="0.1" max="1" step="0.1" value="1" />
                            <span class="quality-value">100%</span>
                        </div>
                        
                        <div class="screenshot-settings">
                            <label class="checkbox-label">
                                <input type="checkbox" class="transparent-bg" />
                                Transparent Background
                            </label>
                            <label class="checkbox-label">
                                <input type="checkbox" class="high-dpi" />
                                High DPI (2x Scale)
                            </label>
                        </div>
                    </div>
                    
                    <div class="export-actions">
                        <button class="screenshot-btn primary">Take Screenshot</button>
                        <button class="preview-screenshot-btn">Preview</button>
                    </div>
                </div>
            </div>
            
            <div class="export-status" style="display: none;">
                <div class="status-message"></div>
                <div class="status-progress">
                    <div class="spinner"></div>
                </div>
            </div>
        `;
        
        // Add styles
        this.addStyles();
    }

    /**
     * Add CSS styles for the export panel
     */
    addStyles() {
        if (document.getElementById('export-panel-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'export-panel-styles';
        style.textContent = `
            .export-panel {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 600px;
                max-width: 90vw;
                max-height: 80vh;
                background: var(--bg-primary, #1a1a1a);
                border: 1px solid var(--border-color, #333);
                border-radius: 8px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                z-index: 1000;
                overflow: hidden;
                display: none;
            }
            
            .export-panel.visible {
                display: block;
            }
            
            .export-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                background: var(--bg-secondary, #2a2a2a);
                border-bottom: 1px solid var(--border-color, #333);
            }
            
            .export-panel-header h3 {
                margin: 0;
                color: var(--text-primary, #fff);
                font-size: 18px;
            }
            
            .close-btn {
                background: none;
                border: none;
                color: var(--text-secondary, #ccc);
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
            }
            
            .close-btn:hover {
                background: var(--bg-hover, #444);
                color: var(--text-primary, #fff);
            }
            
            .export-tabs {
                display: flex;
                background: var(--bg-secondary, #2a2a2a);
                border-bottom: 1px solid var(--border-color, #333);
            }
            
            .tab-btn {
                flex: 1;
                padding: 12px 16px;
                background: none;
                border: none;
                color: var(--text-secondary, #ccc);
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .tab-btn:hover {
                background: var(--bg-hover, #444);
                color: var(--text-primary, #fff);
            }
            
            .tab-btn.active {
                background: var(--bg-primary, #1a1a1a);
                color: var(--accent-color, #4CAF50);
                border-bottom: 2px solid var(--accent-color, #4CAF50);
            }
            
            .export-content {
                padding: 20px;
                max-height: 60vh;
                overflow-y: auto;
            }
            
            .tab-content {
                display: none;
            }
            
            .tab-content.active {
                display: block;
            }
            
            .export-section {
                margin-bottom: 16px;
            }
            
            .export-section label {
                display: block;
                margin-bottom: 6px;
                color: var(--text-primary, #fff);
                font-weight: 500;
            }
            
            .export-section select,
            .export-section input[type="text"],
            .export-section input[type="number"] {
                width: 100%;
                padding: 8px 12px;
                background: var(--bg-secondary, #2a2a2a);
                border: 1px solid var(--border-color, #333);
                border-radius: 4px;
                color: var(--text-primary, #fff);
                font-size: 14px;
            }
            
            .export-options {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                gap: 20px;
                margin: 20px 0;
            }
            
            .option-group h4 {
                margin: 0 0 12px 0;
                color: var(--text-primary, #fff);
                font-size: 14px;
                font-weight: 600;
            }
            
            .checkbox-label {
                display: flex !important;
                align-items: center;
                margin-bottom: 8px !important;
                cursor: pointer;
                font-weight: normal !important;
            }
            
            .checkbox-label input[type="checkbox"] {
                width: auto !important;
                margin-right: 8px;
                margin-bottom: 0 !important;
            }
            
            .export-actions {
                display: flex;
                gap: 12px;
                margin-top: 24px;
                padding-top: 20px;
                border-top: 1px solid var(--border-color, #333);
            }
            
            .export-actions button {
                padding: 10px 20px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s ease;
            }
            
            .export-actions button.primary {
                background: var(--accent-color, #4CAF50);
                color: white;
            }
            
            .export-actions button.primary:hover {
                background: var(--accent-hover, #45a049);
            }
            
            .export-actions button:not(.primary) {
                background: var(--bg-secondary, #2a2a2a);
                color: var(--text-primary, #fff);
                border: 1px solid var(--border-color, #333);
            }
            
            .export-actions button:not(.primary):hover {
                background: var(--bg-hover, #444);
            }
            
            .batch-progress {
                margin: 20px 0;
            }
            
            .progress-bar {
                width: 100%;
                height: 8px;
                background: var(--bg-secondary, #2a2a2a);
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 8px;
            }
            
            .progress-fill {
                height: 100%;
                background: var(--accent-color, #4CAF50);
                width: 0%;
                transition: width 0.3s ease;
            }
            
            .progress-text {
                text-align: center;
                color: var(--text-secondary, #ccc);
                font-size: 14px;
            }
            
            .resolution-inputs {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            
            .resolution-inputs input {
                flex: 1;
            }
            
            .resolution-inputs span {
                color: var(--text-secondary, #ccc);
            }
            
            .quality-slider {
                width: calc(100% - 60px);
                margin-right: 12px;
            }
            
            .quality-value {
                color: var(--text-secondary, #ccc);
                font-size: 14px;
                min-width: 48px;
            }
            
            .export-status {
                padding: 20px;
                text-align: center;
                border-top: 1px solid var(--border-color, #333);
            }
            
            .status-message {
                color: var(--text-primary, #fff);
                margin-bottom: 12px;
            }
            
            .spinner {
                width: 24px;
                height: 24px;
                border: 2px solid var(--border-color, #333);
                border-top: 2px solid var(--accent-color, #4CAF50);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .model-items {
                max-height: 200px;
                overflow-y: auto;
                border: 1px solid var(--border-color, #333);
                border-radius: 4px;
                margin-bottom: 12px;
            }
            
            .model-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                border-bottom: 1px solid var(--border-color, #333);
            }
            
            .model-item:last-child {
                border-bottom: none;
            }
            
            .model-name {
                color: var(--text-primary, #fff);
            }
            
            .remove-model {
                background: none;
                border: none;
                color: var(--text-danger, #f44336);
                cursor: pointer;
                padding: 4px;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tab switching
        this.element.addEventListener('click', (e) => {
            if (e.target.matches('.tab-btn')) {
                this.switchTab(e.target.dataset.tab);
            }
            
            if (e.target.matches('[data-action="close"]')) {
                this.hide();
            }
            
            if (e.target.matches('.export-btn')) {
                this.handleSingleExport();
            }
            
            if (e.target.matches('.batch-export-btn')) {
                this.handleBatchExport();
            }
            
            if (e.target.matches('.screenshot-btn')) {
                this.handleScreenshot();
            }
        });

        // Preset selection
        this.element.querySelector('.preset-select').addEventListener('change', (e) => {
            this.applyPreset(e.target.value);
        });

        // Format selection
        this.element.querySelector('.format-select').addEventListener('change', (e) => {
            this.updateFormatOptions(e.target.value);
        });

        // Resolution selection
        this.element.querySelector('.resolution-select').addEventListener('change', (e) => {
            this.toggleCustomResolution(e.target.value === 'custom');
        });

        // Quality slider
        this.element.querySelector('.quality-slider').addEventListener('input', (e) => {
            this.updateQualityDisplay(e.target.value);
        });

        // Export system events
        this.core.on('export:batch:progress', (data) => {
            this.updateBatchProgress(data);
        });

        this.core.on('export:complete', (data) => {
            this.showSuccess(`Export completed: ${data.filename}`);
        });

        this.core.on('export:error', (data) => {
            // Silent error - no user message, just console logging
            console.error('Export failed:', data.error.message);
        });
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        // Update tab buttons
        this.element.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        this.element.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.dataset.tab === tabName);
        });

        this.currentTab = tabName;
    }

    /**
     * Apply export preset
     */
    applyPreset(presetName) {
        if (!presetName) return;

        const presets = this.exportSystem.getAvailablePresets();
        const preset = presets.find(p => p.name === presetName);
        
        if (preset) {
            // Update format
            this.element.querySelector('.format-select').value = preset.format;
            
            // Update options based on preset
            const options = preset.options;
            this.element.querySelector('.embed-images').checked = options.embedImages !== false;
            this.element.querySelector('.include-animations').checked = options.animations !== false;
            this.element.querySelector('.include-materials').checked = options.materials !== false;
        }
    }

    /**
     * Update format-specific options
     */
    updateFormatOptions(format) {
        const embedImagesOption = this.element.querySelector('.embed-images').closest('.checkbox-label');
        const animationsOption = this.element.querySelector('.include-animations').closest('.checkbox-label');
        
        // Show/hide options based on format capabilities
        switch (format) {
            case 'stl':
            case 'ply':
                embedImagesOption.style.display = 'none';
                animationsOption.style.display = 'none';
                break;
            case 'obj':
                animationsOption.style.display = 'none';
                break;
            default:
                embedImagesOption.style.display = 'flex';
                animationsOption.style.display = 'flex';
        }
    }

    /**
     * Handle single model export
     */
    async handleSingleExport() {
        const format = this.element.querySelector('.format-select').value;
        const filename = this.element.querySelector('.filename-input').value || 'model';
        
        const options = {
            filename: `${filename}.${format}`,
            embedImages: this.element.querySelector('.embed-images').checked,
            animations: this.element.querySelector('.include-animations').checked,
            materials: this.element.querySelector('.include-materials').checked,
            optimize: this.element.querySelector('.optimize-model').checked,
            mergeVertices: this.element.querySelector('.merge-vertices').checked,
            compressTextures: this.element.querySelector('.compress-textures').checked,
            validate: this.element.querySelector('.validate-model').checked,
            strictValidation: this.element.querySelector('.strict-validation').checked
        };

        try {
            this.showStatus('Exporting model...');
            await this.exportSystem.exportModel(format, options);
            this.hideStatus();
        } catch (error) {
            // Silent error - no user message, just console logging
            console.error('Export failed:', error.message);
        }
    }

    /**
     * Handle batch export
     */
    async handleBatchExport() {
        // Implementation would depend on how models are selected
        // Silent - batch export not implemented
    }

    /**
     * Handle screenshot export
     */
    async handleScreenshot() {
        const resolution = this.element.querySelector('.resolution-select').value;
        const format = this.element.querySelector('.image-format-select').value;
        const quality = parseFloat(this.element.querySelector('.quality-slider').value);
        
        let width, height;
        
        if (resolution === 'current') {
            width = window.innerWidth;
            height = window.innerHeight;
        } else if (resolution === 'custom') {
            width = parseInt(this.element.querySelector('.width-input').value) || 1920;
            height = parseInt(this.element.querySelector('.height-input').value) || 1080;
        } else {
            [width, height] = resolution.split('x').map(Number);
        }

        const options = {
            width,
            height,
            format,
            quality,
            transparent: this.element.querySelector('.transparent-bg').checked,
            scale: this.element.querySelector('.high-dpi').checked ? 2 : 1
        };

        try {
            this.showStatus('Taking screenshot...');
            await this.exportSystem.exportScreenshot(options);
            this.hideStatus();
        } catch (error) {
            // Silent error - no user message, just console logging
            console.error('Screenshot failed:', error.message);
        }
    }

    /**
     * Toggle custom resolution inputs
     */
    toggleCustomResolution(show) {
        const customDiv = this.element.querySelector('.custom-resolution');
        customDiv.style.display = show ? 'block' : 'none';
    }

    /**
     * Update quality display
     */
    updateQualityDisplay(value) {
        const percentage = Math.round(value * 100);
        this.element.querySelector('.quality-value').textContent = `${percentage}%`;
    }

    /**
     * Update batch progress
     */
    updateBatchProgress(data) {
        const progressDiv = this.element.querySelector('.batch-progress');
        const progressFill = this.element.querySelector('.progress-fill');
        const progressText = this.element.querySelector('.progress-text');
        
        progressDiv.style.display = 'block';
        progressFill.style.width = `${data.percentage}%`;
        progressText.textContent = `${data.current} / ${data.total} models exported`;
    }

    /**
     * Show status message - SILENT: No blocking UI messages
     */
    showStatus(message) {
        // Silent status - no blocking UI messages
        console.log('Export status (silent):', message);
    }

    /**
     * Hide status
     */
    hideStatus() {
        this.element.querySelector('.export-status').style.display = 'none';
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        // Silent success - no blocking UI messages
        console.log('Export success (silent):', message);
    }

    /**
     * Show error message
     */
    showError(message) {
        // Silent error - no user message, just console logging
        console.error('Export Error (silent):', message);
    }

    /**
     * Show the export panel
     */
    show() {
        this.element.classList.add('visible');
        this.isVisible = true;
        document.body.appendChild(this.element);
    }

    /**
     * Hide the export panel
     */
    hide() {
        this.element.classList.remove('visible');
        this.isVisible = false;
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }

    /**
     * Toggle panel visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Cleanup
     */
    destroy() {
        this.hide();
        this.element = null;
    }
}