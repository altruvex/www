"""Shared Playwright plumbing for the proof pages: a local static server rooted at the repo, and
the three engines. WebKit here is Playwright's WebKit build, not Safari."""
from __future__ import annotations

import contextlib
import errno
import functools
import http.server
import os
import platform
import sys
import threading
from collections.abc import Iterator
from pathlib import Path

from playwright.sync_api import Browser, sync_playwright

from config import ROOT

REPO = ROOT.parent.parent
ENGINES = ("chromium", "firefox", "webkit")


class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args) -> None:
        pass


@contextlib.contextmanager
def serve() -> Iterator[str]:
    """Serve the repo root on 127.0.0.1; yields the base URL of packages/brand-font/proofs/."""
    handler = functools.partial(_Quiet, directory=str(REPO))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    try:
        yield f"http://127.0.0.1:{httpd.server_port}/packages/brand-font/proofs/"
    finally:
        httpd.shutdown()


def _try_mkdir(path: Path) -> str | None:
    """None when `path` can be created (and is removed again), else the errno name."""
    try:
        path.mkdir()
    except OSError as e:
        return errno.errorcode.get(e.errno, str(e.errno))
    path.rmdir()
    return None


def explain_launch_failure(name: str, error: Exception) -> str:
    """The not-run reason for an engine that did not launch: the first line of Playwright's error,
    and for the one cause diagnosed on this machine (macOS: Firefox's profile service cannot use
    its application-support folder) the evidence, measured now, not remembered."""
    reason = str(error).splitlines()[0]
    if name != "firefox" or sys.platform != "darwin" or "Could not find profile folder" not in str(error):
        return reason
    root = Path.home() / "Library" / "Application Support"
    target = root / "Firefox"
    macos = f"macOS {platform.mac_ver()[0]} (Darwin {platform.release()})"
    if target.exists():
        try:
            os.listdir(target)
        except OSError as e:
            return (f"{reason} Firefox exits 1 with 'Could not find profile folder' before it reads -profile: its "
                    f"profile service needs ~/Library/Application Support/Firefox, which exists but is refused to this "
                    f"process ({errno.errorcode.get(e.errno, e.errno)} on listing) on {macos}; the folder belongs to "
                    "the installed /Applications/Firefox.app, and mkdir of that exact name was refused before it "
                    "existed (a sibling name was creatable). A fresh download (playwright install --force), "
                    "quarantine removal, a resolved profile path, XRE_PROFILE_PATH and a copy of the app under "
                    "another application name do not change it. Firefox cannot start here (no security setting "
                    "was changed to test further).")
        return reason
    denied = _try_mkdir(target)
    if denied is None:
        return reason
    sibling_denied = _try_mkdir(root / f"Firefox-probe-{os.getpid()}")
    return (f"{reason} Firefox exits 1 with 'Could not find profile folder' before it reads -profile: its profile "
            f"service must create ~/Library/Application Support/Firefox and mkdir there is refused ({denied}) on "
            f"{macos}, also from the user's own Terminal; "
            + ("a sibling folder can be created there, so the refusal is on that exact name"
               if sibling_denied is None else f"a sibling folder is refused too ({sibling_denied})")
            + ". A fresh download (playwright install --force), quarantine removal, a resolved profile path and "
              "XRE_PROFILE_PATH do not change it. Firefox cannot start here while that mkdir is refused "
              "(no security setting was changed to test further).")


@contextlib.contextmanager
def engines(names: tuple[str, ...] = ENGINES) -> Iterator[Iterator[tuple[str, Browser | None, str | None]]]:
    """Yields (name, browser, None), or (name, None, error) when the engine does not launch. A
    failed launch is recorded by the caller as not run, never as passed."""
    with sync_playwright() as pw:
        def it() -> Iterator[tuple[str, Browser | None, str | None]]:
            for name in names:
                try:
                    browser = getattr(pw, name).launch(timeout=30_000)
                except Exception as e:  # noqa: BLE001 — the message is the evidence
                    yield name, None, explain_launch_failure(name, e)
                    continue
                try:
                    yield name, browser, None
                finally:
                    browser.close()
        yield it()


def open_page(browser: Browser, url: str, width: int = 1200, height: int = 900):
    page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=2)
    page.goto(url)
    page.evaluate("document.fonts.ready.then(() => true)")
    return page
