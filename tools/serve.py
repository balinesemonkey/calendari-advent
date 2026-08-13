#!/usr/bin/env python3
"""
Dev server for the prototype.

Same as `python3 -m http.server`, but it tells the browser not to cache
anything — otherwise an edit to calendar.js or calendar.css can sit
invisible behind a stale copy while you wonder why nothing changed.

    python3 tools/serve.py [port]
"""

import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "404" in (fmt % args):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4321
    print(f"serving on http://localhost:{port}")
    ThreadingHTTPServer(("", port), NoCache).serve_forever()
