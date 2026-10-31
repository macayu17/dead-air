"""Check the running radio and record its real generation flow.

Requires Python Playwright and Chrome. Start `npm start` before running.
"""

import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

artifacts = Path(__file__).resolve().parents[1] / "artifacts"
artifacts.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome")
    context = browser.new_context(
        viewport={"width": 1440, "height": 1100},
        record_video_dir=str(artifacts / "recordings"),
        record_video_size={"width": 1440, "height": 1100},
        accept_downloads=True,
    )
    page = context.new_page()
    errors = []
    requests = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("request", lambda request: requests.append(request.url))
    page.goto("http://127.0.0.1:8808")
    page.keyboard.press("Tab")
    expect(page.get_by_text("Skip to the radio controls")).to_be_focused()
    page.screenshot(path=str(artifacts / "desktop.png"), full_page=True)
    page.wait_for_timeout(3000)  # Leave time to read the opening in the demo.

    page.get_by_role("button", name="The empty house").click()
    expect(page.locator("#place")).to_have_value("the house where I grew up")
    expect(page.get_by_role("radio", name="Melancholy")).to_be_checked()
    page.wait_for_timeout(1500)
    page.get_by_role("button", name="The last train").click()
    expect(page.get_by_role("radio", name="Unsettling")).to_be_checked()
    page.wait_for_timeout(1500)

    with page.expect_response("**/api/transmit", timeout=240000) as pending:
        page.get_by_role("button", name="Tune in", exact=True).click()
        expect(page.locator("#display")).to_have_attribute("aria-busy", "true")
        expect(page.locator("#tune")).to_be_disabled()
        page.locator(".radio").scroll_into_view_if_needed()
    response = pending.value
    result = response.json()
    assert response.status == 200, result
    assert len(result["text"].strip()) > 20, result
    expect(page.locator("#transmission")).to_contain_text(result["text"])
    expect(page.locator("#signal")).to_have_text("● SIGNAL FOUND")
    page.evaluate("window.scrollTo(0, 0)")
    page.wait_for_timeout(1000)
    page.screenshot(path=str(artifacts / "desktop-transmission.png"), full_page=True)
    page.screenshot(path=str(artifacts / "cover.png"))
    page.wait_for_timeout(7000)
    with page.expect_download() as pending_download:
        page.get_by_role("button", name="Save transmission").click()
    download = pending_download.value
    download.save_as(str(artifacts / "sample-transmission.txt"))
    saved = (artifacts / "sample-transmission.txt").read_text(encoding="utf-8")
    assert result["text"] in saved and result["place"] in saved
    assert result["model"] in saved
    page.locator("#about").scroll_into_view_if_needed()
    page.wait_for_timeout(5000)
    video = page.video
    context.close()
    video.save_as(str(artifacts / "demo.webm"))

    mobile = browser.new_page(viewport={"width": 390, "height": 844}, reduced_motion="reduce")
    mobile.on("pageerror", lambda error: errors.append(str(error)))
    mobile.goto("http://127.0.0.1:8808")
    assert not mobile.evaluate("document.documentElement.scrollWidth > innerWidth")
    mobile.screenshot(path=str(artifacts / "mobile.png"), full_page=True)
    mobile.get_by_role("button", name="Out at sea").click()
    expect(mobile.locator("#place")).to_have_value("a lighthouse with no keeper")
    expect(mobile.get_by_role("radio", name="Strange")).to_be_checked()
    mobile.locator("#place").fill("   ")
    mobile.get_by_role("button", name="Tune in", exact=True).click()
    expect(mobile.get_by_role("alert")).to_contain_text("Leave both a place")

    mobile.get_by_role("button", name="The last train").click()
    mobile.route("**/api/transmit", lambda route: route.fulfill(status=503, content_type="application/json", body=json.dumps({"error": "Receiver unavailable (browser fault-injection check)."})))
    mobile.get_by_role("button", name="Tune in", exact=True).click()
    expect(mobile.get_by_role("alert")).to_contain_text("Receiver unavailable")
    expect(mobile.locator("#tune")).to_be_enabled()
    expect(mobile.locator("#place")).to_have_value("an abandoned railway station")
    assert not errors, errors
    assert all(url.startswith("http://127.0.0.1:8808/") for url in requests), requests
    browser.close()

(artifacts / "browser-result.json").write_text(json.dumps({
    "url": "http://127.0.0.1:8808",
    "desktop": [1440, 1100],
    "mobile": [390, 844],
    "page_errors": errors,
    "browser_requests": sorted(set(requests)),
    "transmission": result,
    "checks": ["keyboard skip link", "example notes and moods", "real model generation", "busy state", "download contents", "mobile overflow", "reduced motion", "whitespace validation", "injected HTTP error recovery"],
}, indent=2), encoding="utf-8")
print(json.dumps({"checks": "passed", "seconds": result["seconds"], "text": result["text"]}, ensure_ascii=True))
