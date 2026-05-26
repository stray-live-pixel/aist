#!/usr/bin/env python3
"""Parse JSON/JSONL streams from the selected agent into Auto Runner logs."""
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from agents.registry import get_backend, normalize_engine  # noqa: E402
from shared.logentry import append_entry, format_entry  # noqa: E402

LOG_FILE = os.environ.get("AGENT_AUTO_LOG_FILE") or os.environ.get("CLAUDE_AUTO_LOG_FILE", "")
LOG_JSONL_FILE = os.environ.get("AGENT_AUTO_LOG_JSONL_FILE") or os.environ.get("CLAUDE_AUTO_LOG_JSONL_FILE", "")
STATE_FILE = os.environ.get("AGENT_AUTO_STATE_FILE") or os.environ.get("CLAUDE_AUTO_STATE_FILE", "")
STAGE_INFO_FILE = os.environ.get("AGENT_AUTO_STAGE_INFO_FILE") or os.environ.get("CLAUDE_AUTO_STAGE_INFO_FILE", "")
STAGE_INDEX = int(os.environ.get("AGENT_AUTO_STAGE_INDEX") or os.environ.get("CLAUDE_AUTO_STAGE_INDEX", "0"))
CTX_LIMIT = int(os.environ.get("AGENT_AUTO_CTX_LIMIT") or os.environ.get("CLAUDE_AUTO_CTX_LIMIT", "200000"))
ENGINE = normalize_engine(os.environ.get("AGENT_AUTO_ENGINE") or os.environ.get("CLAUDE_AUTO_ENGINE", "claude"))
STAGE_MODEL = os.environ.get("AGENT_AUTO_STAGE_MODEL") or os.environ.get("CLAUDE_AUTO_STAGE_MODEL", "")
SEPARATOR = "-" * 62


class ParseContext:
    def __init__(self):
        self.ctx_tokens = 0
        self.stage_session_id = None
        self.stage_result_text = ""
        self.stage_model = STAGE_MODEL
        self.ctx_limit = CTX_LIMIT

    def context_metrics(self):
        ctx_k = self.ctx_tokens // 1000
        limit_k = self.ctx_limit // 1000
        pct = 0
        if self.ctx_tokens > 0 and self.ctx_limit > 0:
            pct = min(100, (self.ctx_tokens * 100) // self.ctx_limit)
        return ctx_k, limit_k, pct

    def write_entry(self, action, text):
        entry = format_entry(action, text, STAGE_INDEX, self.ctx_tokens, self.ctx_limit)
        block = (
            f"[{entry['tsHuman']}] [{entry['action']}] {entry['textShort']}\n"
            f"CTX {entry['ctxK']}k/{entry['ctxLimitK']}k - {entry['ctxPct']}%\n"
            f"{SEPARATOR}\n"
        )
        if LOG_FILE:
            with open(LOG_FILE, "a", encoding="utf-8") as f:
                f.write(block)
        else:
            sys.stdout.write(block)
            sys.stdout.flush()
        append_entry(LOG_JSONL_FILE, entry)

    def update_state(self):
        if not STATE_FILE:
            return
        ctx_k, limit_k, pct = self.context_metrics()
        payload = {
            "contextTokens": self.ctx_tokens,
            "contextK": ctx_k,
            "contextLimitK": limit_k,
            "contextPct": pct,
        }
        try:
            tmp = STATE_FILE + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(payload, f)
            os.replace(tmp, STATE_FILE)
        except OSError:
            pass

    def maybe_update_ctx_limit(self, model_name):
        if not model_name:
            return
        name = model_name.lower()
        detected = None
        if "[1m]" in name:
            detected = 1_000_000
        elif "[200k]" in name or "[200000]" in name:
            detected = 200_000
        if detected and detected != self.ctx_limit:
            self.ctx_limit = detected
            self.update_state()

    def write_stage_info(self):
        if not STAGE_INFO_FILE:
            return
        payload = {
            "sessionId": self.stage_session_id,
            "contextTokens": self.ctx_tokens,
            "result": self.stage_result_text,
        }
        try:
            tmp = STAGE_INFO_FILE + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False)
            os.replace(tmp, STAGE_INFO_FILE)
        except OSError:
            pass

    def set_session_id(self, session_id):
        self.stage_session_id = session_id
        self.write_stage_info()

    def set_result_text(self, text):
        self.stage_result_text = text or ""
        self.write_stage_info()

    def update_usage(self, usage):
        if not isinstance(usage, dict):
            return
        if "cached_input_tokens" in usage:
            total = usage.get("input_tokens") or 0
        else:
            total = (
                (usage.get("input_tokens") or 0)
                + (usage.get("cache_read_input_tokens") or 0)
                + (usage.get("cache_creation_input_tokens") or 0)
            )
        if total > self.ctx_tokens:
            self.ctx_tokens = total
            self.update_state()


def main():
    backend = get_backend(ENGINE)
    ctx = ParseContext()
    for raw in sys.stdin:
        line = raw.strip()
        if not line:
            continue
        try:
            evt = json.loads(line)
        except json.JSONDecodeError:
            ctx.write_entry("RAW", line)
            continue
        try:
            backend.handle_event(ctx, evt)
        except Exception as exc:  # noqa: BLE001
            ctx.write_entry("ERR", f"parse error: {exc}")


if __name__ == "__main__":
    main()
