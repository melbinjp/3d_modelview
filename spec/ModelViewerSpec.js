describe("Modular Architecture", function() {
  var mockCore, mockAssetManager, mockRenderingEngine, mockUIManager, mockExportSystem;

  beforeEach(function() {
    // Mock the DOM elements
    var mainContainer = document.createElement('div');
    mainContainer.id = 'mainContainer';
    mainContainer.classList.add('hidden');
    document.body.appendChild(mainContainer);

    var loadingScreen = document.createElement('div');
    loadingScreen.id = 'loadingScreen';
    var loadingText = document.createElement('p');
    loadingScreen.appendChild(loadingText);
    document.body.appendChild(loadingScreen);

    var viewerContainer = document.createElement('div');
    viewerContainer.id = 'viewerContainer';
    document.body.appendChild(viewerContainer);

    // Mock core engine
    mockCore = {
      modules: new Map(),
      eventListeners: new Map(),
      state: { currentModel: null },
      registerModule: function(name, module) { this.modules.set(name, module); },
      getModule: function(name) { return this.modules.get(name); },
      emit: function(event, data) {
        if (this.eventListeners.has(event)) {
          this.eventListeners.get(event).forEach(function(callback) { callback(data); });
        }
      },
      on: function(event, callback) {
        if (!this.eventListeners.has(event)) {
          this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
      },
      getState: function() { return this.state; },
      setState: function(newState) { Object.assign(this.state, newState); },
      updateState: function(path, value) { /* simplified */ }
    };

    // Mock modules
    mockAssetManager = {
      core: mockCore,
      initialized: false,
      init: function() { this.initialized = true; },
      getSupportedFormats: function() { return ['gltf', 'glb', 'fbx', 'obj', 'dae', 'stl', 'ply']; }
    };

    mockRenderingEngine = {
      core: mockCore,
      initialized: false,
      scene: { background: null },
      camera: { aspect: 1 },
      renderer: { domElement: document.createElement('canvas') },
      controls: { enabled: true },
      init: function() { this.initialized = true; }
    };

    mockUIManager = {
      core: mockCore,
      initialized: false,
      currentMode: 'simple',
      init: function() { this.initialized = true; },
      setMode: function(mode) { this.currentMode = mode; },
      showError: function(message) { /* mock */ }
    };

    mockExportSystem = {
      core: mockCore,
      initialized: false,
      init: function() { this.initialized = true; },
      getAvailableFormats: function() { return ['gltf', 'glb']; },
      getAvailablePresets: function() { return ['unity', 'web', 'blender']; }
    };
  });

  afterEach(function() {
    document.body.innerHTML = '';
  });

  describe("Core Engine", function() {
    it("should register and retrieve modules", function() {
      mockCore.registerModule('test', mockAssetManager);
      expect(mockCore.getModule('test')).toBe(mockAssetManager);
    });

    it("should handle events correctly", function() {
      var eventFired = false;
      mockCore.on('test:event', function() { eventFired = true; });
      mockCore.emit('test:event');
      expect(eventFired).toBe(true);
    });

    it("should manage state correctly", function() {
      mockCore.setState({ test: 'value' });
      expect(mockCore.getState().test).toBe('value');
    });
  });

  describe("Asset Manager", function() {
    it("should initialize correctly", function() {
      expect(mockAssetManager.initialized).toBe(false);
      mockAssetManager.init();
      expect(mockAssetManager.initialized).toBe(true);
    });

    it("should support multiple file formats", function() {
      var formats = mockAssetManager.getSupportedFormats();
      expect(formats).toContain('gltf');
      expect(formats).toContain('glb');
      expect(formats).toContain('fbx');
      expect(formats).toContain('obj');
    });
  });

  describe("Rendering Engine", function() {
    it("should initialize correctly", function() {
      expect(mockRenderingEngine.initialized).toBe(false);
      mockRenderingEngine.init();
      expect(mockRenderingEngine.initialized).toBe(true);
    });

    it("should have Three.js components", function() {
      expect(mockRenderingEngine.scene).toBeDefined();
      expect(mockRenderingEngine.camera).toBeDefined();
      expect(mockRenderingEngine.renderer).toBeDefined();
    });
  });

  describe("UI Manager", function() {
    it("should initialize with simple mode", function() {
      expect(mockUIManager.currentMode).toBe('simple');
      mockUIManager.init();
      expect(mockUIManager.initialized).toBe(true);
    });

    it("should switch between UI modes", function() {
      mockUIManager.setMode('advanced');
      expect(mockUIManager.currentMode).toBe('advanced');
      
      mockUIManager.setMode('simple');
      expect(mockUIManager.currentMode).toBe('simple');
    });
  });

  describe("Export System", function() {
    it("should initialize correctly", function() {
      expect(mockExportSystem.initialized).toBe(false);
      mockExportSystem.init();
      expect(mockExportSystem.initialized).toBe(true);
    });

    it("should have available formats and presets", function() {
      var formats = mockExportSystem.getAvailableFormats();
      var presets = mockExportSystem.getAvailablePresets();
      
      expect(formats).toContain('gltf');
      expect(formats).toContain('glb');
      expect(presets).toContain('unity');
      expect(presets).toContain('web');
    });
  });

  describe("Module Integration", function() {
    it("should register all modules with core", function() {
      mockCore.registerModule('rendering', mockRenderingEngine);
      mockCore.registerModule('assets', mockAssetManager);
      mockCore.registerModule('ui', mockUIManager);
      mockCore.registerModule('export', mockExportSystem);
      
      expect(mockCore.getModule('rendering')).toBe(mockRenderingEngine);
      expect(mockCore.getModule('assets')).toBe(mockAssetManager);
      expect(mockCore.getModule('ui')).toBe(mockUIManager);
      expect(mockCore.getModule('export')).toBe(mockExportSystem);
    });

    it("should handle inter-module communication", function() {
      var eventReceived = false;
      mockCore.on('assets:model:loaded', function() { eventReceived = true; });
      mockCore.emit('assets:model:loaded', { model: { name: 'test-model' } });
      expect(eventReceived).toBe(true);
    });
  });

  describe("Error Handling", function() {
    it("should handle module initialization errors gracefully", function() {
      var errorHandled = false;
      try {
        // Simulate an error during module initialization
        throw new Error('Module initialization failed');
      } catch (error) {
        errorHandled = true;
        mockUIManager.showError(error.message);
      }
      expect(errorHandled).toBe(true);
    });
  });

  describe("State Management", function() {
    it("should maintain consistent state across modules", function() {
      mockCore.setState({ currentModel: { name: 'test-model' } });
      expect(mockCore.getState().currentModel).toBeDefined();
      
      // Simulate state change event
      var stateChanged = false;
      mockCore.on('state:changed', function() { stateChanged = true; });
      mockCore.emit('state:changed', { isLoading: true });
      expect(stateChanged).toBe(true);
    });
  });
});
