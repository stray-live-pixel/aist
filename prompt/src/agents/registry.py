from agents.claude_code import runtime as claude_code
from agents.codex import runtime as codex


BACKENDS = {
    "claude": claude_code,
    "codex": codex,
}


def normalize_engine(name):
    value = (name or "claude").strip().lower()
    if value in ("claude-code", "claude_code"):
        return "claude"
    return value


def get_backend(name):
    engine = normalize_engine(name)
    try:
        return BACKENDS[engine]
    except KeyError as exc:
        allowed = ", ".join(sorted(BACKENDS))
        raise RuntimeError(f"unsupported engine '{name}' (expected one of: {allowed})") from exc
