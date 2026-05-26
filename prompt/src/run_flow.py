#!/usr/bin/env python3
# Оркестратор flow: читает flows/<name>/, последовательно запускает этапы,
# форкает сессии выбранного агента по необходимости, обновляет <session>/flow.json.
#
# Контекст стейджа задаётся списком `contexts:` во frontmatter stage-файла.
# Каждый элемент — это {mode, from, [summary_rules]}. Применяются по порядку.
# Допустимые режимы:
#   continue       — `--resume <session_id этапа from>`. Контекст растёт.
#   continue-from  — `--resume <fork(session_id этапа from)>`. Сессия источника
#                    копируется, чтобы исходный контекст не загрязнялся.
#   summary-from   — суммаризационный прогон по форку источника, текст summary
#                    подставляется преамбулой в промпт стейджа.
# На один стейдж допускается максимум один resume-режим (continue / continue-from)
# и любое число summary-from. Если `contexts:` пуст или отсутствует — стейдж
# работает как standalone (свежая сессия, без преамбул).
import json
import os
import shutil
import subprocess
import sys
import uuid
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from agents.registry import get_backend, normalize_engine  # noqa: E402
from shared.frontmatter import parse_frontmatter  # noqa: E402
from shared.logentry import append_entry, format_entry  # noqa: E402

SRC_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = SRC_DIR.parent
PARSE_SCRIPT = SRC_DIR / "parse_agent_stream.py"

LOG_FILE = Path(os.environ.get("AGENT_AUTO_LOG_FILE") or os.environ["CLAUDE_AUTO_LOG_FILE"])
LOG_JSONL_FILE = os.environ.get("AGENT_AUTO_LOG_JSONL_FILE") or os.environ.get("CLAUDE_AUTO_LOG_JSONL_FILE", "")
STATE_FILE = Path(os.environ.get("AGENT_AUTO_STATE_FILE") or os.environ["CLAUDE_AUTO_STATE_FILE"])
FLOW_FILE = Path(os.environ.get("AGENT_AUTO_FLOW_FILE") or os.environ["CLAUDE_AUTO_FLOW_FILE"])
FLOW_WORK_DIR = Path(os.environ.get("AGENT_AUTO_FLOW_WORK_DIR") or os.environ["CLAUDE_AUTO_FLOW_WORK_DIR"])
CTX_LIMIT = int(os.environ.get("AGENT_AUTO_CTX_LIMIT") or os.environ.get("CLAUDE_AUTO_CTX_LIMIT", "200000"))
FLOW_NAME = os.environ.get("AGENT_AUTO_FLOW_NAME") or os.environ["CLAUDE_AUTO_FLOW_NAME"]
EXTRA_PROMPT = os.environ.get("AGENT_AUTO_EXTRA_PROMPT") or os.environ.get("CLAUDE_AUTO_EXTRA_PROMPT", "")
DRY_RUN = (os.environ.get("AGENT_AUTO_DRY_RUN") or os.environ.get("CLAUDE_AUTO_DRY_RUN")) == "1"
ENGINE = normalize_engine(os.environ.get("AGENT_AUTO_ENGINE") or os.environ.get("CLAUDE_AUTO_ENGINE", "claude"))
BACKEND = get_backend(ENGINE)
# --cwd прокидывается из shell launcher: рабочий каталог для процесса агента.
# Если пусто — стейджи запускаются в корне проекта-launcher'а (исторический дефолт).
WORK_DIR = (os.environ.get("AGENT_AUTO_WORK_DIR") or os.environ.get("CLAUDE_AUTO_WORK_DIR") or "").strip() or None

FLOW_WORK_DIR.mkdir(parents=True, exist_ok=True)
SEPARATOR = "-" * 62
# Режимы, которые можно перечислять в списке `contexts:` стейджа.
# `standalone` — это просто отсутствие контекстов (пустой список или нет поля).
CONTEXT_MODES = {"continue", "continue-from", "summary-from"}
# Контексты-«ресюмеры»: они задают сессию для --resume. Их максимум один на стейдж.
RESUME_MODES = {"continue", "continue-from"}

# Текущий выполняемый этап — пробрасывается в JSONL, чтобы UI мог группировать
# собственные сообщения оркестратора (FLOW/STAGE/ERROR) рядом с событиями стейджа.
current_stage_index = 0


# ──────────────────────────── helpers ────────────────────────────

def log_line(action, text, stage=None):
    """Пишет в общий лог в текстовом и JSONL форматах."""
    if stage is None:
        stage = current_stage_index
    ctx_tokens = read_ctx_tokens()
    entry = format_entry(action, text, stage, ctx_tokens, CTX_LIMIT)
    block = (
        f"[{entry['tsHuman']}] [{entry['action']}] {entry['textShort']}\n"
        f"CTX {entry['ctxK']}k/{entry['ctxLimitK']}k - {entry['ctxPct']}%\n"
        f"{SEPARATOR}\n"
    )
    with LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(block)
    append_entry(LOG_JSONL_FILE, entry)


def read_ctx_tokens():
    try:
        return int(json.loads(STATE_FILE.read_text()).get("contextTokens") or 0)
    except (OSError, ValueError, json.JSONDecodeError):
        return 0


def write_flow(state):
    tmp = FLOW_FILE.with_suffix(FLOW_FILE.suffix + ".tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, FLOW_FILE)


def agent_session_file(session_id):
    return BACKEND.session_file(session_id, WORK_DIR)


def fork_session(source_session_id):
    """Копирует .jsonl сессии источника под новым uuid и возвращает новый id.

    Бросает RuntimeError при любой неудаче — flow остановится с явной ошибкой.
    В dry-run режиме реальный файл не нужен; возвращаем синтетический id.
    """
    if DRY_RUN:
        return str(uuid.uuid4())
    return BACKEND.fork_session(source_session_id, WORK_DIR)


def display_model(model):
    return BACKEND.display_model(model)


def model_from_meta(stage_meta, index_meta):
    return BACKEND.model_from_meta(stage_meta, index_meta)


# ──────────────────────────── flow loading ────────────────────────────

def _normalize_contexts(meta, idx, fname, stage_summary_rules):
    """Парсит поле `contexts:` стейджа в список записей {mode, from, summary_rules}.

    `contexts:` — единственный поддерживаемый способ декларации. Если поле
    отсутствует или пустое, стейдж считается standalone (без --resume и без
    summary-преамбул). Старые поля `mode:` / `context_from:` больше не читаются,
    их использование — ошибка конфигурации.

    Возвращает (contexts_list, display_mode_str). display_mode идёт в UI как
    бейдж стейджа.
    """
    if "mode" in meta or "context_from" in meta:
        raise RuntimeError(
            f"stage '{fname}': legacy fields 'mode:' / 'context_from:' are no longer "
            f"supported. Use a 'contexts:' list (see flows/README.md)."
        )

    contexts_raw = meta.get("contexts")
    if not contexts_raw:
        return [], "standalone"

    if not isinstance(contexts_raw, list):
        raise RuntimeError(f"stage '{fname}': 'contexts:' must be a list")

    contexts = []
    resume_seen = 0
    for k, entry in enumerate(contexts_raw, start=1):
        if not isinstance(entry, dict):
            raise RuntimeError(
                f"stage '{fname}': context #{k} must be a mapping with 'mode:' and 'from:'"
            )
        cmode = entry.get("mode")
        if cmode not in CONTEXT_MODES:
            raise RuntimeError(
                f"stage '{fname}': context #{k} has unknown mode '{cmode}'. "
                f"Allowed: {', '.join(sorted(CONTEXT_MODES))}"
            )
        cfrom = entry.get("from")
        if cmode == "continue" and cfrom is None:
            cfrom = idx - 1
        if not isinstance(cfrom, int) or not (1 <= cfrom < idx):
            raise RuntimeError(
                f"stage '{fname}': context #{k} (mode={cmode}) requires "
                f"'from: <N>' where 1 <= N < {idx}"
            )
        if cmode in RESUME_MODES:
            resume_seen += 1
            if resume_seen > 1:
                raise RuntimeError(
                    f"stage '{fname}': only one resume context "
                    f"(continue / continue-from) is allowed per stage"
                )
        contexts.append({
            "mode": cmode,
            "from": cfrom,
            "summary_rules": entry.get("summary_rules") or stage_summary_rules,
        })

    if len(contexts) == 1:
        c = contexts[0]
        display = c["mode"] if c["mode"] == "continue" else f"{c['mode']}({c['from']})"
    else:
        display = "+".join(f"{c['mode']}({c['from']})" for c in contexts)
    return contexts, display


def load_flow(name):
    flow_dir = PROJECT_ROOT / "flows" / name
    if not flow_dir.is_dir():
        raise RuntimeError(f"flow '{name}' not found at {flow_dir}")

    index_path = flow_dir / ".index.md"
    if not index_path.exists():
        raise RuntimeError(f"missing .index.md in {flow_dir}")
    index_meta, index_body = parse_frontmatter(index_path.read_text(encoding="utf-8"))

    stage_files = index_meta.get("stages") or []
    if not stage_files:
        raise RuntimeError(f".index.md must list stages explicitly via 'stages:' (in {index_path})")

    default_summary_rules = index_meta.get("default_summary_rules") or ""
    default_model_arg = model_from_meta({}, index_meta)
    default_model = display_model(default_model_arg)

    stages = []
    for idx, fname in enumerate(stage_files, start=1):
        fpath = flow_dir / fname
        if not fpath.exists():
            raise RuntimeError(f"stage file missing: {fpath}")
        meta, body = parse_frontmatter(fpath.read_text(encoding="utf-8"))
        stage_summary_rules = meta.get("summary_rules") or default_summary_rules
        contexts, display_mode = _normalize_contexts(meta, idx, fname, stage_summary_rules)
        stage_model_arg = model_from_meta(meta, index_meta)

        stages.append({
            "index": idx,
            "file": fname,
            "title": meta.get("title") or fname,
            "mode": display_mode,
            "contexts": contexts,
            "model": display_model(stage_model_arg),
            "model_arg": stage_model_arg,
            "summary_rules": stage_summary_rules,
            "body": body.strip(),
            "status": "pending",
            "session_id": None,
            "result": None,
        })

    return {
        "name": name,
        "title": index_meta.get("title") or name,
        "description": index_meta.get("description") or "",
        "default_summary_rules": default_summary_rules,
        "default_model": default_model,
        "default_model_arg": default_model_arg,
        "index_body": index_body,
        "stages": stages,
    }


# ──────────────────────────── stage execution ────────────────────────────

def stage_info_path(stage_index):
    return FLOW_WORK_DIR / f"stage-{stage_index:02d}.info.json"


def snapshot_path(stage_index):
    return FLOW_WORK_DIR / f"stage-{stage_index:02d}.session.jsonl"


def run_agent_stage(prompt, resume_session_id=None, stage_index=None, model=None):
    """Запускает выбранный агент в JSON-режиме и пайпит вывод в парсер. Ждёт завершения.

    Возвращает (exit_code, info_dict). info_dict — содержимое stage info-файла,
    куда парсер пишет sessionId и result.
    """
    suffix = f"stage-{stage_index:02d}" if stage_index is not None else f"adhoc-{uuid.uuid4().hex[:8]}"
    info_file = FLOW_WORK_DIR / f"{suffix}.info.json"
    if info_file.exists():
        info_file.unlink()

    parser_env = os.environ.copy()
    parser_env["AGENT_AUTO_LOG_FILE"] = str(LOG_FILE)
    parser_env["AGENT_AUTO_LOG_JSONL_FILE"] = LOG_JSONL_FILE
    parser_env["AGENT_AUTO_STATE_FILE"] = str(STATE_FILE)
    parser_env["AGENT_AUTO_STAGE_INFO_FILE"] = str(info_file)
    parser_env["AGENT_AUTO_STAGE_INDEX"] = str(stage_index or 0)
    parser_env["AGENT_AUTO_CTX_LIMIT"] = str(CTX_LIMIT)
    parser_env["AGENT_AUTO_ENGINE"] = ENGINE
    parser_env["AGENT_AUTO_STAGE_MODEL"] = display_model(model)

    parser_proc = subprocess.Popen(
        ["python3", "-u", str(PARSE_SCRIPT)],
        stdin=subprocess.PIPE,
        env=parser_env,
    )

    cmd = BACKEND.build_command(
        prompt,
        resume_session_id=resume_session_id,
        model=model,
        work_dir=WORK_DIR,
        project_root=PROJECT_ROOT,
    )

    if DRY_RUN:
        log_line("DRY", f"stage #{stage_index or '?'} engine={ENGINE} model={display_model(model)} resume={resume_session_id or '-'} prompt-len={len(prompt)}")
        fake_id = str(uuid.uuid4())
        events = BACKEND.dry_run_events(fake_id, stage_index, model)
        for e in events:
            parser_proc.stdin.write((json.dumps(e) + "\n").encode("utf-8"))
        parser_proc.stdin.close()
        parser_proc.wait()
        exit_code = 0
    else:
        stderr_handle = None
        try:
            stderr_target = subprocess.STDOUT
            if getattr(BACKEND, "CAPTURE_STDERR", False):
                stderr_path = FLOW_WORK_DIR / f"{suffix}.stderr.log"
                stderr_handle = stderr_path.open("ab")
                stderr_target = stderr_handle
            agent_proc = subprocess.Popen(
                cmd,
                stdout=parser_proc.stdin,
                stderr=stderr_target,
                cwd=WORK_DIR,
                stdin=subprocess.DEVNULL if getattr(BACKEND, "STDIN_DEVNULL", False) else None,
            )
            # Закрываем родительский handle, чтобы парсер увидел EOF, когда агент закончит.
            parser_proc.stdin.close()
            exit_code = agent_proc.wait()
        finally:
            if stderr_handle is not None:
                stderr_handle.close()
        parser_proc.wait()

    info = {}
    if info_file.exists():
        try:
            info = json.loads(info_file.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            info = {}
    return exit_code, info


def build_prompt(stage, summaries=None):
    """Собирает финальный промпт стейджа.

    Порядок секций:
      1. Каждое summary из контекстов (в порядке списка, с заголовком-маркером).
      2. EXTRA_PROMPT (глобальная преамбула из CLI).
      3. Тело стейджа.
    """
    body = stage["body"].strip()
    if EXTRA_PROMPT:
        body = f"{EXTRA_PROMPT}\n\n---\n\n{body}"
    if summaries:
        chunks = [
            f"## Контекст из этапа {s['from']} (summary)\n\n{s['text'].strip()}"
            for s in summaries
        ]
        body = "\n\n---\n\n".join(chunks + [body])
    return body


def reset_ctx_state():
    """Сбрасывает STATE_FILE до 0 — у нового стейджа собственное окно контекста,
    показывать значения от предыдущего парсера некорректно."""
    try:
        limit_k = max(1, CTX_LIMIT // 1000)
        STATE_FILE.write_text(
            json.dumps({
                "contextTokens": 0,
                "contextK": 0,
                "contextLimitK": limit_k,
                "contextPct": 0,
            }),
            encoding="utf-8",
        )
    except OSError:
        pass


def _resolve_context(state, ctx, idx, stage_model):
    """Применяет одну запись контекста. Возвращает (resume_id_or_None, summary_or_None).

    Для resume-режимов выставляется resume_id; summary не собирается.
    Для summary-from делается отдельный прогон агента по форку и возвращается
    {'from': N, 'text': ...}.
    """
    cmode = ctx["mode"]
    cfrom = ctx["from"]
    src = state["stages"][cfrom - 1]
    if not src.get("session_id"):
        raise RuntimeError(
            f"cannot use stage #{src['index']} for context (mode={cmode}): no session_id"
        )

    if cmode == "continue":
        log_line("FLOW", f"continue stage #{src['index']} session={src['session_id'][:8]}…")
        return src["session_id"], None

    if cmode == "continue-from":
        forked = fork_session(src["session_id"])
        log_line("FLOW",
                 f"forked session of stage #{src['index']} ({src['session_id'][:8]}…) → {forked[:8]}…")
        return forked, None

    if cmode == "summary-from":
        rules = (ctx.get("summary_rules") or "").strip() or \
                "Сделай краткое summary по контексту: ключевые решения, изменённые файлы, открытые вопросы."
        forked = fork_session(src["session_id"])
        log_line("FLOW", f"summary-from stage #{src['index']} on fork {forked[:8]}…")
        rc_sum, info_sum = run_agent_stage(rules, resume_session_id=forked,
                                           stage_index=idx, model=stage_model)
        if rc_sum != 0:
            raise RuntimeError(f"summary call (from stage #{cfrom}) failed with exit code {rc_sum}")
        text = info_sum.get("result", "")
        if not text.strip():
            raise RuntimeError(f"summary call (from stage #{cfrom}) returned empty result")
        return None, {"from": cfrom, "text": text}

    raise RuntimeError(f"internal: unsupported context mode '{cmode}'")


def format_stage_context(stage, context_descriptions):
    """Готовит человекочитаемый блок «контекст стейджа» для UI-лога.

    Содержит prompt задачи (EXTRA_PROMPT), prompt стейджа, перечень
    использованных контекстов из предыдущих этапов: summary-from с
    промптом и текстом суммаризации, continue/continue-from — отметкой,
    что использован контекст соответствующего этапа целиком.
    """
    sections = []
    extra = (EXTRA_PROMPT or "").strip()
    sections.append("# Prompt задачи")
    sections.append(extra if extra else "(не задан)")
    sections.append("")
    sections.append("# Prompt стейджа")
    sections.append(stage["body"].strip() or "(пусто)")
    if context_descriptions:
        sections.append("")
        sections.append("# Контекст из предыдущих этапов")
        for cd in context_descriptions:
            mode = cd["mode"]
            cfrom = cd["from"]
            if mode == "continue":
                sections.append(
                    f"- этап #{cfrom} (continue): использован полный контекст предыдущего этапа"
                )
            elif mode == "continue-from":
                sections.append(
                    f"- этап #{cfrom} (continue-from): использован форк полного контекста этапа"
                )
            elif mode == "summary-from":
                sections.append(f"- этап #{cfrom} (summary-from): использована суммаризация этапа")
                rules = (cd.get("rules") or "").strip()
                if rules:
                    sections.append("  Prompt суммаризации:")
                    for line in rules.splitlines():
                        sections.append(f"    {line}")
                summary_text = (cd.get("summary_text") or "").strip()
                if summary_text:
                    sections.append("  Текст суммаризации:")
                    for line in summary_text.splitlines():
                        sections.append(f"    {line}")
    else:
        sections.append("")
        sections.append("# Контекст из предыдущих этапов")
        sections.append("(этап стартует без преамбул и без resume)")
    return "\n".join(sections)


def execute_stage(state, stage):
    global current_stage_index
    idx = stage["index"]
    current_stage_index = idx
    state["current"] = idx
    stage["status"] = "running"
    stage["startedAt"] = datetime.utcnow().isoformat() + "Z"
    write_flow(state)
    reset_ctx_state()
    log_line("STAGE", f"#{idx}/{len(state['stages'])} '{stage['title']}' (mode={stage['mode']}, model={stage['model']})")

    resume_id = None
    summaries = []
    context_descriptions = []

    for ctx in stage.get("contexts") or []:
        new_resume, summary = _resolve_context(state, ctx, idx, stage.get("model_arg"))
        cmode = ctx["mode"]
        cfrom = ctx["from"]
        if new_resume is not None:
            # Нормализация в load_flow гарантирует не более одного resume-контекста,
            # но для надёжности — повторная защита.
            if resume_id is not None:
                raise RuntimeError(
                    f"stage '{stage['file']}': multiple resume contexts produced — "
                    "only one continue/continue-from is allowed"
                )
            resume_id = new_resume
            context_descriptions.append({"mode": cmode, "from": cfrom})
        if summary is not None:
            summaries.append(summary)
            context_descriptions.append({
                "mode": cmode,
                "from": cfrom,
                "rules": (ctx.get("summary_rules") or "").strip(),
                "summary_text": summary["text"],
            })

    log_line("STAGE_CTX", format_stage_context(stage, context_descriptions))

    prompt = build_prompt(stage, summaries=summaries)
    rc, info = run_agent_stage(prompt, resume_session_id=resume_id,
                               stage_index=idx, model=stage.get("model_arg"))
    stage["session_id"] = info.get("sessionId")
    stage["result"] = info.get("result")
    stage["finishedAt"] = datetime.utcnow().isoformat() + "Z"

    if rc != 0:
        stage["status"] = "error"
        stage["error"] = f"{ENGINE} exited with code {rc}"
        raise RuntimeError(stage["error"])

    if not stage["session_id"]:
        stage["status"] = "error"
        stage["error"] = "no session_id captured from agent stream init"
        raise RuntimeError(stage["error"])

    # Снимок сессии этапа — вне зависимости от того, нужен ли он позже.
    src = agent_session_file(stage["session_id"])
    if src and src.exists():
        try:
            shutil.copyfile(src, snapshot_path(idx))
        except OSError as exc:
            log_line("WARN", f"snapshot of stage #{idx} failed: {exc}")

    stage["status"] = "done"
    write_flow(state)
    log_line("STAGE", f"#{idx} done session={stage['session_id'][:8]}…")


# ──────────────────────────── main ────────────────────────────

def main():
    try:
        flow = load_flow(FLOW_NAME)
    except RuntimeError as exc:
        log_line("ERROR", f"flow load failed: {exc}")
        write_flow({
            "flow": FLOW_NAME, "title": FLOW_NAME, "stages": [],
            "current": 0, "status": "error", "error": str(exc),
        })
        return 2

    state = {
        "flow": flow["name"],
        "title": flow["title"],
        "description": flow["description"],
        "engine": ENGINE,
        "default_model": flow["default_model"],
        "default_model_arg": flow["default_model_arg"],
        "stages": flow["stages"],
        "current": 0,
        "status": "running",
        "startedAt": datetime.utcnow().isoformat() + "Z",
    }
    write_flow(state)
    log_line("FLOW",
             f"starting '{flow['title']}' with {len(flow['stages'])} stage(s) "
             f"(default model={flow['default_model']})")

    for stage in flow["stages"]:
        try:
            execute_stage(state, stage)
        except RuntimeError as exc:
            stage["status"] = "error"
            stage["error"] = str(exc)
            state["status"] = "error"
            state["error"] = str(exc)
            write_flow(state)
            log_line("ERROR", f"stage #{stage['index']} failed: {exc}")
            return 1

    global current_stage_index
    state["status"] = "done"
    state["current"] = len(flow["stages"])
    state["finishedAt"] = datetime.utcnow().isoformat() + "Z"
    write_flow(state)
    current_stage_index = 0
    log_line("FLOW", f"completed '{flow['title']}'")
    return 0


if __name__ == "__main__":
    sys.exit(main())
