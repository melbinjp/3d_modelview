
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    # Capture console logs
    page.on("console", lambda msg: print(f"Browser console: {msg.text}"))

    page.goto("http://localhost:8080")

    try:
        # Wait for the modelViewer object to be available on the window
        page.wait_for_function("window.modelViewer && window.modelViewer.assetManager")

        # Use page.evaluate to call the application's internal methods directly
        page.evaluate('''async () => {
            const sample = await window.modelViewer.assetManager.onlineLibraryManager.getSampleModel('duck');
            if (sample) {
                await window.modelViewer.assetManager.loadAssetFromLibrary(sample);
            } else {
                console.error('Sample model "duck" not found!');
            }
        }''')

        # Wait for the model to load and render
        page.wait_for_timeout(10000)

        page.screenshot(path="jules-scratch/verification/verification.png")
    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error_screenshot.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
