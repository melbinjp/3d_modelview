# Performance Baseline

This document contains the initial Lighthouse performance baseline for this project. The scores were generated on 2025-08-16.

## Mobile

| Category         | Score |
| ---------------- | ----- |
| Performance      | 50    |
| Accessibility    | 71    |
| Best Practices   | 83    |
| SEO              | 92    |

**Report Link:** [Lighthouse Report](https://storage.googleapis.com/lighthouse-infrastructure.appspot.com/reports/1755375476910-59339.report.html)

## Interpretation

The initial scores show that there is room for improvement, especially in the performance and accessibility categories. The performance score is low due to unminified CSS/JS, unused JavaScript, and render-blocking resources. The accessibility score is low due to missing button names and form labels.

The CI is currently configured to fail if the scores drop below the defined thresholds. The next steps will be to address the issues identified by Lighthouse to improve the scores.
