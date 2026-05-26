import json
import os
import uuid
from datetime import datetime
from pathlib import Path


ENGINE = "codex"
DISPLAY_NAME = "Codex"
CAPTURE_STDERR = True
STDIN_DEVNULL = True
DEFAULT_MODEL = (os.environ.get("AGENT_AUTO_CODEX_MODEL") or os.environ.get("CLAUDE_AUTO_CODEX_MODEL") or "").strip() or None


def binary():
    return "codex"


def default_model():
    return DEFAULT_MODEL


def display_model(model):
    return model or "codex-default"


def _generic_model(model):
    if not model:
        return None
    value = str(model)
    if value.startswith("claude-"):
        return None
    return value


def model_from_meta(stage_meta, index_meta):
    return (
        stage_meta.get("codex_model")
        or index_meta.get("codex_model")
        or _generic_model(stage_meta.get("model"))
        or _generic_model(index_meta.get("model"))
        or DEFAULT_MODEL
    )


def _codex_home():
    return Path(os.environ.get("CODEX_HOME") or (Path.home() / ".codex"))


def session_file(session_id, work_dir=None):
    root = _codex_home() / "sessions"
    if not root.exists():
        return None
    patterns = [
        f"rollout-*-{session_id}.jsonl",
        f"*{session_id}*.jsonl",
    ]
    matches = []
    for pattern in patterns:
        matches = list(root.rglob(pattern))
        if matches:
            break
    if not matches:
        return None
    return max(matches, key=lambda p: p.stat().st_mtime)


def fork_session(source_session_id, work_dir=None):
    src = session_file(source_session_id, work_dir)
    if src is None or not src.exists():
        raise RuntimeError(
            f"Codex session file not found for fork: {source_session_id}. "
            "Возможно, Codex хранит сессии в другом месте или этап ещё не завершён."
        )
    new_id = str(uuid.uuid4())
    if source_session_id in src.name:
        dst = src.with_name(src.name.replace(source_session_id, new_id))
    else:
        stamp = datetime.utcnow().strftime("%Y-%m-%dT%H-%M-%S")
        dst = src.with_name(f"rollout-{stamp}-{new_id}.jsonl")

    try:
        with src.open("r", encoding="utf-8") as fin, dst.open("w", encoding="utf-8") as fout:
            for line in fin:
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    fout.write(line)
                    continue
                if obj.get("type") == "session_meta":
                    payload = obj.setdefault("payload", {})
                    payload["id"] = new_id
                    payload["source"] = "fork"
                fout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    except OSError as exc:
        raise RuntimeError(f"failed to fork Codex session {source_session_id}: {exc}") from exc
    return new_id


def build_command(prompt, *, resume_session_id=None, model=None, work_dir=None, project_root=None):
    add_dir = work_dir or str(project_root)
    if resume_session_id:
        cmd = [
            "codex", "exec", "resume",
            "--json",
            "--dangerously-bypass-approvals-and-sandbox",
            "--skip-git-repo-check",
        ]
        if model:
            cmd.extend(["--model", model])
        cmd.append(resume_session_id)
    else:
        cmd = [
            "codex", "exec",
            "--json",
            "--dangerously-bypass-approvals-and-sandbox",
            "--skip-git-repo-check",
            "-C", add_dir,
            "--add-dir", add_dir,
        ]
        if model:
            cmd.extend(["--model", model])
    cmd.append(prompt)
    return cmd


def dry_run_events(fake_id, stage_index, model):
    return [
        {"type": "thread.started", "thread_id": fake_id},
        {"type": "item.completed",
         "item": {"id": "item_0", "type": "agent_message",
                  "text": f"DRY RUN OK (stage #{stage_index})"}},
        {"type": "turn.completed",
         "usage": {"input_tokens": 1100, "cached_input_tokens": 500}},
    ]


def handle_event(ctx, evt):
    t = evt.get("type")

    if t == "thread.started":
        sid = evt.get("thread_id")
        if sid:
            ctx.set_session_id(sid)
        sid_short = (sid[:8] + "...") if sid else "?"
        ctx.write_entry("SYS", f"Session init id={sid_short} engine=codex model={ctx.stage_model or 'codex-default'}")
        return

    if t == "turn.started":
        ctx.write_entry("SYS", "Codex turn started")
        return

    if t == "item.started":
        item = evt.get("item") or {}
        item_type = item.get("type", "")
        if item_type == "command_execution":
            ctx.write_entry("BASH", item.get("command", ""))
        elif item_type == "reasoning":
            ctx.write_entry("THINKING", "модель рассуждает")
        else:
            ctx.write_entry("EVENT", f"{item_type or 'item'} started")
        return

    if t == "item.completed":
        item = evt.get("item") or {}
        item_type = item.get("type", "")
        if item_type == "agent_message":
            text = item.get("text", "")
            ctx.set_result_text(text)
            if text.strip():
                ctx.write_entry("ASSISTANT", text)
            return
        if item_type == "command_execution":
            exit_code = item.get("exit_code")
            output = (item.get("aggregated_output") or "").strip()
            text = output or f"command exited with code {exit_code}"
            ctx.write_entry("ERROR" if exit_code not in (0, None) else "RESULT", text)
            return
        ctx.write_entry("EVENT", f"{item_type or 'item'} completed")
        return

    if t == "turn.completed":
        ctx.update_usage(evt.get("usage"))
        if ctx.stage_result_text.strip():
            ctx.write_entry("DONE", ctx.stage_result_text)
        else:
            ctx.write_entry("DONE", "Session completed")
        return

    if t in ("turn.failed", "error"):
        text = evt.get("message") or evt.get("error") or json.dumps(evt, ensure_ascii=False)
        ctx.write_entry("ERROR", text)
        return

    ctx.write_entry("EVENT", f"type={t}")
