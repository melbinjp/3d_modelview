# Architecture & Data Flow

This document describes the software architecture, data flow, and runtime assumptions of the 3D Model Viewer.

## High-Level Architecture

The application follows a simple, monolithic, client-side architecture. It is not a modern web application but rather a classic "web page" that uses JavaScript to create a rich, interactive experience.

**Architectural Layers (Text-based Diagram):**

```
+------------------------------------------------------+
|                   Browser (Client)                   |
+------------------------------------------------------+
|                                                      |
|   +------------------+     +----------------------+  |
|   |    index.html    | --> |      styles.css      |  |
|   |  (DOM Structure) |     | (Visual Appearance)  |  |
|   +------------------+     +----------------------+  |
|           |                                          |
|           | Loads                                    |
|           v                                          |
|   +------------------+     +----------------------+  |
|   |    script.js     | --> |  three.js via CDN    |  |
|   | (Main App Logic) |     |  (Rendering Engine)  |  |
|   +------------------+     +----------------------+  |
|           |                                          |
|           +-----------+----------------+-----------+ |
|           |           |                |           | |
|           v           v                v           v |
|      UI Manager  State Manager  Event Listener  Renderer |
|                                                      |
+------------------------------------------------------+
```

**Components:**

1.  **Entry Point (`index.html`):** This is the single entry point for the entire application. It defines the DOM structure for the sidebar, viewport, and all UI controls. Crucially, it loads all JavaScript dependencies from a CDN via `<script>` tags in the `<head>`.
2.  **UI Layer (`styles.css` & DOM):** The UI is composed of standard HTML elements styled with a single CSS file. There is no virtual DOM or UI framework like React or Vue. All UI updates are performed by direct DOM manipulation from `script.js`.
3.  **Application Logic (`script.js`):** A single, large class `ModelViewer` contains the entire logic of the application. This "God Class" is responsible for:
    *   **State Management:** Holds all application state (e.g., `this.scene`, `this.camera`, `this.currentModel`).
    *   **Rendering:** Initializes and controls the `three.js` renderer, camera, and scene.
    *   **Asset Loading:** Contains all logic for loading 3D models and HDRI environments.
    *   **UI Binding:** Contains all event listeners that connect the HTML controls (buttons, sliders) to the application's functions.
4.  **Rendering Engine (`three.js` from CDN):** The core rendering capability is provided by the `three.js` library and its associated loaders and post-processing effects, which are all fetched from a CDN at runtime.

## Data Flow

The data flow is unidirectional and event-driven.

1.  **Initialization:**
    *   The browser loads `index.html`.
    *   The `<script>` tags in the head block rendering to fetch all `three.js` dependencies from the CDN.
    *   `script.js` is executed.
    *   The `DOMContentLoaded` event fires, creating a `new ModelViewer()` instance.
    *   The `ModelViewer` constructor initializes the `three.js` scene, renderer, camera, controls, and loads a default model.

2.  **User Interaction:**
    *   A user interacts with a UI element (e.g., clicks the "Bloom" checkbox).
    *   An event listener in `script.js` (e.g., `document.getElementById('bloomEnabled').addEventListener(...)`) captures the event.
    *   The event handler callback directly modifies the application state (e.g., `this.bloomPass.enabled = true`).
    *   The `animate()` loop, which runs on every `requestAnimationFrame`, reads the updated state and alters the rendering process accordingly (e.g., now uses `this.composer.render()` instead of `this.renderer.render()`).

## File Map

The repository structure is flat. For a developer looking to understand the code, here is a map to the key functionalities:

| Functionality | File(s) | Key Identifiers |
| --- | --- | --- |
| **Rendering Pipeline** | `script.js` | `init()`, `animate()`, `setupPostProcessing()` |
| **Camera & Controls** | `script.js` | `init()` (for `OrbitControls`), `resetCamera()`, `fitCameraToModel()` |
| **Model Loaders** | `index.html`, `script.js` | `<script>` tags for loaders, `getLoaderForExtension()` |
| **Material/Lighting** | `script.js` | `setupLighting()`, various event listeners for light controls |
| **UI Event Handling** | `script.js` | `setupEventListeners()`, `setupControlListeners()` |
| **State** | `script.js` | All properties of the `ModelViewer` class (e.g., `this.scene`) |

## Runtime Assumptions

The application makes several key assumptions about its runtime environment:

*   **Global `THREE` Object:** The code assumes that `three.js` and all its associated components (loaders, controls, effects) have been loaded from the CDN and are available on the global `window` object as `THREE`. For example, it directly calls `new THREE.Scene()` without any imports.
*   **WebGL 2.0 Support:** While not explicitly stated, the use of features like post-processing and modern PBR materials implies that a WebGL 2.0-capable browser is expected for best results. The `README.md` mentions "WebGL 2.0".
*   **Internet Connection:** An internet connection is required on first load to fetch all dependencies from the CDN. The `service-worker.js` may provide some offline capability after the first visit, but the initial run is online-only.
*   **No Build Step:** The entire architecture is predicated on the absence of a build or bundling step. All code is written to be directly executable in a browser.
