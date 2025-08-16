# Secret Template

This document lists the secrets required for the CI/CD pipeline and other automated processes in this repository.

To add a secret, go to the "Settings" tab of the repository, then navigate to "Secrets and variables" > "Actions" and click on "New repository secret".

| Secret Name             | Description                                                                                                                              | Required |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `LHCI_GITHUB_APP_TOKEN` | A GitHub App token with `statuses:write` permission. This is required for Lighthouse CI to post status checks to pull requests. (Optional) | No       |

Currently, no secrets are strictly required for the basic functionality of the CI/CD pipeline. The `LHCI_GITHUB_APP_TOKEN` is optional and is only needed if you want Lighthouse CI to post detailed status checks on pull requests.
