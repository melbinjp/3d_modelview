# Performance, Memory, and Compatibility Notes

This document outlines performance considerations based on a static analysis of the codebase.

**Confidence Level:** These observations are based on code inspection. No dynamic performance profiling (e.g., FPS measurement, memory heap snapshots) was conducted. Confidence is **[MEDIUM]**.

---

### Known Rendering Bottlenecks

#### 1. Un-cached Asset Loaders
-   **Observation:** A new loader instance is created every time a model is loaded.
-   **Code Location:** `script.js`, `getLoaderForExtension(extension)`
-   **Snippet:**
    ```javascript
    getLoaderForExtension(extension) {
        switch (extension) {
            case 'glb': case 'gltf': return new THREE.GLTFLoader();
            case 'fbx': return new THREE.FBXLoader();
            // ... and so on for each loader
        }
    }
    ```
-   **Impact:** While minor, instantiating new loaders repeatedly is less efficient than creating them once and reusing them. `three.js` loaders can be heavyweight objects.
-   **Suggestion:**
    -   Instantiate all required loaders once in the `ModelViewer` constructor and store them as properties (e.g., `this.gltfLoader = new THREE.GLTFLoader()`).
    -   Use a `LoadingManager` to handle all loaders, which provides centralized progress events and can improve resource management.

#### 2. Synchronous Full-Scene Traversal
-   **Observation:** The `updateModelStats` function traverses the entire scene graph of a model synchronously upon loading.
-   **Code Location:** `script.js`, `updateModelStats(model)`
-   **Snippet:**
    ```javascript
    updateModelStats(model) {
        let vertices = 0;
        let faces = 0;
        model.traverse((child) => {
            // ...
        });
        // ...
    }
    ```
-   **Impact:** For very large or complex models, this traversal could block the main thread for a noticeable amount of time, causing the UI to freeze immediately after a model finishes loading.
-   **Suggestion:** For extremely large models, this kind of analysis could be performed in a Web Worker to avoid blocking the main thread. However, for most common models, the current approach is acceptable.

#### 3. Over-rendering in `animate` loop
-   **Observation:** The `animate` loop unconditionally calls `this.renderer.render()` or `this.composer.render()` on every single frame, even if nothing in the scene has changed.
-   **Code Location:** `script.js`, `animate()`
-   **Impact:** This continuously uses CPU and GPU resources, which can drain battery on mobile devices. If the scene is static (e.g., `OrbitControls` are not moving, no animations are playing), rendering is unnecessary.
-   **Suggestion:** Implement "on-demand" rendering.
    1.  Render once when the scene changes (model loaded, lighting adjusted).
    2.  In the `animate` loop, only call `render()` if a change has occurred. `OrbitControls` has a `change` event that can be used to trigger a re-render.
    ```javascript
    // In init()
    this.controls.addEventListener('change', () => this.requestRender());

    // In animate()
    if (this.renderRequested) {
        this.renderer.render(this.scene, this.camera);
        this.renderRequested = false;
    }
    ```

---

### Memory Management Suggestions

#### 1. Lack of Resource Disposal
-   **Observation:** When a new model is loaded, the old one is removed from the scene, but its geometries, materials, and textures are not explicitly disposed of.
-   **Code Location:** `script.js`, `onModelLoaded(loadedModel)`
-   **Snippet:**
    ```javascript
    onModelLoaded(loadedModel) {
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
        }
        // ...
    }
    ```
-   **Impact:** JavaScript's garbage collector will eventually clean up unused objects, but it cannot reclaim WebGL resources (textures, materials, geometries) that are still held by the GPU. This can lead to a memory leak, where each loaded model permanently increases the GPU memory footprint.
-   **Suggestion:** Implement a proper disposal function that traverses the old model and calls `.dispose()` on all geometries, materials, and textures before loading a new one.

    ```javascript
    function disposeModel(model) {
        if (!model) return;
        model.traverse(object => {
            if (object.isMesh) {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            }
        });
        this.scene.remove(model);
    }

    // In onModelLoaded()
    if (this.currentModel) {
        disposeModel(this.currentModel);
    }
    ```

### Suggestions for Future Optimization

-   **Lazy Loading:** The application loads all 15+ JavaScript dependencies from the CDN on initial page load, even if the user never uses features like the `FBXLoader` or `STLLoader`. A build system would enable code splitting and lazy loading of less common loaders on demand.
-   **Level of Detail (LOD):** For performance with very high-poly models, `THREE.LOD` could be implemented to automatically switch to lower-poly versions of a model as the camera moves further away. This requires having multiple versions of the model asset.
-   **Instancing:** If a scene were to render many copies of the same object, `THREE.InstancedMesh` should be used to dramatically reduce draw calls and improve performance. This is not applicable to the current "single model viewer" use case but is a key technique for more complex scenes.
-   **Draco Mesh Compression:** The `GLTFLoader` supports Draco mesh compression (`.drc`), which can significantly reduce the file size of glTF models. To use it, the `DRACOLoader` must be configured and its decoder files (WASM and JavaScript) must be hosted and served. This would be a powerful addition for improving model load times.
