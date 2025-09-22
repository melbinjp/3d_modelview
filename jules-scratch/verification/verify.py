import time
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    page.goto("http://0.0.0.0:3000")

    time.sleep(10)

    page.screenshot(path="jules-scratch/verification/screenshot.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
