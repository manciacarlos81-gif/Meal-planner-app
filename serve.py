#!/usr/bin/env python3
"""Tiny static server for Mealwise, with caching disabled.

`python3 -m http.server` sends Last-Modified and lets the browser cache
aggressively, which means edits to the JS and CSS silently don't show up —
you end up debugging a stale copy of your own app. This sends no-store on
everything instead.

    python3 serve.py [port]

Then open http://localhost:8765
"""
import sys
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # Quieter than the default one-line-per-request firehose.
        if len(args) > 1 and str(args[1]).startswith(("4", "5")):
            super().log_message(fmt, *args)


if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = ThreadingHTTPServer(("127.0.0.1", PORT), NoCacheHandler)
    print("Mealwise running at http://localhost:%d  (Ctrl-C to stop)" % PORT)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")
