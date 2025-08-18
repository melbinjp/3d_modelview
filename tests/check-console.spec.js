const { test, expect } = require("@playwright/test");

test.describe("Console Check", () => {
  test("should not have any console errors", async ({ page }) => {
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("http://localhost:8080");
    await page.waitForLoadState("networkidle");

    expect(consoleErrors).toEqual([]);
  });
});
