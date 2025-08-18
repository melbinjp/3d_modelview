# Operations Runbook

This document provides instructions for operating and maintaining the application.

## Smoke Checks

Smoke tests are critical-path checks that ensure the application is running correctly after a deployment.

1.  **Run Local Smoke Tests:**
    The full test suite can be run as a smoke check. This verifies UI components, accessibility, and visual regressions.

    ```bash
    # Ensure the application is running on localhost:8080
    npm start

    # In a separate terminal, run the tests
    npm test
    ```

2.  **Manual Smoke Checks:**
    - Navigate to the deployed URL.
    - Verify that the main page loads without errors.
    - Confirm that the 3D model viewport is visible.
    - Click the "Load Model" button and ensure the file picker dialog opens.

## Deployment

The application is deployed automatically to GitHub Pages on every push to the `main` branch, provided all CI checks (lint, test, lighthouse) pass.

- **Triggering a Deployment:** Merge a pull request into the `main` branch.
- **Monitoring a Deployment:** Check the status of the "CI & Deploy" workflow in the [Actions tab](https://github.com/melbinjp/3d_modelview/actions) of the repository.

## Rollback Plan

In the event of a faulty deployment, the quickest way to roll back is to revert the commit that triggered the deployment.

1.  **Identify the faulty commit:**
    Find the commit hash of the pull request that was merged to `main`.

2.  **Revert the commit:**

    ```bash
    # Create a new commit that reverts the changes
    git revert <faulty-commit-hash>
    ```

3.  **Push the revert commit:**
    ```bash
    git push origin main
    ```
    This will trigger a new deployment with the reverted code, effectively rolling back the application to its previous state.
