---
title: 'Refactor: Decompose monolithic script.js into modules'
labels: 'refactor, good first issue'
---

### The Problem

Currently, all frontend logic is contained in a single, 800+ line file: `script.js`. This "God class" (`ModelViewer`) handles everything from WebGL rendering and state management to UI event handling and complex animations.

This monolithic structure is a significant source of technical debt and makes the codebase:
-   **Hard to maintain:** Finding and changing code is difficult and error-prone.
-   **Difficult to debug:** It's hard to isolate the source of bugs.
-   **Impossible to test:** We cannot write unit tests for individual features.
-   **A barrier to new features:** Adding new functionality will only make the file larger and more complex.

This directly contradicts our goal of having a high-quality, maintainable codebase.

### Proposed Solution

We need to refactor `script.js` into smaller, single-responsibility ES6 modules. This will likely require introducing a simple build tool (like Vite) to handle module bundling for the browser.

**Suggested Structure:**

```
src/
├── main.js           # Main application entry point
├── viewer.js         # Core three.js logic (scene, camera, renderer)
├── ui.js             # All DOM event listeners and UI update logic
├── superhero.js      # The isolated logic for the "Superhero Mode"
└── loaders.js        # Manages and configures all three.js loaders
```

**Plan:**

1.  **Introduce Vite:** Add Vite to the project for its development server and build capabilities.
2.  **Create `src/` directory:** Move `script.js` and `styles.css` into a new `src/` directory.
3.  **Create `main.js`:** This will be the new entry point. It will import other modules and initialize the application.
4.  **Refactor `ModelViewer` into `viewer.js`:** Create a `Viewer` class in `viewer.js` that is only responsible for `three.js` related tasks.
5.  **Extract UI logic to `ui.js`:** Move all `addEventListener` calls and DOM manipulation code into a `UI` module that can be initialized from `main.js`.
6.  **Isolate "Superhero Mode":** Move all `superhero*` and related audio methods into their own `superhero.js` module.

### Definition of Done

-   The `script.js` file is removed.
-   The application logic is split into at least 4 separate modules inside a `src/` directory.
-   The application is built and served using Vite.
-   All functionality of the application remains identical to the user.
-   The `README.md` is updated with new build/development instructions.
