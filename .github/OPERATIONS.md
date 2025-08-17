# Operations Guide

This document provides instructions for developers and maintainers on how to perform common operational tasks for this project.

## CI/CD Pipeline

The CI/CD pipeline is managed by GitHub Actions and is defined in the `.github/workflows/deploy.yml` file. The pipeline is triggered on every push and pull request to the `main` branch.

The pipeline consists of the following jobs:

- **test**: This job installs the project dependencies and runs the Playwright smoke tests. This includes accessibility checks with axe-core.
- **lighthouse**: This job runs Lighthouse audits on the production build of the site to ensure it meets the defined performance, accessibility, and SEO budgets.
- **deploy**: This job deploys the site to GitHub Pages. It is only triggered on pushes to the `main` branch and only if the `test` and `lighthouse` jobs pass.

## Running Tests Locally

To run the tests locally, you need to have Node.js and npm installed.

1.  **Install dependencies:**

    ```bash
    npm install
    ```

2.  **Install Playwright browsers:**

    ```bash
    npx playwright install --with-deps
    ```

3.  **Start the local server:**

    ```bash
    npx http-server -p 8080
    ```

4.  **Run the tests:**
    ```bash
    npx playwright test
    ```

## Deployment

Deployment is handled automatically by the CI/CD pipeline. Every push to the `main` branch that passes all the tests will be deployed to GitHub Pages.

### Manual Deployment

To perform a manual deployment, you can trigger the "CI & Deploy" workflow from the Actions tab in the GitHub repository.

### Rollback

To roll back to a previous version, you can revert the merge commit of the problematic change and push the revert commit to the `main` branch. This will trigger a new deployment with the previous version of the code.

## Secrets

This repository does not require any secrets at the moment. If secrets are added in the future, they should be documented in the `.github/SECRET_TEMPLATE.md` file and added to the repository's secrets in the GitHub settings.
