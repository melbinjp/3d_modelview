# Contributing

We welcome contributions to this project. Please follow these guidelines to ensure a smooth development process.

## Local Development Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/melbinjp/3d_modelview.git
    cd 3d_modelview
    ```

2.  **Install dependencies:**
    This project uses Node.js and npm. Make sure you have them installed.

    ```bash
    npm install
    ```

3.  **Install Playwright browsers:**
    Our tests use Playwright, which requires specific browser binaries.
    ```bash
    npx playwright install --with-deps
    ```

## Running Verifications

Before submitting a pull request, please ensure all local verification checks pass.

1.  **Run the linter:**
    We use Prettier to maintain a consistent code style.

    ```bash
    # Check for formatting issues
    npm run lint

    # Automatically fix formatting issues
    npm run lint:fix
    ```

2.  **Run tests:**
    Our test suite uses Playwright for end-to-end and accessibility testing.

    ```bash
    # First, start the local server
    npm start

    # In a separate terminal, run the tests
    npm test
    ```

3.  **Run Lighthouse audits:**
    To run the Lighthouse audits locally, you will need Google Chrome or Chromium installed.

    ```bash
    # First, ensure the local server is running
    npm start

    # In a separate terminal, run the audits
    npx lhci autorun
    ```

## Submitting Changes

1.  Create a new branch for your feature or bug fix.
2.  Make your changes and ensure all verification checks pass.
3.  Push your branch and open a pull request against the `main` branch.
4.  Fill out the pull request template with the required information.
