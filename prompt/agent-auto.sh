#!/usr/bin/env sh
set -eu

# Unified launcher for supported coding agents.
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SRC_DIR="$SCRIPT_DIR/src"
SHARED_DIR="$SRC_DIR/shared"

AGENT_AUTO_RAW_CMD=$(python3 -c '
import shlex, sys
print(" ".join(shlex.quote(a) for a in sys.argv[1:]))' "$0" "$@" 2>/dev/null || printf '%s' "$0 $*")
export AGENT_AUTO_RAW_CMD

MODE="autonomous"
ENGINE="${AGENT_AUTO_ENGINE:-${CLAUDE_AUTO_ENGINE:-claude}}"
MONITOR=0
HTML_UI=0
LOG_DIR=""
LOG_FILE=""
PORT=8765
HOST="127.0.0.1"
FLOW_NAME=""
RUN_NAME=""
WORK_DIR=""
DRY_RUN=0

for module in core.sh terminal.sh html.sh flow.sh; do
  if [ -f "$SHARED_DIR/$module" ]; then
    # shellcheck disable=SC1090,SC1091
    . "$SHARED_DIR/$module"
  else
    echo "Error: missing src/shared/$module. Ensure project files are intact." >&2
    exit 1
  fi
done

for module in agents/claude_code/shell.sh agents/codex/shell.sh; do
  if [ -f "$SRC_DIR/$module" ]; then
    # shellcheck disable=SC1090,SC1091
    . "$SRC_DIR/$module"
  else
    echo "Error: missing src/$module. Ensure project files are intact." >&2
    exit 1
  fi
done

while [ "$#" -gt 0 ]; do
  case "$1" in
    --ui)
      MONITOR=1
      shift
      ;;
    --html)
      HTML_UI=1
      MONITOR=1
      shift
      ;;
    --flow)
      if [ "$#" -lt 2 ]; then
        echo "Error: --flow requires a flow name (subdirectory under flows/)." >&2
        exit 1
      fi
      FLOW_NAME=$2
      shift 2
      ;;
    --run)
      if [ "$#" -lt 2 ]; then
        echo "Error: --run requires a run name (subdirectory under runs/)." >&2
        exit 1
      fi
      RUN_NAME=$2
      shift 2
      ;;
    --cwd)
      if [ "$#" -lt 2 ]; then
        echo "Error: --cwd requires a directory path." >&2
        exit 1
      fi
      WORK_DIR=$2
      shift 2
      ;;
    --engine)
      if [ "$#" -lt 2 ]; then
        echo "Error: --engine requires one of: claude, codex." >&2
        exit 1
      fi
      ENGINE=$2
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --port)
      if [ "$#" -lt 2 ]; then
        echo "Error: --port requires a number." >&2
        exit 1
      fi
      PORT=$2
      shift 2
      ;;
    --log-dir)
      if [ "$#" -lt 2 ]; then
        echo "Error: --log-dir requires a directory path." >&2
        exit 1
      fi
      LOG_DIR=$2
      shift 2
      ;;
    --log-file)
      if [ "$#" -lt 2 ]; then
        echo "Error: --log-file requires a file path." >&2
        exit 1
      fi
      LOG_FILE=$2
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Error: unknown option '$1'." >&2
      echo "Use '--' to pass remaining args verbatim, or '-h' for help." >&2
      exit 2
      ;;
    *)
      break
      ;;
  esac
done

case "$ENGINE" in
  claude|claude-code|claude_code) ENGINE="claude" ;;
  codex) ;;
  *)
    echo "Error: unsupported engine '$ENGINE' (expected claude or codex)." >&2
    exit 2
    ;;
esac
export AGENT_AUTO_ENGINE="$ENGINE"

# Compatibility for old env-based customizations.
export CLAUDE_AUTO_ENGINE="$AGENT_AUTO_ENGINE"
export CLAUDE_AUTO_MODEL="$AGENT_AUTO_CLAUDE_MODEL"
export CLAUDE_AUTO_CODEX_MODEL="$AGENT_AUTO_CODEX_MODEL"
export CLAUDE_AUTO_CTX_LIMIT="$AGENT_AUTO_CTX_LIMIT"

if [ -n "$RUN_NAME" ] && [ -n "$FLOW_NAME" ]; then
  echo "Error: --run and --flow are mutually exclusive (--run picks flow per-task from runs/<name>/.index.md)." >&2
  exit 2
fi

if [ -n "$WORK_DIR" ]; then
  if [ ! -d "$WORK_DIR" ]; then
    echo "Error: --cwd directory not found: $WORK_DIR" >&2
    exit 1
  fi
  WORK_DIR=$(CDPATH= cd -- "$WORK_DIR" && pwd)
fi
export AGENT_AUTO_WORK_DIR="$WORK_DIR"
export CLAUDE_AUTO_WORK_DIR="$WORK_DIR"

if [ -n "$RUN_NAME" ]; then
  RUN_PASSTHROUGH=""
  if [ "$HTML_UI" -eq 1 ]; then
    RUN_PASSTHROUGH="$RUN_PASSTHROUGH --html"
  elif [ "$MONITOR" -eq 1 ]; then
    RUN_PASSTHROUGH="$RUN_PASSTHROUGH --ui"
  fi
  if [ "$DRY_RUN" -eq 1 ]; then
    RUN_PASSTHROUGH="$RUN_PASSTHROUGH --dry-run"
  fi
  if [ "$ENGINE" != "claude" ]; then
    RUN_PASSTHROUGH="$RUN_PASSTHROUGH --engine $ENGINE"
  fi
  if [ "$PORT" != "8765" ]; then
    RUN_PASSTHROUGH="$RUN_PASSTHROUGH --port $PORT"
  fi
  # shellcheck disable=SC2086
  exec python3 "$SRC_DIR/run_batch.py" "$RUN_NAME" $RUN_PASSTHROUGH -- "$@"
fi

if [ "$DRY_RUN" -ne 1 ] || [ -z "$FLOW_NAME" ]; then
  require_binary "$(agent_binary)" || exit 127
fi

if [ -n "$WORK_DIR" ]; then
  cd "$WORK_DIR"
  ADD_DIR="$WORK_DIR"
else
  cd "$SCRIPT_DIR"
  ADD_DIR="$SCRIPT_DIR"
fi
export AGENT_AUTO_ADD_DIR="$ADD_DIR"
export CLAUDE_AUTO_ADD_DIR="$ADD_DIR"

if [ -z "$FLOW_NAME" ] && [ "$MONITOR" -eq 0 ] && [ "$HTML_UI" -eq 0 ]; then
  run_agent_direct "$@"
fi

resolve_paths

if [ -n "$FLOW_NAME" ]; then
  start_flow "$FLOW_NAME" "$@"
else
  start_agent "$@"
fi

if [ "$HTML_UI" -eq 1 ]; then
  run_html_monitor
  exit 0
fi

if [ "$MONITOR" -eq 1 ]; then
  run_terminal_monitor
fi

wait "$AGENT_PID" 2>/dev/null || true
AGENT_EXIT=$?
finalize_pipeline
write_status finished "$AGENT_EXIT"
write_snapshot
exit "$AGENT_EXIT"
