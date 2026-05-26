#!/usr/bin/env python3
# Собирает самодостаточный view.html из текущего состояния сессии:
#   - Берёт layout.html + parts/ и инлайнит их (как делает HTTP-сервер).
#   - Инлайнит styles.css и app.js, чтобы файл работал без сети.
#   - Включает данные сессии (status / ctx / flow / log / command) в виде
#     window.__AGENT_AUTO_SNAPSHOT__ — app.js видит этот глобал и работает
#     в read-only режиме (без fetch/таймера).
#
# CLI:
#   python3 snapshot.py <session_dir> [<project_root>]
import json
import sys
from pathlib import Path

PARTS = [
    ("{{HEADER}}", "header.html"),
    ("{{CTX}}", "ctx.html"),
    ("{{PIPELINE}}", "pipeline.html"),
    ("{{LOG}}", "log.html"),
]


def read_text(path):
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return ""


def read_json(path):
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def read_jsonl(path):
    if not path.exists():
        return []
    out = []
    try:
        text = path.read_text(encoding="utf-8")
    except OSError:
        return out
    for line in text.split("\n"):
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return out


def build_layout(ui_dir):
    layout = read_text(ui_dir / "layout.html")
    for marker, fname in PARTS:
        layout = layout.replace(marker, read_text(ui_dir / "parts" / fname))
    return layout


def build_snapshot_blob(session_dir):
    return {
        "session": session_dir.name,
        "command": read_text(session_dir / "command.txt").strip(),
        "status": read_json(session_dir / "status.json"),
        "ctx": read_json(session_dir / "ctx.json"),
        "flow": read_json(session_dir / "flow.json"),
        "log": read_jsonl(session_dir / "log.jsonl"),
    }


def inline_assets(html, ui_dir, snapshot_json):
    css = read_text(ui_dir / "styles.css")
    js = read_text(ui_dir / "app.js")
    html = html.replace(
        '<link rel="stylesheet" href="/src/shared/ui/styles.css" />',
        f"<style>\n{css}\n</style>",
    )
    # Внутри script </script> в данных может встретиться внутри строк — экранируем.
    safe_blob = snapshot_json.replace("</", "<\\/")
    bootstrap = (
        f"<script>window.__AGENT_AUTO_SNAPSHOT__ = {safe_blob};</script>\n"
        f'<script>\n{js}\n</script>'
    )
    html = html.replace(
        '<script src="/src/shared/ui/app.js"></script>',
        bootstrap,
    )
    return html


def main():
    if len(sys.argv) < 2:
        print("usage: snapshot.py <session_dir> [<project_root>]", file=sys.stderr)
        return 2

    session_dir = Path(sys.argv[1]).resolve()
    if not session_dir.is_dir():
        print(f"session dir not found: {session_dir}", file=sys.stderr)
        return 1

    if len(sys.argv) > 2:
        project_root = Path(sys.argv[2]).resolve()
    else:
        project_root = Path(__file__).resolve().parents[2]
    ui_dir = project_root / "src" / "shared" / "ui"

    layout = build_layout(ui_dir)
    snapshot = build_snapshot_blob(session_dir)
    snapshot_json = json.dumps(snapshot, ensure_ascii=False)
    html = inline_assets(layout, ui_dir, snapshot_json)

    out = session_dir / "view.html"
    out.write_text(html, encoding="utf-8")
    print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
