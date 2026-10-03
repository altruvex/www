"""Download the pinned upstream sources into sources/ and verify their SHA-256.

Usage: uv run python tools/fetch.py
"""
from __future__ import annotations

import hashlib
import sys
import urllib.request

from config import load


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def verify_sources(cfg) -> None:
    """Raise if any pinned source file is missing or its hash differs."""
    for key, src in cfg.sources.items():
        for kind, f in src.files.items():
            p = src.path(key, kind)
            if not p.exists():
                raise SystemExit(f"missing source {p} — run tools/fetch.py")
            got = sha256(p.read_bytes())
            if got != f.sha256:
                raise SystemExit(f"SHA-256 mismatch for {p}\n  expected {f.sha256}\n  got      {got}")


def main() -> None:
    cfg = load()
    for key, src in cfg.sources.items():
        for kind, f in src.files.items():
            p = src.path(key, kind)
            if p.exists() and sha256(p.read_bytes()) == f.sha256:
                print(f"ok      {p.relative_to(p.parents[2])}")
                continue
            with urllib.request.urlopen(f.url) as r:
                data = r.read()
            got = sha256(data)
            if got != f.sha256:
                sys.exit(f"SHA-256 mismatch for {f.url}\n  expected {f.sha256}\n  got      {got}")
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(data)
            print(f"fetched {p.relative_to(p.parents[2])}")


if __name__ == "__main__":
    main()
