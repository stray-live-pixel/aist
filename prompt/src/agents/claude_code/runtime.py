import json
import os
import shutil
import uuid
from pathlib import Path


ENGINE = "claude"
DISPLAY_NAME = "Claude"
CAPTURE_STDERR = False
STDIN_DEVNULL = False
DEFAULT_MODEL = os.environ.get("AGENT_AUTO_CLAUDE_MODEL") or os.environ.get("CLAUDE_AUTO_MODEL") or "claude-opus-4-7"


def binary():
    return "claude"


def default_model():
    return DEFAULT_MODEL


def display_model(model):
    return model or DEFAULT_MODEL


def model_from_meta(stage_meta, index_meta):
    return stage_meta.get("model") or index_meta.get("model") or DEFAULT_MODEL


def _project_dir(work_dir):
    cwd = str(Path(work_dir).resolve()) if work_dir else str(Path.cwd().resolve())
    sanitized = cwd.replace("/", "-")
    return Path.home() / ".claude" / "projects" / sanitized


def session_file(session_id, work_dir):
    return _project_dir(work_dir) / f"{session_id}.jsonl"


def fork_session(source_session_id, work_dir):
    src = session_file(source_session_id, work_dir)
    if not src.exists():
        raise RuntimeError(
            f"session file not found for fork: {src}. "
            "Возможно, Claude хранит сессии в другом месте или этап ещё не завершён."
        )
    new_id = str(uuid.uuid4())
    dst = _project_dir(work_dir) / f"{new_id}.jsonl"
    try:
        shutil.copyfile(src, dst)
    except OSError as exc:
        raise RuntimeError(f"failed to fork Claude session {source_session_id}: {exc}") from exc
    return new_id


def build_command(prompt, *, resume_session_id=None, model=None, work_dir=None, project_root=None):
    add_dir = work_dir or str(project_root)
    cmd = [
        "claude",
        "--permission-mode", "bypassPermissions",
        "--allow-dangerously-skip-permissions",
        "--dangerously-skip-permissions",
        "--setting-sources", "user,project,local",
        "--allowedTools",
        "Bash Read Write Edit MultiEdit Glob Grep TodoWrite NotebookEdit WebFetch WebSearch",
        "--add-dir", add_dir,
        "--effort", "high",
        "--include-partial-messages",
        "--output-format", "stream-json",
        "--verbose",
        "-p",
    ]
    if model:
        cmd.extend(["--model", model])
    if resume_session_id:
        cmd.extend(["--resume", resume_session_id])
    cmd.append(prompt)
    return cmd


def dry_run_events(fake_id, stage_index, model):
    return [
        {"type": "system", "subtype": "init", "session_id": fake_id,
         "model": model or "dry-run", "tools": ["Read", "Write", "Edit", "Bash"]},
        {"type": "assistant",
         "message": {"content": [{"type": "text", "text": f"[dry-run] stage #{stage_index}"}],
                     "usage": {"input_tokens": 1000,
                               "cache_read_input_tokens": 5000,
                               "cache_creation_input_tokens": 0}}},
        {"type": "result", "subtype": "success",
         "result": f"DRY RUN OK (stage #{stage_index})",
         "is_error": False, "num_turns": 1,
         "usage": {"input_tokens": 1100,
                   "cache_read_input_tokens": 5000,
                   "cache_creation_input_tokens": 0}},
    ]


def _format_tool_use(name, inp):
    inp = inp if isinstance(inp, dict) else {}

    def file_entry(label):
        path = inp.get("file_path", "") or ""
        fname = os.path.basename(path) if path else ""
        if path:
            return label, f"{fname} ({path})"
        return label, "(no path)"

    if name == "Read":
        return file_entry("READ")
    if name == "Write":
        return file_entry("WRITE")
    if name in ("Edit", "NotebookEdit"):
        return file_entry("EDIT")
    if name == "Bash":
        return "BASH", inp.get("command", "")
    if name == "Grep":
        pattern = inp.get("pattern", "")
        path = inp.get("path", "")
        return "GREP", f"{pattern} in {path}" if path else pattern
    if name == "Glob":
        return "GLOB", inp.get("pattern", "")
    if name == "WebFetch":
        return "FETCH", inp.get("url", "")
    if name == "WebSearch":
        return "SEARCH", inp.get("query", "")
    if name == "TodoWrite":
        todos = inp.get("todos") or []
        active = ""
        for t in todos:
            if isinstance(t, dict) and t.get("status") == "in_progress":
                active = t.get("content", "")
                break
        if active:
            return "TODO", f"{len(todos)} items, active: {active}"
        return "TODO", f"{len(todos)} items"
    if name in ("Task", "Agent"):
        return "AGENT", inp.get("description") or inp.get("prompt", "")
    if name == "ExitPlanMode":
        return "PLAN", inp.get("plan", "")
    if name == "AskUserQuestion":
        questions = inp.get("questions") or []
        first = ""
        if questions and isinstance(questions[0], dict):
            first = questions[0].get("question", "")
        return "ASK", first
    return f"TOOL:{name}", json.dumps(inp, ensure_ascii=False)


def _extract_text_content(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for chunk in content:
            if isinstance(chunk, dict) and chunk.get("type") == "text":
                parts.append(chunk.get("text", ""))
            elif isinstance(chunk, str):
                parts.append(chunk)
        return " ".join(parts)
    return ""


def handle_event(ctx, evt):
    t = evt.get("type")

    if t == "stream_event":
        ev = evt.get("event") or {}
        if ev.get("type") == "content_block_start":
            cb = ev.get("content_block") or {}
            if cb.get("type") == "thinking":
                ctx.write_entry("THINKING", "модель рассуждает (extended thinking, текст скрыт)")
        return

    if t == "system":
        sub = evt.get("subtype", "")
        if sub == "init":
            sid = evt.get("session_id")
            if sid:
                ctx.set_session_id(sid)
            model = evt.get("model", "")
            ctx.maybe_update_ctx_limit(model)
            tools = evt.get("tools") or []
            tools_preview = ", ".join(tools[:6])
            extra = f" +{len(tools) - 6}" if len(tools) > 6 else ""
            sid_short = (sid[:8] + "...") if sid else "?"
            ctx.write_entry("SYS", f"Session init id={sid_short} model={model} tools={tools_preview}{extra}")
        else:
            ctx.write_entry("SYS", f"system event: {sub or 'unknown'}")
        return

    if t == "assistant":
        msg = evt.get("message") or {}
        ctx.update_usage(msg.get("usage"))
        for block in msg.get("content") or []:
            if not isinstance(block, dict):
                continue
            bt = block.get("type")
            if bt == "text":
                txt = block.get("text", "")
                if txt.strip():
                    ctx.write_entry("ASSISTANT", txt)
            elif bt == "thinking":
                txt = block.get("thinking", "") or block.get("text", "")
                if txt.strip():
                    ctx.write_entry("THINKING", txt)
            elif bt == "tool_use":
                action, text = _format_tool_use(block.get("name", ""), block.get("input"))
                ctx.write_entry(action, text)
        return

    if t == "user":
        msg = evt.get("message") or {}
        for block in msg.get("content") or []:
            if not isinstance(block, dict) or block.get("type") != "tool_result":
                continue
            text = _extract_text_content(block.get("content"))
            if text.strip():
                ctx.write_entry("ERROR" if block.get("is_error") else "RESULT", text)
        return

    if t == "result":
        ctx.update_usage(evt.get("usage"))
        result_text = evt.get("result") or ""
        is_error = evt.get("is_error") or evt.get("subtype") == "error"
        ctx.set_result_text(result_text)
        if result_text.strip():
            ctx.write_entry("ERROR" if is_error else "DONE", result_text)
        else:
            ctx.write_entry("ERROR" if is_error else "DONE", f"Session completed (turns={evt.get('num_turns', '?')})")
        return

    ctx.write_entry("EVENT", f"type={t}")
