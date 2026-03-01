/**
 * FileManagerPanel - UI component for file management and organization
 */
export class FileManagerPanel {
    constructor(core) {
        this.core = core;
        this.fileManager = null;
        this.currentView = 'recent'; // 'recent', 'projects', 'collections', 'search'
        this.selectedFiles = new Set();
        this.searchQuery = '';
        this.searchFilters = {};
        
        this.initialized = false;
    }

    /**
     * Initialize the file manager panel
     */
    init() {
        if (this.initialized) {
            console.warn('FileManagerPanel already initialized');
            return;
        }

        // Get file manager reference
        this.fileManager = this.core.getModule('fileManager');
        if (!this.fileManager) {
            console.warn('FileManager module not found');
            return;
        }

        this.createPanel();
        this.setupEventListeners();
        this.loadInitialData();
        
        this.initialized = true;
    }

    /**
     * Create the file manager panel UI
     */
    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'fileManagerPanel';
        panel.className = 'file-manager-panel';
        panel.innerHTML = `
            <div class="file-manager-header">
                <h3>File Manager</h3>
                <div class="view-tabs">
                    <button class="tab-btn active" data-view="recent">Recent</button>
                    <button class="tab-btn" data-view="projects">Projects</button>
                    <button class="tab-btn" data-view="collections">Collections</button>
                </div>
            </div>

            <div class="file-manager-toolbar">
                <div class="search-container">
                    <input type="text" id="fileSearch" placeholder="Search files..." class="search-input">
                    <button id="searchBtn" class="search-btn">
                        <svg viewBox="0 0 24 24" class="icon">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                    </button>
                </div>
                
                <div class="toolbar-actions">
                    <button id="newProjectBtn" class="btn secondary" title="New Project">
                        <svg viewBox="0 0 24 24" class="icon">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10,9 9,9 8,9"/>
                        </svg>
                    </button>
                    <button id="newCollectionBtn" class="btn secondary" title="New Collection">
                        <svg viewBox="0 0 24 24" class="icon">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                            <line x1="12" y1="11" x2="12" y2="17"/>
                            <line x1="9" y1="14" x2="15" y2="14"/>
                        </svg>
                    </button>
                </div>
            </div>

            <div class="file-manager-content">
                <!-- Recent Files View -->
                <div id="recentView" class="view-content active">
                    <div class="files-grid" id="recentFilesGrid">
                        <!-- Files will be populated here -->
                    </div>
                </div>

                <!-- Projects View -->
                <div id="projectsView" class="view-content">
                    <div class="projects-list" id="projectsList">
                        <!-- Projects will be populated here -->
                    </div>
                </div>

                <!-- Collections View -->
                <div id="collectionsView" class="view-content">
                    <div class="collections-list" id="collectionsList">
                        <!-- Collections will be populated here -->
                    </div>
                </div>

                <!-- Search Results View -->
                <div id="searchView" class="view-content">
                    <div class="search-filters">
                        <select id="typeFilter" class="filter-select">
                            <option value="">All Types</option>
                            <option value="glb">GLB</option>
                            <option value="gltf">GLTF</option>
                            <option value="fbx">FBX</option>
                            <option value="obj">OBJ</option>
                            <option value="stl">STL</option>
                        </select>
                        
                        <select id="projectFilter" class="filter-select">
                            <option value="">All Projects</option>
                        </select>
                        
                        <select id="sortFilter" class="filter-select">
                            <option value="timestamp">Recent</option>
                            <option value="name">Name</option>
                            <option value="type">Type</option>
                        </select>
                    </div>
                    
                    <div class="search-results">
                        <div class="results-header">
                            <span class="results-count">0 results</span>
                            <div class="view-options">
                                <button id="gridViewBtn" class="view-btn active" title="Grid View">
                                    <svg viewBox="0 0 24 24" class="icon">
                                        <rect x="3" y="3" width="7" height="7"/>
                                        <rect x="14" y="3" width="7" height="7"/>
                                        <rect x="14" y="14" width="7" height="7"/>
                                        <rect x="3" y="14" width="7" height="7"/>
                                    </svg>
                                </button>
                                <button id="listViewBtn" class="view-btn" title="List View">
                                    <svg viewBox="0 0 24 24" class="icon">
                                        <line x1="8" y1="6" x2="21" y2="6"/>
                                        <line x1="8" y1="12" x2="21" y2="12"/>
                                        <line x1="8" y1="18" x2="21" y2="18"/>
                                        <line x1="3" y1="6" x2="3.01" y2="6"/>
                                        <line x1="3" y1="12" x2="3.01" y2="12"/>
                                        <line x1="3" y1="18" x2="3.01" y2="18"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div class="files-grid" id="searchResultsGrid">
                            <!-- Search results will be populated here -->
                        </div>
                    </div>
                </div>
            </div>

            <!-- Batch Actions Bar -->
            <div id="batchActionsBar" class="batch-actions-bar hidden">
                <div class="selected-count">
                    <span id="selectedCount">0</span> files selected
                </div>
                <div class="batch-actions">
                    <button id="addToProjectBtn" class="btn secondary">Add to Project</button>
                    <button id="addToCollectionBtn" class="btn secondary">Add to Collection</button>
                    <button id="addTagsBtn" class="btn secondary">Add Tags</button>
                    <button id="deleteSelectedBtn" class="btn danger">Delete</button>
                </div>
                <button id="clearSelectionBtn" class="btn secondary">Clear Selection</button>
            </div>
        `;

        // Add to sidebar
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            // Create accordion item for file manager
            const accordionItem = document.createElement('div');
            accordionItem.className = 'accordion-item';
            accordionItem.innerHTML = `
                <div class="accordion-header">
                    <svg class="icon" viewBox="0 0 24 24">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span>File Manager</span>
                    <svg class="chevron" viewBox="0 0 24 24">
                        <polyline points="6,9 12,15 18,9"></polyline>
                    </svg>
                </div>
                <div class="accordion-content">
                    ${panel.innerHTML}
                </div>
            `;

            sidebar.appendChild(accordionItem);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });

        // Search
        const searchInput = document.getElementById('fileSearch');
        const searchBtn = document.getElementById('searchBtn');
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value;
                if (this.searchQuery.length > 2 || this.searchQuery.length === 0) {
                    this.performSearch();
                }
            });

            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.performSearch();
            });
        }

        // Filter changes
        ['typeFilter', 'projectFilter', 'sortFilter'].forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', () => {
                    this.updateSearchFilters();
                    this.performSearch();
                });
            }
        });

        // View options
        const gridViewBtn = document.getElementById('gridViewBtn');
        const listViewBtn = document.getElementById('listViewBtn');
        
        if (gridViewBtn) {
            gridViewBtn.addEventListener('click', () => {
                this.setViewMode('grid');
            });
        }

        if (listViewBtn) {
            listViewBtn.addEventListener('click', () => {
                this.setViewMode('list');
            });
        }

        // New project/collection buttons
        const newProjectBtn = document.getElementById('newProjectBtn');
        const newCollectionBtn = document.getElementById('newCollectionBtn');

        if (newProjectBtn) {
            newProjectBtn.addEventListener('click', () => {
                this.showCreateProjectDialog();
            });
        }

        if (newCollectionBtn) {
            newCollectionBtn.addEventListener('click', () => {
                this.showCreateCollectionDialog();
            });
        }

        // Batch actions
        const batchActionBtns = {
            addToProject: document.getElementById('addToProjectBtn'),
            addToCollection: document.getElementById('addToCollectionBtn'),
            addTags: document.getElementById('addTagsBtn'),
            deleteSelected: document.getElementById('deleteSelectedBtn'),
            clearSelection: document.getElementById('clearSelectionBtn')
        };

        Object.entries(batchActionBtns).forEach(([action, btn]) => {
            if (btn) {
                btn.addEventListener('click', () => {
                    this.handleBatchAction(action);
                });
            }
        });

        // File manager events
        this.core.on('filemanager:recent:updated', () => {
            if (this.currentView === 'recent') {
                this.loadRecentFiles();
            }
        });

        this.core.on('filemanager:project:created', () => {
            this.loadProjects();
            this.updateProjectFilter();
        });

        this.core.on('filemanager:collection:created', () => {
            this.loadCollections();
        });

        this.core.on('filemanager:thumbnail:generated', (data) => {
            this.updateFileThumbnail(data.fileId, data.thumbnail);
        });
    }

    /**
     * Load initial data
     */
    loadInitialData() {
        this.loadRecentFiles();
        this.loadProjects();
        this.loadCollections();
        this.updateProjectFilter();
    }

    /**
     * Switch between views
     */
    switchView(view) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Update view content
        document.querySelectorAll('.view-content').forEach(content => {
            content.classList.toggle('active', content.id === `${view}View`);
        });

        this.currentView = view;

        // Load data for the selected view
        switch (view) {
            case 'recent':
                this.loadRecentFiles();
                break;
            case 'projects':
                this.loadProjects();
                break;
            case 'collections':
                this.loadCollections();
                break;
        }
    }

    /**
     * Load recent files
     */
    loadRecentFiles() {
        const grid = document.getElementById('recentFilesGrid');
        if (!grid || !this.fileManager) return;

        const recentFiles = this.fileManager.getRecentFiles(20);
        this.renderFilesGrid(grid, recentFiles);
    }

    /**
     * Load projects
     */
    loadProjects() {
        const list = document.getElementById('projectsList');
        if (!list || !this.fileManager) return;

        const projects = this.fileManager.getProjects();
        this.renderProjectsList(list, projects);
    }

    /**
     * Load collections
     */
    loadCollections() {
        const list = document.getElementById('collectionsList');
        if (!list || !this.fileManager) return;

        const collections = this.fileManager.getCollections();
        this.renderCollectionsList(list, collections);
    }

    /**
     * Render files grid
     */
    renderFilesGrid(container, files) {
        if (files.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg class="icon" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                    </svg>
                    <p>No files found</p>
                    <small>Load some 3D models to see them here</small>
                </div>
            `;
            return;
        }

        container.innerHTML = files.map(file => this.createFileCard(file)).join('');
        
        // Add event listeners to file cards
        container.querySelectorAll('.file-card').forEach(card => {
            const fileId = card.dataset.fileId;
            
            // Click to load file
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.file-actions') && !e.target.closest('.file-checkbox')) {
                    this.loadFile(fileId);
                }
            });

            // Checkbox for selection
            const checkbox = card.querySelector('.file-checkbox input');
            if (checkbox) {
                checkbox.addEventListener('change', (e) => {
                    this.toggleFileSelection(fileId, e.target.checked);
                });
            }

            // Action buttons
            const deleteBtn = card.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteFile(fileId);
                });
            }

            const infoBtn = card.querySelector('.info-btn');
            if (infoBtn) {
                infoBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.showFileInfo(fileId);
                });
            }
        });
    }

    /**
     * Create file card HTML
     */
    createFileCard(file) {
        const thumbnail = this.fileManager.getThumbnail(file.id);
        const metadata = file.metadata || {};
        const timeAgo = this.formatTimeAgo(file.timestamp);

        return `
            <div class="file-card" data-file-id="${file.id}">
                <div class="file-checkbox">
                    <input type="checkbox" id="file-${file.id}">
                    <label for="file-${file.id}"></label>
                </div>
                
                <div class="file-thumbnail">
                    ${thumbnail ? 
                        `<img src="${thumbnail}" alt="${file.name}">` :
                        `<div class="thumbnail-placeholder">
                            <svg viewBox="0 0 24 24" class="icon">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14,2 14,8 20,8"/>
                            </svg>
                        </div>`
                    }
                </div>
                
                <div class="file-info">
                    <h4 class="file-name" title="${file.name}">${this.truncateText(file.name, 20)}</h4>
                    <div class="file-meta">
                        <span class="file-type">${file.type.toUpperCase()}</span>
                        <span class="file-time">${timeAgo}</span>
                    </div>
                    ${metadata.vertices ? 
                        `<div class="file-stats">
                            <span>${this.formatNumber(metadata.vertices)} vertices</span>
                            ${metadata.materials ? `<span>${metadata.materials} materials</span>` : ''}
                        </div>` : ''
                    }
                </div>
                
                <div class="file-actions">
                    <button class="action-btn info-btn" title="File Info">
                        <svg viewBox="0 0 24 24" class="icon">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </svg>
                    </button>
                    <button class="action-btn delete-btn" title="Delete">
                        <svg viewBox="0 0 24 24" class="icon">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render projects list
     */
    renderProjectsList(container, projects) {
        if (projects.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg class="icon" viewBox="0 0 24 24">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    </svg>
                    <p>No projects yet</p>
                    <small>Create a project to organize your models</small>
                </div>
            `;
            return;
        }

        container.innerHTML = projects.map(project => `
            <div class="project-card" data-project-id="${project.id}">
                <div class="project-header">
                    <h4>${project.name}</h4>
                    <div class="project-actions">
                        <button class="action-btn" title="Edit Project">
                            <svg viewBox="0 0 24 24" class="icon">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="action-btn delete-btn" title="Delete Project">
                            <svg viewBox="0 0 24 24" class="icon">
                                <polyline points="3,6 5,6 21,6"/>
                                <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <p class="project-description">${project.description || 'No description'}</p>
                <div class="project-stats">
                    <span>${project.files.length} files</span>
                    <span>Modified ${this.formatTimeAgo(project.modified)}</span>
                </div>
            </div>
        `).join('');

        // Add event listeners
        container.querySelectorAll('.project-card').forEach(card => {
            const projectId = card.dataset.projectId;
            
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.project-actions')) {
                    this.openProject(projectId);
                }
            });
        });
    }

    /**
     * Render collections list
     */
    renderCollectionsList(container, collections) {
        if (collections.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg class="icon" viewBox="0 0 24 24">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    <p>No collections yet</p>
                    <small>Create a collection to group related models</small>
                </div>
            `;
            return;
        }

        container.innerHTML = collections.map(collection => `
            <div class="collection-card" data-collection-id="${collection.id}">
                <div class="collection-header">
                    <h4>${collection.name}</h4>
                    <div class="collection-actions">
                        <button class="action-btn" title="Edit Collection">
                            <svg viewBox="0 0 24 24" class="icon">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="action-btn delete-btn" title="Delete Collection">
                            <svg viewBox="0 0 24 24" class="icon">
                                <polyline points="3,6 5,6 21,6"/>
                                <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <p class="collection-description">${collection.description || 'No description'}</p>
                <div class="collection-stats">
                    <span>${collection.files.length} files</span>
                    <span>Modified ${this.formatTimeAgo(collection.modified)}</span>
                </div>
            </div>
        `).join('');

        // Add event listeners
        container.querySelectorAll('.collection-card').forEach(card => {
            const collectionId = card.dataset.collectionId;
            
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.collection-actions')) {
                    this.openCollection(collectionId);
                }
            });
        });
    }

    /**
     * Perform search
     */
    performSearch() {
        if (!this.fileManager) return;

        if (this.searchQuery.length === 0) {
            // Hide search view if no query
            if (this.currentView === 'search') {
                this.switchView('recent');
            }
            return;
        }

        // Switch to search view
        if (this.currentView !== 'search') {
            this.currentView = 'search';
            document.querySelectorAll('.view-content').forEach(content => {
                content.classList.toggle('active', content.id === 'searchView');
            });
        }

        // Perform search
        const results = this.fileManager.searchFiles(this.searchQuery, this.searchFilters);
        
        // Update results count
        const resultsCount = document.querySelector('.results-count');
        if (resultsCount) {
            resultsCount.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;
        }

        // Render results
        const resultsGrid = document.getElementById('searchResultsGrid');
        if (resultsGrid) {
            this.renderFilesGrid(resultsGrid, results);
        }
    }

    /**
     * Update search filters
     */
    updateSearchFilters() {
        this.searchFilters = {
            type: document.getElementById('typeFilter')?.value || null,
            project: document.getElementById('projectFilter')?.value || null,
            sortBy: document.getElementById('sortFilter')?.value || 'timestamp',
            sortOrder: 'desc'
        };
    }

    /**
     * Update project filter dropdown
     */
    updateProjectFilter() {
        const projectFilter = document.getElementById('projectFilter');
        if (!projectFilter || !this.fileManager) return;

        const projects = this.fileManager.getProjects();
        const options = ['<option value="">All Projects</option>'];
        
        projects.forEach(project => {
            options.push(`<option value="${project.id}">${project.name}</option>`);
        });

        projectFilter.innerHTML = options.join('');
    }

    /**
     * Set view mode (grid or list)
     */
    setViewMode(mode) {
        const gridBtn = document.getElementById('gridViewBtn');
        const listBtn = document.getElementById('listViewBtn');
        const resultsGrid = document.getElementById('searchResultsGrid');

        if (gridBtn && listBtn && resultsGrid) {
            gridBtn.classList.toggle('active', mode === 'grid');
            listBtn.classList.toggle('active', mode === 'list');
            resultsGrid.classList.toggle('list-view', mode === 'list');
        }
    }

    /**
     * Toggle file selection
     */
    toggleFileSelection(fileId, selected) {
        if (selected) {
            this.selectedFiles.add(fileId);
        } else {
            this.selectedFiles.delete(fileId);
        }

        this.updateBatchActionsBar();
    }

    /**
     * Update batch actions bar
     */
    updateBatchActionsBar() {
        const batchBar = document.getElementById('batchActionsBar');
        const selectedCount = document.getElementById('selectedCount');

        if (batchBar && selectedCount) {
            if (this.selectedFiles.size > 0) {
                batchBar.classList.remove('hidden');
                selectedCount.textContent = this.selectedFiles.size;
            } else {
                batchBar.classList.add('hidden');
            }
        }
    }

    /**
     * Handle batch actions
     */
    handleBatchAction(action) {
        const fileIds = Array.from(this.selectedFiles);
        
        switch (action) {
            case 'addToProject':
                this.showAddToProjectDialog(fileIds);
                break;
            case 'addToCollection':
                this.showAddToCollectionDialog(fileIds);
                break;
            case 'addTags':
                this.showAddTagsDialog(fileIds);
                break;
            case 'deleteSelected':
                this.deleteSelectedFiles(fileIds);
                break;
            case 'clearSelection':
                this.clearSelection();
                break;
        }
    }

    /**
     * Clear file selection
     */
    clearSelection() {
        this.selectedFiles.clear();
        document.querySelectorAll('.file-checkbox input').forEach(checkbox => {
            checkbox.checked = false;
        });
        this.updateBatchActionsBar();
    }

    /**
     * Load file
     */
    async loadFile(fileId) {
        const file = this.fileManager.getFile(fileId);
        if (!file) return;

        try {
            if (file.url) {
                await this.core.assetManager.loadModelFromUrl(file.url);
            } else if (file.file) {
                // For file objects, we need to re-create the file from stored data
                // This is a limitation since we can't persist File objects
                console.warn('Cannot reload file object from storage');
            }
        } catch (error) {
            console.error('Failed to load file:', error);
        }
    }

    /**
     * Delete file
     */
    deleteFile(fileId) {
        if (confirm('Are you sure you want to remove this file from recent files?')) {
            this.fileManager.deleteFile(fileId);
            this.loadRecentFiles();
        }
    }

    /**
     * Show file info dialog
     */
    showFileInfo(fileId) {
        const file = this.fileManager.getFile(fileId);
        if (!file) return;

        // Create and show file info modal
        // This would be implemented as a modal dialog
        console.log('File info:', file);
    }

    /**
     * Show create project dialog
     */
    showCreateProjectDialog() {
        const name = prompt('Project name:');
        if (name) {
            const description = prompt('Project description (optional):') || '';
            this.fileManager.createProject(name, description);
        }
    }

    /**
     * Show create collection dialog
     */
    showCreateCollectionDialog() {
        const name = prompt('Collection name:');
        if (name) {
            const description = prompt('Collection description (optional):') || '';
            this.fileManager.createCollection(name, description);
        }
    }

    /**
     * Utility functions
     */
    formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return new Date(timestamp).toLocaleDateString();
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    truncateText(text, maxLength) {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.selectedFiles.clear();
        this.initialized = false;
    }
}