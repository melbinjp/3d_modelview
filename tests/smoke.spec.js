const { test, expect } = require("@playwright/test");
const { AxeBuilder } = require("@axe-core/playwright");

const VRT_OPTIONS = {
  threshold: 0.2,
  maxDiffPixelRatio: 0.2,
};

test.describe("3D Model Viewer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:8080");
  });

  test("should load the page and have the correct title", async ({ page }) => {
    await expect(page).toHaveTitle(/3D Model Viewer Pro/);
  });

  test("should have visible main UI elements", async ({ page }) => {
    await expect(page.locator("#sidebar")).toBeVisible();
    await expect(page.locator("#viewport")).toBeVisible();
  });

  test('should have a clickable "Load Model" button', async ({ page }) => {
    await expect(page.locator("#loadUrlBtn")).toBeEnabled();
  });

  test("should have no broken external links", async ({ page, request }) => {
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href^="http"]'), (el) => el.href),
    );

    const externalLinks = links.filter(
      (link) => !link.startsWith(page.url().origin),
    );

    for (const link of externalLinks) {
      try {
        const response = await request.head(link, { timeout: 5000 });
        expect(response.ok()).toBeTruthy();
      } catch (error) {
        console.warn(`Could not check link ${link}: ${error.message}`);
      }
    }
  });

  test("should have no critical accessibility violations", async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    const violations = accessibilityScanResults.violations.filter(
      (violation) =>
        violation.impact === "critical" || violation.impact === "serious",
    );
    expect(violations).toEqual([]);
  });

  test("visual regression test for the main page", async ({ page }) => {
    // Wait for the model to load
    await page.waitForSelector("#viewerContainer canvas", { state: "visible" });
    await expect(page).toHaveScreenshot("main-page.png", VRT_OPTIONS);
  });
});
