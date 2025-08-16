# Supported Formats, Dependencies, and Environment

This document details the file formats, software dependencies, and runtime environment required for the 3D Model Viewer.

## Supported Model Formats

The viewer is configured to load the following model formats, based on the loaders included in `index.html` and referenced in `script.js`.

| Format | Extension(s) | Loader Implementation | Confidence |
| --- | --- | --- | --- |
| glTF | `.gltf`, `.glb` | `THREE.GLTFLoader` | [HIGH] |
| FBX | `.fbx` | `THREE.FBXLoader` | [HIGH] |
| OBJ | `.obj` | `THREE.OBJLoader` | [HIGH] |
| COLLADA | `.dae` | `THREE.ColladaLoader` | [HIGH] |
| STL | `.stl` | `THREE.STLLoader` | [HIGH] |
| PLY | `.ply` | `THREE.PLYLoader` | [HIGH] |

**Note:** While the loaders are present, successful parsing depends on the model's complexity and conformance to the format's specification.

## Browser & Environment Requirements

-   **Browser:** Any modern, evergreen browser that supports WebGL 2.0. The `README.md` claims support for Chrome 51+, Firefox 51+, Safari 10+, and Edge 79+.
-   **Node.js:** Not required for running the application, as it is a client-side only project. Node.js is only necessary for development if a build system is introduced.

## Dependencies

The project has no `package.json` and uses no build system. All dependencies are loaded directly from a CDN in `index.html`.

### CDN Dependencies

| Library | Version | URL |
| --- | --- | --- |
| three.js (core) | r128 | `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js` |
| GLTFLoader.js | 0.128.0 | `https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js` |
| FBXLoader.js | 0.128.0 | `https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/FBXLoader.js` |
| OBJLoader.js | 0.128.0 | `https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js` |
| MTLLoader.js | 0.128.0 | `https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/MTLLoader.js` |
| ColladaLoader.js | 0.128.0 | `https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/ColladaLoader.js` |
| STLLoader.js | 0.128.0 | `https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js` |
| PLYLoader.js | 0.128.0 | `https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/PLYLoader.js` |
| RGBELoader.js | 0.128.0 | `https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/RGBELoader.js` |
| OrbitControls.js | 0.128.0 | `https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js` |
| EffectComposer.js| 0.128.0 | `https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/EffectComposer.js` |
| RenderPass.js | 0.128.0 | `https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/RenderPass.js` |
| UnrealBloomPass.js| 0.128.0 | `https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/postprocessing/UnrealBloomPass.js` |
| (and others...) | 0.128.0 | *(various other post-processing scripts from the same CDN)* |

### Dependency Health Check

To analyze the dependencies, a `package.json` was created and `three@0.128.0` was installed.

#### `npm audit`

The audit checks for known security vulnerabilities.

```
$ npm audit
found 0 vulnerabilities
```
**Result:** [CONFIDENCE: HIGH] The installed version of `three.js` has no known security vulnerabilities.

#### `npm outdated`

The outdated check sees if a newer version of the package is available.

```
$ npm outdated
Package  Current   Wanted   Latest  Location            Depended by
three    0.128.0  0.128.0  0.165.0  node_modules/three  app
```
**Result:** [CONFIDENCE: HIGH] The `three.js` version (r128) used in this project is **severely outdated**. The latest version is `r165` (as of this analysis). Upgrading is highly recommended to get access to new features, bug fixes, and performance improvements.

## Build & Run Commands

**There is no build process.**

To run the application:
1.  Clone the repository.
2.  Open the `index.html` file in a modern web browser.

No environment variables or external services are required.
