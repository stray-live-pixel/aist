#!/usr/bin/env python3
# Хелпер для записи структурированных лог-событий в JSONL.
# Используется и парсером, и оркестратором flow, и shell-частью.
#
# CLI:
#   python3 logentry.py <action> <text> [stage]
# берёт AGENT_AUTO_LOG_JSONL_FILE / AGENT_AUTO_STATE_FILE /
# AGENT_AUTO_CTX_LIMIT / AGENT_AUTO_STAGE_INDEX из окружения.
import json
import os
import sys
import time
from datetime import datetime

MAX_SHORT = 100


def format_entry(action, text, stage, ctx_tokens, ctx_limit):
    if not action:
        action = "INFO"
    text = "" if text is None else str(text).rstrip()
    one_line = " ".join(text.split())
    if len(one_line) > MAX_SHORT:
        short = one_line[: MAX_SHORT - 3] + "..."
    else:
        short = one_line
    now = datetime.now()
    ts_human = now.strftime("%d-%m-%Y %H:%M:%S")
    ts_iso = now.isoformat()
    ts_ms = int(time.time() * 1000)
    ctx_tokens = int(ctx_tokens or 0)
    ctx_limit = int(ctx_limit or 200000)
    ctx_k = ctx_tokens // 1000
    limit_k = ctx_limit // 1000
    if ctx_tokens > 0 and ctx_limit > 0:
        pct = min(100, ctx_tokens * 100 // ctx_limit)
    else:
        pct = 0
    return {
        "ts": ts_iso,
        "tsHuman": ts_human,
        "tsMs": ts_ms,
        "action": action,
        "text": text,
        "textShort": short,
        "stage": int(stage or 0),
        "ctxTokens": ctx_tokens,
        "ctxK": ctx_k,
        "ctxLimitK": limit_k,
        "ctxPct": pct,
    }


def append_entry(jsonl_path, entry):
    if not jsonl_path:
        return
    try:
        with open(jsonl_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except OSError:
        pass


def _read_ctx_tokens(state_file):
    if not state_file or not os.path.exists(state_file):
        return 0
    try:
        with open(state_file, "r", encoding="utf-8") as f:
            return int(json.load(f).get("contextTokens") or 0)
    except (OSError, ValueError, json.JSONDecodeError):
        return 0


def main():
    action = sys.argv[1] if len(sys.argv) > 1 else "INFO"
    text = sys.argv[2] if len(sys.argv) > 2 else ""
    if len(sys.argv) > 3:
        stage = int(sys.argv[3])
    else:
        stage = int(os.environ.get("AGENT_AUTO_STAGE_INDEX") or os.environ.get("CLAUDE_AUTO_STAGE_INDEX", "0"))
    jsonl_file = os.environ.get("AGENT_AUTO_LOG_JSONL_FILE") or os.environ.get("CLAUDE_AUTO_LOG_JSONL_FILE", "")
    state_file = os.environ.get("AGENT_AUTO_STATE_FILE") or os.environ.get("CLAUDE_AUTO_STATE_FILE", "")
    ctx_limit = int(os.environ.get("AGENT_AUTO_CTX_LIMIT") or os.environ.get("CLAUDE_AUTO_CTX_LIMIT", "200000"))
    ctx_tokens = _read_ctx_tokens(state_file)
    entry = format_entry(action, text, stage, ctx_tokens, ctx_limit)
    append_entry(jsonl_file, entry)


if __name__ == "__main__":
    main()
