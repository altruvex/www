#!/usr/bin/env python3
"""Serve this prototype folder with the headers production sends.

    python3 serve.py            # http://127.0.0.1:8741/d-self-audit.html
    python3 serve.py 9000       # another port

The header set mirrors apps/www/next.config.ts `headers()` (the "/(.*)" rule and
the catch-all Cache-Control) as of 2026-09-27, with one exception:

  Content-Security-Policy is WITHHELD. Production's policy (apps/www/lib/config/csp.ts)
  allows fonts from 'self' only and adds upgrade-insecure-requests. This prototype loads
  its fonts from Google Fonts and runs on plain HTTP, so sending that policy would break
  the page. The server names what it withholds in `X-Prototype-Withheld`, and
  d-self-audit.html reads that header and says "not sent by the prototype server"
  instead of pretending the header arrived.
"""

import http.server
import os
import sys

PRODUCTION_HEADERS = [
    ("Cache-Control", "public, max-age=0, must-revalidate"),
    ("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload"),
    ("Cross-Origin-Opener-Policy", "same-origin"),
    ("X-Content-Type-Options", "nosniff"),
    ("X-Frame-Options", "DENY"),
    ("Referrer-Policy", "strict-origin-when-cross-origin"),
    ("Permissions-Policy", "camera=(), microphone=(), geolocation=()"),
    ("X-DNS-Prefetch-Control", "on"),
]

WITHHELD = ["Content-Security-Policy"]


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        for key, value in PRODUCTION_HEADERS:
            self.send_header(key, value)
        self.send_header("X-Prototype-Withheld", ", ".join(WITHHELD))
        super().end_headers()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8741
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Serving on http://127.0.0.1:{port}/d-self-audit.html  (Ctrl+C to stop)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
