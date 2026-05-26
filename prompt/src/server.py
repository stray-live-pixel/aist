#!/usr/bin/env python3
# HTTP-сервер веб-монитора Auto Runner.
# - GET /ui — собирает HTML из src/shared/ui/layout.html и parts/*.html.
# - GET/POST /shutdown — корректно останавливает сервер.
# - Прочие пути отдаются как статика из AGENT_AUTO_ROOT.
import http.server
import os
import sys
import threading
from pathlib import Path
from socketserver import ThreadingMixIn

HOST = os.environ.get("AGENT_AUTO_HOST") or os.environ.get("CLAUDE_AUTO_HOST", "127.0.0.1")
PORT = int(os.environ.get("AGENT_AUTO_PORT") or os.environ.get("CLAUDE_AUTO_PORT", "8765"))
ROOT = Path(os.environ.get("AGENT_AUTO_ROOT") or os.environ.get("CLAUDE_AUTO_ROOT", os.getcwd())).resolve()

UI_DIR = ROOT / "src" / "shared" / "ui"
LAYOUT_FILE = UI_DIR / "layout.html"
PARTS = {
    "{{HEADER}}": UI_DIR / "parts" / "header.html",
    "{{CTX}}": UI_DIR / "parts" / "ctx.html",
    "{{PIPELINE}}": UI_DIR / "parts" / "pipeline.html",
    "{{LOG}}": UI_DIR / "parts" / "log.html",
}

os.chdir(ROOT)


def render_ui():
    layout = LAYOUT_FILE.read_text(encoding="utf-8")
    for marker, path in PARTS.items():
        layout = layout.replace(marker, path.read_text(encoding="utf-8"))
    return layout


class Handler(http.server.SimpleHTTPRequestHandler):
    def _send_text(self, status, body, content_type="text/plain; charset=utf-8"):
        data = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _trigger_shutdown(self):
        threading.Thread(target=self.server.shutdown, daemon=True).start()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _route(self):
        return self.path.split("?", 1)[0].rstrip("/") or "/"

    def do_GET(self):
        route = self._route()
        if route == "/shutdown":
            self._send_text(200, "shutting down")
            self._trigger_shutdown()
            return
        if route in ("/ui", "/"):
            try:
                html = render_ui()
            except OSError as exc:
                self._send_text(500, f"UI render error: {exc}")
                return
            self._send_text(200, html, "text/html; charset=utf-8")
            return
        super().do_GET()

    def do_POST(self):
        if self._route() == "/shutdown":
            self._send_text(200, "shutting down")
            self._trigger_shutdown()
            return
        self._send_text(405, "method not allowed")

    def log_message(self, *args, **kwargs):
        return


class ThreadingServer(ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    try:
        server = ThreadingServer((HOST, PORT), Handler)
    except OSError as exc:
        print(f"Server failed to bind {HOST}:{PORT}: {exc}", file=sys.stderr)
        sys.exit(1)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
