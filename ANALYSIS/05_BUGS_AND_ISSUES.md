# Bugs, UX Issues, and Incorrect/Missing Behavior

This document lists identified issues with the codebase, architecture, and user experience.

---

### Issue #1: Monolithic Codebase
-   **Title:** All application logic is in a single, 800+ line `script.js` file.
-   **Severity:** Critical
-   **Reproduction Steps:**
    1.  Open `script.js`.
    2.  Observe that a single class `ModelViewer` contains all logic for rendering, UI event handling, state management, animation, and special effects.
-   **Expected vs. Actual Behavior:**
    -   **Expected:** A production-ready application should have a modular codebase, with logic separated into different files and modules based on responsibility (e.g., `viewer.js`, `ui.js`, `loaders.js`).
    -   **Actual:** The entire application is contained in one file. This makes the code extremely difficult to read, maintain, debug, and test. It directly contradicts the `README.md`'s claim of "Enterprise-grade code quality."
-   **Root Cause Hypothesis:** The project was likely written as a single-file prototype and never refactored as it grew in complexity. The lack of a build system encourages this monolithic anti-pattern.
-   **Suggested Fix:**
    1.  Introduce a modern build tool like Vite.
    2.  Convert the JavaScript to use ES6 modules (`import`/`export`).
    3.  Refactor `script.js` into multiple smaller files, each with a single responsibility:
        -   `main.js`: The application entry point.
        -   `viewer.js`: A class responsible for `three.js` scene setup, rendering, and model operations.
        -   `ui.js`: A module or class for handling all DOM event listeners and UI updates.
        -   `superhero.js`: A separate module for the complex "Superhero Mode" logic.
-   **Tests to Add:**
    -   **Unit Tests:** After refactoring, unit tests could be written for specific functions (e.g., testing the `getLoaderForExtension` logic).
    -   **Integration Tests:** Test the interaction between the `Viewer` and `UI` modules.

---

### Issue #2: Misleading and Inaccurate README
-   **Title:** The `README.md` contains exaggerated claims and references non-existent files.
-   **Severity:** High
-   **Reproduction Steps:**
    1.  Read `README.md`.
    2.  Note claims like "Production Ready" and "Enterprise-grade code quality".
    3.  Note references to files like `DEPLOYMENT.md` and a `docs/` directory.
    4.  Run `ls` in the repository root.
-   **Expected vs. Actual Behavior:**
    -   **Expected:** The `README.md` should be an accurate, professional, and sober description of the project's current state, features, and limitations. All links should point to existing files.
    -   **Actual:** The `README.md` reads like a marketing document, which sets false expectations for developers. It also contains broken links to `DEPLOYMENT.md` and `docs/`, which do not exist.
-   **Root Cause Hypothesis:** The `README.md` was likely written as an aspirational goal for the project, or copied from another project template, and was never updated to reflect the actual state of the repository.
-   **Suggested Fix:**
    -   Rewrite the `README.md` to be factual.
    -   Remove unsupported claims ("Production Ready," "Enterprise-grade").
    -   Replace the non-existent file links with either the actual content (e.g., add a "Deployment" section) or remove them.
    -   Add a "Development" section that explains the lack of a build step and how to work with the code.
-   **Tests to Add:** Not applicable for a documentation change, but a CI step to lint for broken links in Markdown could be added.

---

### Issue #3: Severely Outdated Dependencies
-   **Title:** `three.js` dependency is at version `r128`, while the latest is `r165+`.
-   **Severity:** High
-   **Reproduction Steps:**
    1.  Inspect `index.html`.
    2.  Observe the CDN URL: `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`.
-   **Expected vs. Actual Behavior:**
    -   **Expected:** A project should aim to use recent, stable versions of its core dependencies to benefit from bug fixes, security patches, and performance improvements.
    -   **Actual:** The version of `three.js` is several years and dozens of releases old. This introduces significant risk and means the project is missing out on major features and improvements in the `three.js` ecosystem.
-   **Root Cause Hypothesis:** The project was created with `r128` and has not been maintained since.
-   **Suggested Fix:**
    -   As part of introducing a build system, manage `three.js` via `npm`.
    -   Upgrade `three.js` to the latest version (`npm install three@latest`).
    -   Update the code to handle any breaking changes from the `three.js` upgrade. This is a non-trivial task and will require careful testing.
-   **Tests to Add:**
    -   **E2E / Smoke Test:** A simple test that loads a model and verifies it renders would be crucial to catch regressions after a major dependency upgrade.

---

### Issue #4: No Error Handling for Failed CDN Loads
-   **Title:** The application will fail with a blank screen if the CDN is unreachable.
-   **Severity:** Medium
-   **Reproduction Steps:**
    1.  Simulate a network error or block access to `cdnjs.cloudflare.com` or `cdn.jsdelivr.net`.
    2.  Load `index.html`.
-   **Expected vs. Actual Behavior:**
    -   **Expected:** The application should detect that its core dependencies failed to load and display a user-friendly error message (e.g., "Could not connect to the server. Please check your internet connection and try again.").
    -   **Actual:** The page will be blank and the browser's developer console will show `ReferenceError: THREE is not defined`. The user sees nothing.
-   **Root Cause Hypothesis:** The `<script>` tags are loaded without any error handling or fallback mechanisms.
-   **Suggested Fix:**
    -   **Short-term:** Add `onerror` attributes to the `<script>` tags to trigger a function that displays an error message in the DOM.
    -   **Long-term:** Introducing a build system and bundling dependencies from `npm` is the robust solution, as it removes the runtime dependency on a third-party CDN.
-   **Tests to Add:** An E2E test that uses network interception to simulate a failed CDN load and asserts that an error message is visible.
