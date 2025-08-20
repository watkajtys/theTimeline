import os
from playwright.sync_api import sync_playwright

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        file_path = os.path.abspath('index.html')
        page.goto(f'file://{file_path}')

        page.wait_for_timeout(500) # Wait for initial render

        print("Scrolling to bottom...")
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(500) # Wait for scroll handlers

        print("Getting page content...")
        content = page.content()
        print(content)

        browser.close()

if __name__ == "__main__":
    run_verification()
