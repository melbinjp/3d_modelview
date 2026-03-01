describe("ModelViewer", function() {
  var modelViewer;

  beforeEach(function() {
    // Mock the DOM elements required by the ModelViewer constructor
    var mainContainer = document.createElement('div');
    mainContainer.id = 'mainContainer';
    mainContainer.classList.add('hidden');
    document.body.appendChild(mainContainer);

    var loadingScreen = document.createElement('div');
    loadingScreen.id = 'loadingScreen';
    var loadingText = document.createElement('p');
    loadingScreen.appendChild(loadingText);
    document.body.appendChild(loadingScreen);

    var sidebar = document.createElement('div');
    sidebar.id = 'sidebar';
    document.body.appendChild(sidebar);

    var sidebarToggleBtn = document.createElement('button');
    sidebarToggleBtn.id = 'sidebarToggleBtn';
    document.body.appendChild(sidebarToggleBtn);

    var viewerContainer = document.createElement('div');
    viewerContainer.id = 'viewerContainer';
    document.body.appendChild(viewerContainer);

    var modelUrl = document.createElement('input');
    modelUrl.id = 'modelUrl';
    document.body.appendChild(modelUrl);

    var superheroBtn = document.createElement('button');
    superheroBtn.id = 'superheroBtn';
    document.body.appendChild(superheroBtn);

    modelViewer = new ModelViewer();
  });

  afterEach(function() {
    // Clean up the DOM
    document.body.innerHTML = '';
  });

  describe("getLoaderForExtension", function() {
    it("should return GLTFLoader for 'gltf'", function() {
      var loader = modelViewer.getLoaderForExtension('gltf');
      expect(loader instanceof THREE.GLTFLoader).toBe(true);
    });

    it("should return GLTFLoader for 'glb'", function() {
      var loader = modelViewer.getLoaderForExtension('glb');
      expect(loader instanceof THREE.GLTFLoader).toBe(true);
    });

    it("should return FBXLoader for 'fbx'", function() {
      var loader = modelViewer.getLoaderForExtension('fbx');
      expect(loader instanceof THREE.FBXLoader).toBe(true);
    });

    it("should return OBJLoader for 'obj'", function() {
      var loader = modelViewer.getLoaderForExtension('obj');
      expect(loader instanceof THREE.OBJLoader).toBe(true);
    });

    it("should return ColladaLoader for 'dae'", function() {
      var loader = modelViewer.getLoaderForExtension('dae');
      expect(loader instanceof THREE.ColladaLoader).toBe(true);
    });

    it("should return STLLoader for 'stl'", function() {
      var loader = modelViewer.getLoaderForExtension('stl');
      expect(loader instanceof THREE.STLLoader).toBe(true);
    });

    it("should return PLYLoader for 'ply'", function() {
      var loader = modelViewer.getLoaderForExtension('ply');
      expect(loader instanceof THREE.PLYLoader).toBe(true);
    });

    it("should return null for an unsupported extension", function() {
      var loader = modelViewer.getLoaderForExtension('txt');
      expect(loader).toBe(null);
    });

    it("should be case-insensitive", function() {
      var loader = modelViewer.getLoaderForExtension('GLB');
      expect(loader instanceof THREE.GLTFLoader).toBe(true);
    });
  });

  describe("updateValueDisplay", function() {
    it("should update the value display of a slider", function() {
      var sliderContainer = document.createElement('div');
      var slider = document.createElement('input');
      slider.type = 'range';
      slider.value = '1.5';
      var valueDisplay = document.createElement('span');
      valueDisplay.classList.add('value-display');
      sliderContainer.appendChild(slider);
      sliderContainer.appendChild(valueDisplay);
      document.body.appendChild(sliderContainer);

      modelViewer.updateValueDisplay(slider);

      expect(valueDisplay.textContent).toBe('1.5');
    });
  });

  describe("updateBackground", function() {
    it("should set a solid color background", function() {
      var bgColorInput = document.createElement('input');
      bgColorInput.id = 'bgColor';
      bgColorInput.value = '#ff0000';
      document.body.appendChild(bgColorInput);

      modelViewer.updateBackground('solid');

      expect(modelViewer.scene.background.getHexString()).toBe('ff0000');
    });

    it("should set a gradient background", function() {
        modelViewer.updateBackground('gradient');
        expect(modelViewer.scene.background instanceof THREE.CanvasTexture).toBe(true);
    });
  });

  describe("Superhero Mode", function() {
    beforeEach(function() {
      // Mock a currentModel, as it's required for superhero mode
      modelViewer.currentModel = new THREE.Object3D();

      // Mock DOM elements for superhero mode
      var fadeOverlay = document.createElement('div');
      fadeOverlay.id = 'fadeOverlay';
      fadeOverlay.classList.add('hidden');
      document.body.appendChild(fadeOverlay);

      var superheroControls = document.createElement('div');
      superheroControls.id = 'superheroControls';
      superheroControls.classList.add('hidden');
      document.body.appendChild(superheroControls);
    });

    it("should not activate if there is no model", function() {
        modelViewer.currentModel = null;
        modelViewer.activateSuperheroMode();
        expect(modelViewer.superheroMode).toBe(false);
    });

    it("should activate superhero mode", function(done) {
      modelViewer.activateSuperheroMode();

      // The activation is asynchronous, so we need to wait
      setTimeout(function() {
        expect(modelViewer.superheroMode).toBe(true);
        expect(modelViewer.controls.enabled).toBe(false);
        done();
      }, 1100); // Wait for the timeout in activateSuperheroMode
    });

    it("should exit superhero mode", function() {
      // First, enter superhero mode
      modelViewer.superheroMode = true;
      modelViewer.controls.enabled = false;

      modelViewer.exitSuperheroMode();

      expect(modelViewer.superheroMode).toBe(false);
      expect(modelViewer.controls.enabled).toBe(true);
    });
  });

  describe("Measurement Tool", function() {
    beforeEach(function() {
      // Mock a currentModel, as it's required for measurement
      modelViewer.currentModel = new THREE.Object3D();

      // Mock DOM elements for measurement tool
      var measureBtn = document.createElement('button');
      measureBtn.id = 'measureBtn';
      document.body.appendChild(measureBtn);

      var measurementResult = document.createElement('div');
      measurementResult.id = 'measurementResult';
      document.body.appendChild(measurementResult);
    });

    it("should toggle measurement mode", function() {
      modelViewer.toggleMeasurement();
      expect(modelViewer.isMeasuring).toBe(true);
      expect(document.getElementById('measureBtn').textContent).toBe('Cancel Measurement');

      modelViewer.toggleMeasurement();
      expect(modelViewer.isMeasuring).toBe(false);
      expect(document.getElementById('measureBtn').textContent).toBe('Measure Distance');
    });

    it("should add a measurement point", function() {
      modelViewer.addMeasurementPoint(new THREE.Vector3(1, 0, 0));
      expect(modelViewer.measurementPoints.length).toBe(1);
      expect(modelViewer.measurementMarkers.length).toBe(1);
    });

    it("should calculate the distance between two points", function() {
      modelViewer.addMeasurementPoint(new THREE.Vector3(0, 0, 0));
      modelViewer.addMeasurementPoint(new THREE.Vector3(10, 0, 0));
      expect(modelViewer.measurementPoints.length).toBe(2);
      expect(modelViewer.measurementMarkers.length).toBe(2);
      expect(document.getElementById('measurementResult').textContent).toBe('Distance: 10.000 units');
    });

    it("should clear the measurement", function() {
      modelViewer.addMeasurementPoint(new THREE.Vector3(0, 0, 0));
      modelViewer.addMeasurementPoint(new THREE.Vector3(10, 0, 0));
      modelViewer.clearMeasurement();
      expect(modelViewer.measurementPoints.length).toBe(0);
      expect(modelViewer.measurementMarkers.length).toBe(0);
      expect(modelViewer.measurementLine).toBe(null);
      expect(document.getElementById('measurementResult').textContent).toBe('');
    });
  });

  describe("Theme Toggle", function() {
    it("should toggle the theme to dark mode", function() {
      modelViewer.toggleTheme(true);
      expect(document.body.classList.contains('dark-mode')).toBe(true);
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it("should toggle the theme to light mode", function() {
      // First, set the theme to dark mode
      modelViewer.toggleTheme(true);

      // Then, toggle it back to light mode
      modelViewer.toggleTheme(false);
      expect(document.body.classList.contains('dark-mode')).toBe(false);
      expect(localStorage.getItem('theme')).toBe('light');
    });

    it("should load the theme from local storage", function() {
      // First, set the theme to dark mode and save it to local storage
      localStorage.setItem('theme', 'dark');

      // Then, create a new ModelViewer instance and check if it loads the theme
      var newModelViewer = new ModelViewer();
      expect(document.body.classList.contains('dark-mode')).toBe(true);
    });
  });

  describe("showError", function() {
    it("should display an error message", function() {
      modelViewer.showError("Test error message");
      expect(document.getElementById('errorMessage').textContent).toBe("Test error message");
      expect(document.getElementById('errorModal').classList.contains('hidden')).toBe(false);
    });
  });
});
