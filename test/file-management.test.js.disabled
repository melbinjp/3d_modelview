/**
 * File Management System Tests
 */

describe('File Management System', () => {
    let core;
    let assetManager;
    let fileManager;

    beforeEach(() => {
        // Create core engine
        core = {
            modules: new Map(),
            eventListeners: new Map(),
            state: {},
            
            registerModule(name, module) {
                this.modules.set(name, module);
            },
            
            getModule(name) {
                return this.modules.get(name);
            },
            
            emit(event, data) {
                if (this.eventListeners.has(event)) {
                    this.eventListeners.get(event).forEach(callback => callback(data));
                }
            },
            
            on(event, callback) {
                if (!this.eventListeners.has(event)) {
                    this.eventListeners.set(event, []);
                }
                this.eventListeners.get(event).push(callback);
            },
            
            setState(newState) {
                this.state = { ...this.state, ...newState };
            }
        };

        // Mock AssetManager with FileManager
        assetManager = {
            fileManager: null
        };

        // Clear localStorage before each test
        localStorage.clear();
    });

    describe('FileManager', () => {
        beforeEach(async () => {
            const { FileManager } = await import('../src/assets/FileManager.js');
            fileManager = new FileManager(core);
            assetManager.fileManager = fileManager;
            await fileManager.init();
        });

        it('should initialize correctly', () => {
            expect(fileManager.initialized).toBe(true);
            expect(fileManager.recentFiles).toEqual([]);
            expect(fileManager.projects.size).toBe(0);
            expect(fileManager.collections.size).toBe(0);
        });

        it('should add files to recent files list', () => {
            const mockModelData = {
                file: 'test-model.glb',
                model: {
                    traverse: jasmine.createSpy('traverse')
                },
                animations: []
            };

            fileManager.addToRecentFiles(mockModelData);

            expect(fileManager.recentFiles.length).toBe(1);
            expect(fileManager.recentFiles[0].name).toBe('test-model.glb');
            expect(fileManager.recentFiles[0].type).toBe('glb');
        });

        it('should create projects', () => {
            const project = fileManager.createProject('Test Project', 'A test project');

            expect(project.name).toBe('Test Project');
            expect(project.description).toBe('A test project');
            expect(fileManager.projects.has(project.id)).toBe(true);
        });

        it('should create collections', () => {
            const collection = fileManager.createCollection('Test Collection', 'A test collection');

            expect(collection.name).toBe('Test Collection');
            expect(collection.description).toBe('A test collection');
            expect(fileManager.collections.has(collection.id)).toBe(true);
        });

        it('should add files to projects', () => {
            const project = fileManager.createProject('Test Project');
            const mockModelData = {
                file: 'test-model.glb',
                model: { traverse: jasmine.createSpy('traverse') }
            };

            fileManager.addToRecentFiles(mockModelData);
            const fileId = fileManager.recentFiles[0].id;

            fileManager.addFileToProject(project.id, fileId);

            const updatedProject = fileManager.getProject(project.id);
            expect(updatedProject.files).toContain(fileId);
        });

        it('should search files by name', () => {
            const mockFiles = [
                { file: 'car-model.glb', model: { traverse: jasmine.createSpy() } },
                { file: 'house-model.fbx', model: { traverse: jasmine.createSpy() } },
                { file: 'tree-model.obj', model: { traverse: jasmine.createSpy() } }
            ];

            mockFiles.forEach(file => fileManager.addToRecentFiles(file));

            const results = fileManager.searchFiles('car');
            expect(results.length).toBe(1);
            expect(results[0].name).toBe('car-model.glb');
        });

        it('should filter files by type', () => {
            const mockFiles = [
                { file: 'model1.glb', model: { traverse: jasmine.createSpy() } },
                { file: 'model2.fbx', model: { traverse: jasmine.createSpy() } },
                { file: 'model3.glb', model: { traverse: jasmine.createSpy() } }
            ];

            mockFiles.forEach(file => fileManager.addToRecentFiles(file));

            const results = fileManager.searchFiles('', { type: 'glb' });
            expect(results.length).toBe(2);
            results.forEach(result => expect(result.type).toBe('glb'));
        });

        it('should perform batch operations', () => {
            const mockFiles = [
                { file: 'model1.glb', model: { traverse: jasmine.createSpy() } },
                { file: 'model2.glb', model: { traverse: jasmine.createSpy() } }
            ];

            mockFiles.forEach(file => fileManager.addToRecentFiles(file));
            const fileIds = fileManager.recentFiles.map(f => f.id);

            const project = fileManager.createProject('Batch Project');
            const results = fileManager.batchOperation('addToProject', fileIds, { 
                projectId: project.id 
            });

            expect(results.length).toBe(2);
            results.forEach(result => expect(result.success).toBe(true));

            const updatedProject = fileManager.getProject(project.id);
            expect(updatedProject.files.length).toBe(2);
        });

        it('should add and search by tags', () => {
            const mockModelData = {
                file: 'tagged-model.glb',
                model: { traverse: jasmine.createSpy() }
            };

            fileManager.addToRecentFiles(mockModelData);
            const fileId = fileManager.recentFiles[0].id;

            fileManager.addTags(fileId, ['vehicle', 'low-poly']);

            const results = fileManager.searchFiles('', { tags: ['vehicle'] });
            expect(results.length).toBe(1);
            expect(results[0].id).toBe(fileId);
        });

        it('should delete files', () => {
            const mockModelData = {
                file: 'delete-me.glb',
                model: { traverse: jasmine.createSpy() }
            };

            fileManager.addToRecentFiles(mockModelData);
            const fileId = fileManager.recentFiles[0].id;

            expect(fileManager.recentFiles.length).toBe(1);

            fileManager.deleteFile(fileId);

            expect(fileManager.recentFiles.length).toBe(0);
            expect(fileManager.getThumbnail(fileId)).toBeUndefined();
        });

        it('should persist data to localStorage', () => {
            const project = fileManager.createProject('Persistent Project');
            const collection = fileManager.createCollection('Persistent Collection');

            // Create new instance to test loading
            const newFileManager = new (require('../src/assets/FileManager.js').FileManager)(core);
            newFileManager.loadProjects();
            newFileManager.loadCollections();

            expect(newFileManager.projects.size).toBe(1);
            expect(newFileManager.collections.size).toBe(1);
            expect(newFileManager.getProject(project.id).name).toBe('Persistent Project');
            expect(newFileManager.getCollection(collection.id).name).toBe('Persistent Collection');
        });

        it('should extract model metadata', () => {
            const mockModel = {
                traverse: jasmine.createSpy('traverse').and.callFake((callback) => {
                    // Simulate mesh with geometry
                    callback({
                        isMesh: true,
                        geometry: {
                            attributes: {
                                position: { count: 1000 }
                            },
                            index: { count: 3000 }
                        },
                        material: {
                            uuid: 'material-1',
                            map: { isTexture: true, uuid: 'texture-1' }
                        }
                    });
                })
            };

            const metadata = fileManager.extractModelMetadata(mockModel);

            expect(metadata.vertices).toBe(1000);
            expect(metadata.faces).toBe(1000); // 3000 indices / 3
            expect(metadata.materials).toBe(1);
            expect(metadata.textures).toBe(1);
        });

        it('should generate statistics', () => {
            const mockFiles = [
                { file: 'model1.glb', model: { traverse: jasmine.createSpy() } },
                { file: 'model2.fbx', model: { traverse: jasmine.createSpy() } }
            ];

            mockFiles.forEach(file => fileManager.addToRecentFiles(file));
            fileManager.createProject('Project 1');
            fileManager.createCollection('Collection 1');

            const stats = fileManager.getStatistics();

            expect(stats.totalFiles).toBe(2);
            expect(stats.totalProjects).toBe(1);
            expect(stats.totalCollections).toBe(1);
        });
    });

    describe('FileManagerPanel', () => {
        let fileManagerPanel;

        beforeEach(async () => {
            // Setup DOM
            document.body.innerHTML = `
                <div id="sidebar"></div>
                <div id="fileManagerPanel"></div>
            `;

            const { FileManager } = await import('../src/assets/FileManager.js');
            const { FileManagerPanel } = await import('../src/ui/FileManagerPanel.js');
            
            fileManager = new FileManager(core);
            await fileManager.init();
            
            core.registerModule('fileManager', fileManager);
            
            fileManagerPanel = new FileManagerPanel(core);
        });

        it('should initialize correctly', () => {
            fileManagerPanel.init();
            expect(fileManagerPanel.initialized).toBe(true);
            expect(fileManagerPanel.currentView).toBe('recent');
        });

        it('should switch between views', () => {
            fileManagerPanel.init();
            
            // Mock DOM elements
            document.body.innerHTML += `
                <button class="tab-btn" data-view="projects">Projects</button>
                <div id="projectsView" class="view-content"></div>
                <div id="recentView" class="view-content active"></div>
            `;

            fileManagerPanel.switchView('projects');

            expect(fileManagerPanel.currentView).toBe('projects');
        });

        it('should handle file selection', () => {
            fileManagerPanel.init();
            
            fileManagerPanel.toggleFileSelection('file-1', true);
            fileManagerPanel.toggleFileSelection('file-2', true);

            expect(fileManagerPanel.selectedFiles.size).toBe(2);
            expect(fileManagerPanel.selectedFiles.has('file-1')).toBe(true);
            expect(fileManagerPanel.selectedFiles.has('file-2')).toBe(true);
        });

        it('should clear selection', () => {
            fileManagerPanel.init();
            
            fileManagerPanel.toggleFileSelection('file-1', true);
            fileManagerPanel.toggleFileSelection('file-2', true);
            fileManagerPanel.clearSelection();

            expect(fileManagerPanel.selectedFiles.size).toBe(0);
        });

        it('should format time correctly', () => {
            fileManagerPanel.init();
            
            const now = Date.now();
            const oneMinuteAgo = now - 60000;
            const oneHourAgo = now - 3600000;
            const oneDayAgo = now - 86400000;

            expect(fileManagerPanel.formatTimeAgo(now)).toBe('Just now');
            expect(fileManagerPanel.formatTimeAgo(oneMinuteAgo)).toBe('1m ago');
            expect(fileManagerPanel.formatTimeAgo(oneHourAgo)).toBe('1h ago');
            expect(fileManagerPanel.formatTimeAgo(oneDayAgo)).toBe('1d ago');
        });

        it('should format numbers correctly', () => {
            fileManagerPanel.init();
            
            expect(fileManagerPanel.formatNumber(500)).toBe('500');
            expect(fileManagerPanel.formatNumber(1500)).toBe('1.5K');
            expect(fileManagerPanel.formatNumber(1500000)).toBe('1.5M');
        });

        it('should truncate text correctly', () => {
            fileManagerPanel.init();
            
            const longText = 'This is a very long filename that should be truncated';
            const truncated = fileManagerPanel.truncateText(longText, 20);
            
            expect(truncated).toBe('This is a very long ...');
            expect(truncated.length).toBe(23); // 20 + '...'
        });
    });

    describe('Integration Tests', () => {
        beforeEach(async () => {
            // Setup complete system
            const { FileManager } = await import('../src/assets/FileManager.js');
            const { FileManagerPanel } = await import('../src/ui/FileManagerPanel.js');
            
            fileManager = new FileManager(core);
            await fileManager.init();
            
            core.registerModule('fileManager', fileManager);
            
            // Setup DOM
            document.body.innerHTML = `
                <div id="sidebar"></div>
                <div id="fileManagerPanel"></div>
            `;
        });

        it('should handle complete file management workflow', async () => {
            // Add some files
            const mockFiles = [
                { file: 'car.glb', model: { traverse: jasmine.createSpy() } },
                { file: 'house.fbx', model: { traverse: jasmine.createSpy() } },
                { file: 'tree.obj', model: { traverse: jasmine.createSpy() } }
            ];

            mockFiles.forEach(file => fileManager.addToRecentFiles(file));

            // Create project and collection
            const project = fileManager.createProject('Architecture Project', 'Buildings and structures');
            const collection = fileManager.createCollection('Nature Collection', 'Natural objects');

            // Add files to project and collection
            const fileIds = fileManager.recentFiles.map(f => f.id);
            fileManager.addFileToProject(project.id, fileIds[1]); // house to architecture
            fileManager.addFileToCollection(collection.id, fileIds[2]); // tree to nature

            // Add tags
            fileManager.addTags(fileIds[0], ['vehicle', 'transport']);
            fileManager.addTags(fileIds[1], ['building', 'architecture']);
            fileManager.addTags(fileIds[2], ['nature', 'plant']);

            // Test search functionality
            const vehicleResults = fileManager.searchFiles('', { tags: ['vehicle'] });
            expect(vehicleResults.length).toBe(1);
            expect(vehicleResults[0].name).toBe('car.glb');

            const buildingResults = fileManager.searchFiles('house');
            expect(buildingResults.length).toBe(1);
            expect(buildingResults[0].name).toBe('house.fbx');

            // Test project contents
            const projectFiles = fileManager.searchFiles('', { project: project.id });
            expect(projectFiles.length).toBe(1);
            expect(projectFiles[0].name).toBe('house.fbx');

            // Test collection contents
            const collectionFiles = fileManager.searchFiles('', { collection: collection.id });
            expect(collectionFiles.length).toBe(1);
            expect(collectionFiles[0].name).toBe('tree.obj');

            // Test batch operations
            const batchResults = fileManager.batchOperation('addTags', [fileIds[0], fileIds[1]], {
                tags: ['3d-model', 'asset']
            });

            expect(batchResults.length).toBe(2);
            batchResults.forEach(result => expect(result.success).toBe(true));

            // Verify tags were added
            const taggedResults = fileManager.searchFiles('', { tags: ['3d-model'] });
            expect(taggedResults.length).toBe(2);
        });

        it('should persist and restore complete state', async () => {
            // Create initial state
            const mockFiles = [
                { file: 'model1.glb', model: { traverse: jasmine.createSpy() } },
                { file: 'model2.fbx', model: { traverse: jasmine.createSpy() } }
            ];

            mockFiles.forEach(file => fileManager.addToRecentFiles(file));
            
            const project = fileManager.createProject('Test Project');
            const collection = fileManager.createCollection('Test Collection');
            
            const fileIds = fileManager.recentFiles.map(f => f.id);
            fileManager.addFileToProject(project.id, fileIds[0]);
            fileManager.addFileToCollection(collection.id, fileIds[1]);
            fileManager.addTags(fileIds[0], ['test-tag']);

            // Create new instance to simulate app restart
            const { FileManager } = await import('../src/assets/FileManager.js');
            const newFileManager = new FileManager(core);
            await newFileManager.init();

            // Verify state was restored
            expect(newFileManager.recentFiles.length).toBe(2);
            expect(newFileManager.projects.size).toBe(1);
            expect(newFileManager.collections.size).toBe(1);

            const restoredProject = Array.from(newFileManager.projects.values())[0];
            expect(restoredProject.name).toBe('Test Project');
            expect(restoredProject.files.length).toBe(1);

            const restoredCollection = Array.from(newFileManager.collections.values())[0];
            expect(restoredCollection.name).toBe('Test Collection');
            expect(restoredCollection.files.length).toBe(1);
        });
    });
});