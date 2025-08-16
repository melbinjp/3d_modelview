# Tests, CI, and Reproducibility

This document proposes a strategy for adding automated testing and continuous integration (CI) to improve the project's quality and ensure reproducibility.

---

### 1. Proposed Testing Strategy

The project currently has **zero tests**. A multi-layered testing approach is recommended.

#### a. Unit Tests
-   **Goal:** To test small, isolated pieces of logic. This is only feasible after refactoring the monolithic `script.js` into modules.
-   **Framework:** [Vitest](https://vitest.dev/) is a modern, fast, and easy-to-use test runner that is compatible with Vite.
-   **What to test:**
    -   Utility functions (e.g., test `getLoaderForExtension` to ensure it returns the correct loader class for each file type).
    -   State management logic in the refactored `Viewer` class.
    -   Complex logic, like the state machine for the "Superhero Mode".

#### b. Integration Tests
-   **Goal:** To test the interaction between different modules (e.g., does clicking a UI button correctly call a function in the `Viewer` module?).
-   **Framework:** Vitest or Jest can be used, potentially with `testing-library` to simulate DOM interactions.
-   **What to test:**
    -   Ensure that `ui.js` event handlers correctly trigger actions in `viewer.js`.
    -   Verify that the `Viewer` state is correctly reflected in the UI.

#### c. End-to-End (E2E) Smoke Test
-   **Goal:** To verify that the application as a whole is working from a user's perspective. This is the most critical first step.
-   **Framework:** [Playwright](https://playwright.dev/) is a powerful browser automation tool that can script user interactions and take screenshots.
-   **What to test:**
    -   Does the application load without console errors?
    -   Can it successfully load a default 3D model?
    -   Is the `three.js` canvas visible on the page?
    -   Does clicking a UI button have the expected effect?

---

### 2. Proposed CI Workflow (GitHub Actions)

A CI pipeline should be set up to run automatically on every push and pull request.

-   **File:** `.github/workflows/ci.yml`
-   **Jobs:**
    1.  **Lint:** Check code formatting and quality (e.g., using ESLint and Prettier).
    2.  **Build:** Run the build process (once a build system is added).
    3.  **Test:** Run the unit and integration tests.
    4.  **E2E Test:** Run the Playwright smoke test on a live server.

#### GitHub Actions Workflow Snippet

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build_and_test:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout repository
      uses: actions/checkout@v3

    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: 18

    - name: Install dependencies
      run: npm install

    # Add this job once a build tool is configured
    # - name: Build
    #   run: npm run build

    # Add this job once tests are written
    # - name: Run Unit & Integration Tests
    #   run: npm test

  e2e-test:
    runs-on: ubuntu-latest
    needs: build_and_test # This job depends on the one above

    steps:
    - name: Checkout repository
      uses: actions/checkout@v3

    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: 18

    - name: Install dependencies
      run: npm install

    - name: Install Playwright browsers
      run: npx playwright install --with-deps

    # Assumes you have a static file server to run the app
    # and the test command is configured in package.json
    - name: Run Playwright tests
      run: npm run test:e2e
```

---

### 3. Minimal Automated Smoke Test (Playwright)

This test provides a baseline guarantee that the application loads and renders a model.

-   **File:** `tests/smoke.spec.js`
-   **Setup:**
    1.  `npm install -D playwright`
    2.  `npx playwright install`
    3.  Add a static file server like `serve` (`npm install -D serve`).
    4.  Add scripts to `package.json`:
        ```json
        "scripts": {
          "serve": "serve -l 3000",
          "test:e2e": "playwright test"
        }
        ```

#### Sample Playwright Test Script

```javascript
// tests/smoke.spec.js
import { test, expect } from '@playwright/test';

test.describe('3D Model Viewer Smoke Test', () => {
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    // Capture all console error messages
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
  });

  test('should load the default model without errors', async ({ page }) => {
    // 1. Navigate to the application
    await page.goto('http://localhost:3000');

    // 2. Wait for the loading screen to disappear
    await expect(page.locator('#loadingScreen')).toBeHidden({ timeout: 10000 });

    // 3. Verify the main container is visible
    await expect(page.locator('#mainContainer')).toBeVisible();

    // 4. Verify the three.js canvas is present in the DOM
    const canvas = page.locator('#viewerContainer canvas');
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute('width');
    await expect(canvas).toHaveAttribute('height');

    // 5. Wait for a moment to ensure rendering has occurred and check stats
    await page.waitForTimeout(2000); // Wait for model to load and render
    const vertexCount = await page.locator('#vertexCount').textContent();
    expect(parseInt(vertexCount.replace(/,/g, ''), 10)).toBeGreaterThan(0);

    // 6. Assert that there were no console errors during the process
    expect(consoleErrors).toEqual([]);
  });

  test('should respond to UI interaction', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await expect(page.locator('#loadingScreen')).toBeHidden({ timeout: 10000 });

    // Check initial state of the grid
    const gridHelper = () => page.evaluate(() => window.modelViewer.gridHelper.visible);
    expect(await gridHelper()).toBe(false);

    // Click the "Show Grid" checkbox
    await page.locator('#showGrid').check();

    // Verify the state has changed
    expect(await gridHelper()).toBe(true);
  });
});
```
