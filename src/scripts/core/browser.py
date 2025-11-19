import os, json
import nodriver as uc
from dotenv import load_dotenv

load_dotenv()

browser = None
page = None


async def get_browser(force_new=False):
    global browser

    if force_new and browser:
        await closeBrowser()

    if browser is None:
        headless = os.getenv("HEADLESS", "false").lower() in ("true", "1", "yes")
        print(json.dumps({"type": "DEBUG", "message": f"Headless mode: {headless}"}), flush=True)

        user_agent = (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
        )
        profile_path = os.getenv("USER_DATA_DIR", None)

        browser = await uc.start(
            headless=headless,
            user_data_dir=profile_path,
            browser_args=[
                f"--user-agent={user_agent}",
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-features=VizDisplayCompositor",
                "--disable-blink-features=AutomationControlled",
                "--lang=en-US",
                "--no-first-run",
                "--no-default-browser-check"
            ],
            window_size=(1920, 1080)
        )
    return browser


async def get_main_tab():
    b = await get_browser()
    if b.main_tab is None and len(b.tabs) > 0:
        return b.tabs[0]
    return b.main_tab or await b.get("about:blank")


async def closeBrowser():
    global browser, page
    if browser:
        try:
            await browser.stop()
        except Exception:
            pass
    browser, page = None, None


def set_page(new_page):
    global page
    page = new_page


def get_page():
    global page
    return page

