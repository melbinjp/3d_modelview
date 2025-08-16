# Observed Feature Inventory

This document inventories all features observed in the codebase.

**Confidence Level:** All observations are based on static analysis of `index.html` and `script.js`. The "Verified Behavior" is inferred from the code and has not been dynamically tested in a browser. Confidence for all features is **[MEDIUM]**.

---

### 1. Model Loading from URL
-   **Feature Name:** Load Model from URL
-   **Implementation Location:**
    -   `script.js`, `loadModelFromUrl(url)` method (line 462)
    -   `script.js`, event listener for `#loadUrlBtn` (line 280)
    ```javascript
    document.getElementById('loadUrlBtn').addEventListener('click', () => {
        const url = document.getElementById('modelUrl').value.trim();
        if (url) this.loadModelFromUrl(url);
    });
    ```
-   **How to Trigger:**
    1.  Paste a valid model URL into the input field with `id="modelUrl"`.
    2.  Click the "Load Model" button (`#loadUrlBtn`).
-   **Verified Behavior:**
    -   **Expected:** The application fetches the model from the URL, determines the correct loader based on the file extension, and displays it in the viewer. A progress bar is shown during download.
    -   **Actual (from code):** The `loadModelFromUrl` function calls `getLoaderForUrl` to instantiate the correct `three.js` loader. It then calls the loader's `.load()` method, passing callbacks to handle progress, errors, and successful loading (`onModelLoaded`).

---

### 2. Model Loading via Drag & Drop / File Browse
-   **Feature Name:** Drag & Drop / File Browse Loading
-   **Implementation Location:**
    -   `script.js`, `loadModelFromFile(file)` method (line 488)
    -   `script.js`, event listeners for `#fileDrop` and `#fileInput` (lines 292-303)
    ```javascript
    fileDrop.addEventListener('drop', (e) => {
        e.preventDefault();
        fileDrop.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) this.loadModelFromFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) this.loadModelFromFile(e.target.files[0]);
    });
    ```
-   **How to Trigger:**
    1.  Drag a model file onto the element with `id="fileDrop"`.
    2.  OR, click the `#fileDrop` element to open a file browser and select a model file.
-   **Verified Behavior:**
    -   **Expected:** The selected local model file is read, parsed by the appropriate loader, and displayed in the viewer.
    -   **Actual (from code):** A `FileReader` reads the file `asArrayBuffer`. The `loadModelFromFile` function then uses `getLoaderForFile` to select the loader and calls its `.parse()` or `.load()` method.

---

### 3. Orbit, Zoom, Pan Controls
-   **Feature Name:** Orbit Controls
-   **Implementation Location:**
    -   `script.js`, `init()` method, instantiation of `THREE.OrbitControls` (line 120)
    ```javascript
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    ```
-   **How to Trigger:**
    -   **Rotate:** Left-click and drag.
    -   **Zoom:** Mouse wheel scroll.
    -   **Pan:** Right-click and drag.
-   **Verified Behavior:**
    -   **Expected:** Standard camera controls for 3D navigation are available.
    -   **Actual (from code):** `OrbitControls` is correctly instantiated and attached to the camera and renderer. Damping is enabled for smoother interaction.

---

### 4. Background Customization
-   **Feature Name:** Background Customization (Gradient, Solid, HDRI)
-   **Implementation Location:**
    -   `script.js`, `updateBackground(type)` method (line 386)
    -   `script.js`, event listener for `#backgroundSelect` (line 319)
    ```javascript
    document.getElementById('backgroundSelect').addEventListener('change', (e) => this.updateBackground(e.target.value));
    ```
-   **How to Trigger:**
    1.  Select "Gradient", "Solid Color", or "HDRI" from the dropdown with `id="backgroundSelect"`.
    2.  If "Solid Color" is selected, use the color picker with `id="bgColor"`.
-   **Verified Behavior:**
    -   **Expected:** The scene background changes based on the user's selection.
    -   **Actual (from code):** The `updateBackground` function uses a `switch` statement to set `this.scene.background` to either a programmatically generated `CanvasTexture` (for gradient), a `THREE.Color` (for solid), or a placeholder HDRI texture.

---

### 5. HDRI Environment Loading
-   **Feature Name:** Load HDRI Environment
-   **Implementation Location:**
    -   `script.js`, `loadEnvironment(url)` method (line 513)
    -   `script.js`, event listener for `#loadHdriBtn` (line 329)
    ```javascript
    new THREE.RGBELoader().load(url, (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        this.scene.background = texture;
        this.scene.environment = texture;
        // ...
    });
    ```
-   **How to Trigger:**
    1.  Paste a `.hdr` file URL into the input with `id="hdriUrl"`.
    2.  Click the "Load" button.
    3.  Alternatively, click one of the sample HDRI buttons.
-   **Verified Behavior:**
    -   **Expected:** The `.hdr` file is loaded and applied as the scene's background and environment map for reflections.
    -   **Actual (from code):** The `loadEnvironment` function uses `THREE.RGBELoader` to fetch and decode the HDRI file. On success, it sets both `this.scene.background` and `this.scene.environment`.

---

### 6. Bloom Post-Processing Effect
-   **Feature Name:** Bloom Effect
-   **Implementation Location:**
    -   `script.js`, `setupPostProcessing()` method (line 144)
    -   `script.js`, `animate()` method, conditional render call (line 649)
    -   `script.js`, event listener for `#bloomEnabled` (line 343)
    ```javascript
    // In setupPostProcessing()
    this.bloomPass = new THREE.UnrealBloomPass(...);
    this.bloomPass.enabled = false;
    this.composer.addPass(this.bloomPass);

    // In animate()
    if (this.composer && this.bloomPass.enabled) {
        this.composer.render();
    } else {
        this.renderer.render(this.scene, this.camera);
    }
    ```
-   **How to Trigger:**
    1.  Check the "Bloom" checkbox (`#bloomEnabled`).
    2.  Adjust the "Bloom Strength" slider (`#bloomStrength`).
-   **Verified Behavior:**
    -   **Expected:** A bloom (glow) effect is applied to bright areas of the scene.
    -   **Actual (from code):** An `EffectComposer` and `UnrealBloomPass` are configured. The `animate` loop checks if `bloomPass.enabled` is true. If so, it uses `composer.render()`; otherwise, it uses the standard `renderer.render()`.

---

### 7. "Superhero Mode"
-   **Feature Name:** Superhero Mode
-   **Implementation Location:**
    -   `script.js`, `activateSuperheroMode()` (line 656), `updateSuperheroCamera()` (line 720), `exitSuperheroMode()` (line 821) methods.
    -   `script.js`, event listener for `#superheroBtn` (line 218).
-   **How to Trigger:**
    1.  Click the button with `id="superheroBtn"`.
    2.  Optionally load a custom audio file before activating.
-   **Verified Behavior:**
    -   **Expected:** A cinematic animation plays with dramatic lighting, camera movements, and a theme song. The UI is hidden, and custom controls appear.
    -   **Actual (from code):** This is a complex state machine. `activateSuperheroMode` fades the screen, changes the background and lighting, and initiates a sequence of camera animations (`DOLLY`, `CRANE`, `ORBIT`). The `updateSuperheroCamera` function drives the animation, which can be influenced by audio analysis if an audio track is playing. `exitSuperheroMode` reverts all changes.

---

### 8. Screenshot
-   **Feature Name:** Screenshot
-   **Implementation Location:**
    -   `script.js`, `takeScreenshot()` method (line 595)
    ```javascript
    takeScreenshot() {
        this.renderer.render(this.scene, this.camera);
        const link = document.createElement('a');
        link.download = 'model-screenshot.png';
        link.href = this.renderer.domElement.toDataURL();
        link.click();
    }
    ```
-   **How to Trigger:**
    1.  Click the "Screenshot" button (`#screenshotBtn`).
-   **Verified Behavior:**
    -   **Expected:** A PNG image of the current viewer canvas is downloaded.
    -   **Actual (from code):** The `takeScreenshot` function gets a data URL from the renderer's canvas (`toDataURL()`) and programmatically creates and clicks a link to trigger a download. This is a standard and effective implementation.

---

### 9. Model Statistics
-   **Feature Name:** Model Statistics Display
-   **Implementation Location:**
    -   `script.js`, `updateModelStats(model)` method (line 551)
    -   `html`: The stats panel with ids `#vertexCount`, `#faceCount`, `#fpsCounter`.
    ```javascript
    model.traverse((child) => {
        if (child.isMesh && child.geometry) {
            // ... count vertices and faces
        }
    });
    document.getElementById('vertexCount').textContent = vertices.toLocaleString();
    ```
-   **How to Trigger:**
    1.  Load any model.
-   **Verified Behavior:**
    -   **Expected:** The "Stats" panel updates to show the vertex and face count of the loaded model. FPS is continuously updated.
    -   **Actual (from code):** After a model is loaded, `updateModelStats` is called. It traverses the model's scene graph, summing up the vertices and faces from all meshes. The `animate` loop updates the FPS counter on each frame.

---

### 10. Animation Controls
-   **Feature Name:** GLTF Animation Controls
-   **Implementation Location:**
    -   `script.js`, `onModelLoaded()` method, `AnimationMixer` setup (line 538)
    -   `script.js`, event listeners for `#playBtn`, `#pauseBtn`, `#resetBtn` (lines 352-362)
    ```javascript
    if (loadedModel.animations && loadedModel.animations.length > 0) {
        this.mixer = new THREE.AnimationMixer(model);
        loadedModel.animations.forEach(clip => {
            this.mixer.clipAction(clip).play();
        });
    }
    ```
-   **How to Trigger:**
    1.  Load a glTF model that contains animations.
    2.  Use the "Play", "Pause", and "Reset" buttons in the "Animation" accordion.
-   **Verified Behavior:**
    -   **Expected:** If a loaded model has embedded animations, they can be controlled via the UI.
    -   **Actual (from code):** In `onModelLoaded`, the code checks for an `animations` array. If present, it creates an `AnimationMixer` and plays all available animation clips. The UI buttons control the mixer's time scale (`timeScale = 1` for play, `timeScale = 0` for pause) or reset its time.
