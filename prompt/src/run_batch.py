#!/usr/bin/env python3
# Batch-оркестратор: читает runs/<name>/.index.md и для каждой задачи
# запускает единый shell launcher с --flow <flow> --cwd <dir> "<task body>".
#
# .index.md (frontmatter):
#   ---
#   title: Sprint 42 backlog            # опционально
#   dir: /abs/path/to/project           # обязательно
#   repeat: 3                           # опционально, run-level: внешний цикл
#   tasks:
#     - task: issues/refactor-foo.md    # путь относительно runs/<name>/
#       flow: example                   # имя flow в flows/<flow>/
#       repeat: 10                      # опционально, task-level: внутренний цикл
#     - task: issues/add-bar.md
#       flow: code-review
#   ---
#
# Зацикливание:
#   - run.repeat = R, task.repeat = T → задача исполняется R*T раз.
#   - Порядок: outer-iter 1 [t1×T, t2×T, …], outer-iter 2 [t1×T, …], … outer R.
#   - Файл задачи переезжает из issues/ в done/ ТОЛЬКО после последней
#     outer-итерации, при условии что все T внутренних итераций этой outer-итерации
#     отработали успешно.
#   - Если хотя бы одна внутренняя итерация упала, задача в этой outer-итерации
#     помечается failed; на следующей outer-итерации попытка повторяется.
import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from shared.frontmatter import parse_frontmatter  # noqa: E402

SRC_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = SRC_DIR.parent
LAUNCHER = PROJECT_ROOT / "agent-auto.sh"


def fail(msg, code=1):
    print(f"[runs] error: {msg}", file=sys.stderr)
    return code


def _coerce_repeat(raw, where):
    """Принимает None/int/str с числом, возвращает положительный int. По умолчанию 1."""
    if raw is None or raw == "":
        return 1
    try:
        n = int(raw)
    except (TypeError, ValueError):
        raise RuntimeError(f"{where}: 'repeat' must be a positive integer (got {raw!r})")
    if n < 1:
        raise RuntimeError(f"{where}: 'repeat' must be >= 1 (got {n})")
    return n


def load_index(run_dir):
    index = run_dir / ".index.md"
    if not index.exists():
        raise RuntimeError(f"missing .index.md in {run_dir}")
    meta, _ = parse_frontmatter(index.read_text(encoding="utf-8"))

    raw_dir = meta.get("dir")
    if not raw_dir or not isinstance(raw_dir, str):
        raise RuntimeError("'dir:' is required in .index.md (absolute path or path relative to the run folder)")

    work_dir = Path(os.path.expanduser(raw_dir))
    if not work_dir.is_absolute():
        work_dir = (run_dir / work_dir).resolve()
    else:
        work_dir = work_dir.resolve()
    if not work_dir.is_dir():
        raise RuntimeError(f"working directory not found: {work_dir}")

    run_repeat = _coerce_repeat(meta.get("repeat"), "run")

    raw_tasks = meta.get("tasks") or []
    if not raw_tasks:
        raise RuntimeError("'tasks:' is empty or missing in .index.md")

    tasks = []
    for i, t in enumerate(raw_tasks, 1):
        if not isinstance(t, dict):
            raise RuntimeError(f"task #{i}: expected mapping with 'task:' and 'flow:', got {t!r}")
        task_path = t.get("task")
        flow_name = t.get("flow")
        if not task_path or not flow_name:
            raise RuntimeError(f"task #{i}: both 'task:' and 'flow:' are required (got {t!r})")
        tasks.append({
            "index": i,
            "task": str(task_path),
            "flow": str(flow_name),
            "repeat": _coerce_repeat(t.get("repeat"), f"task #{i}"),
        })

    return {
        "work_dir": work_dir,
        "tasks": tasks,
        "title": meta.get("title") or run_dir.name,
        "repeat": run_repeat,
    }


def split_passthrough(argv):
    """argv: всё после имени run. Поддерживается '--' как разделитель,
    после которого идут «extra prompt args» для launcher-а (на случай, если
    пользователь захочет приклеить что-то к каждой задаче дополнительно).
    """
    if "--" in argv:
        idx = argv.index("--")
        return argv[:idx], argv[idx + 1:]
    return argv, []


def _resolve_task_path(run_dir, task_rel):
    """Преобразует относительный путь задачи в абсолютный с проверкой,
    что он не «вылезает» из каталога рана. Возвращает Path или None,
    если путь невалиден.
    """
    task_path = (run_dir / task_rel).resolve()
    try:
        task_path.relative_to(run_dir.resolve())
    except ValueError:
        return None
    return task_path


def _move_to_done(task_path, run_dir, issues_dir, done_dir, dedup_key):
    """Переносит задачу в done/, сохраняя структуру внутри issues/."""
    try:
        rel_inside = task_path.relative_to(issues_dir.resolve())
        dest = done_dir / rel_inside
    except ValueError:
        dest = done_dir / task_path.name

    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        dest = dest.with_name(f"{dest.stem}.{dedup_key}{dest.suffix}")
    shutil.move(str(task_path), str(dest))
    return dest


def _run_task_iter(task, body, work_dir, passthrough, extra_prompt_args):
    """Один subprocess-запуск shell launcher для задачи. Возвращает exit code."""
    cmd = [str(LAUNCHER), "--flow", task["flow"], "--cwd", str(work_dir)]
    cmd.extend(passthrough)
    cmd.append(body)
    cmd.extend(extra_prompt_args)
    return subprocess.call(cmd)


def main():
    if len(sys.argv) < 2:
        return fail("usage: run_batch.py <run-name> [passthrough flags] [-- extra prompt args]", 2)

    run_name = sys.argv[1]
    passthrough, extra_prompt_args = split_passthrough(sys.argv[2:])

    run_dir = PROJECT_ROOT / "runs" / run_name
    if not run_dir.is_dir():
        return fail(f"run '{run_name}' not found at {run_dir}")

    try:
        cfg = load_index(run_dir)
    except RuntimeError as exc:
        return fail(str(exc))

    work_dir = cfg["work_dir"]
    tasks = cfg["tasks"]
    run_repeat = cfg["repeat"]
    issues_dir = run_dir / "issues"
    done_dir = run_dir / "done"
    done_dir.mkdir(exist_ok=True)

    total_iters = sum(t["repeat"] for t in tasks) * run_repeat
    repeat_note = f" (run repeat={run_repeat})" if run_repeat > 1 else ""
    print(f"[runs] {cfg['title']}: {len(tasks)} task(s){repeat_note}, "
          f"~{total_iters} agent run(s) → cwd={work_dir}")

    # failed: список (outer_iter, task_rel, reason) — можно повторить на следующей outer.
    # done_moved: множество task_rel, уже унесённых в done (на случай если пользователь
    # руками положит что-то ещё или для будущих ре-сценариев).
    failed = []
    done_moved = set()

    for outer in range(1, run_repeat + 1):
        is_last_outer = (outer == run_repeat)
        outer_label = f"[iter {outer}/{run_repeat}] " if run_repeat > 1 else ""
        if run_repeat > 1:
            print(f"\n[runs] ===== {outer_label}starting outer iteration =====")

        for t in tasks:
            idx = t["index"]
            task_rel = t["task"]
            flow_name = t["flow"]
            task_repeat = t["repeat"]

            if task_rel in done_moved:
                continue

            task_path = _resolve_task_path(run_dir, task_rel)
            if task_path is None:
                print(f"[runs] [{idx}] skip: task path escapes run dir: {task_rel}",
                      file=sys.stderr)
                failed.append((outer, task_rel, "path escapes run dir"))
                continue
            if not task_path.exists():
                print(f"[runs] [{idx}] skip: task file not found: {task_path}",
                      file=sys.stderr)
                failed.append((outer, task_rel, "file not found"))
                continue

            flow_dir = PROJECT_ROOT / "flows" / flow_name
            if not flow_dir.is_dir():
                print(f"[runs] [{idx}] skip: flow '{flow_name}' not found at {flow_dir}",
                      file=sys.stderr)
                failed.append((outer, task_rel, f"flow '{flow_name}' missing"))
                continue

            body = task_path.read_text(encoding="utf-8")

            all_passed = True
            for inner in range(1, task_repeat + 1):
                if task_repeat > 1 or run_repeat > 1:
                    pass_label = f"pass {inner}/{task_repeat}" if task_repeat > 1 else "pass"
                    print(f"\n[runs] === {outer_label}[task {idx}/{len(tasks)}] "
                          f"{pass_label} flow={flow_name} task={task_rel} ===")
                else:
                    print(f"\n[runs] === [task {idx}/{len(tasks)}] "
                          f"flow={flow_name} task={task_rel} ===")

                rc = _run_task_iter(t, body, work_dir, passthrough, extra_prompt_args)
                if rc != 0:
                    print(f"[runs] [{idx}] iter outer={outer} inner={inner} "
                          f"FAILED (exit={rc})", file=sys.stderr)
                    failed.append((outer, task_rel, f"exit={rc} on inner #{inner}"))
                    all_passed = False
                    break

            if not all_passed:
                # Задача упала в этой outer-итерации. Не двигаем в done; на
                # следующей outer-итерации попробуем ещё раз.
                continue

            # Все внутренние итерации этой outer-итерации прошли. Двигаем в done
            # только если это последняя outer-итерация — иначе задача нужна для
            # следующих обходов списка.
            if is_last_outer:
                dest = _move_to_done(task_path, run_dir, issues_dir, done_dir,
                                     dedup_key=idx)
                done_moved.add(task_rel)
                print(f"[runs] [{idx}] done → {dest.relative_to(run_dir)}")

    # Сводка. Учитываем, что одна и та же задача могла фигурировать в `failed`
    # на ранних outer-итерациях, но в итоге всё равно уехать в done.
    unresolved = sorted({tr for (_, tr, _) in failed} - done_moved)
    if unresolved:
        print(f"\n[runs] finished; {len(unresolved)} task(s) did not complete:",
              file=sys.stderr)
        for tr in unresolved:
            reasons = [f"outer={o}: {r}" for (o, t, r) in failed if t == tr]
            print(f"  - {tr}\n      " + "\n      ".join(reasons), file=sys.stderr)
        return 1

    if run_repeat > 1:
        print(f"\n[runs] all {len(tasks)} task(s) completed across "
              f"{run_repeat} outer iteration(s).")
    else:
        print(f"\n[runs] all {len(tasks)} task(s) completed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
