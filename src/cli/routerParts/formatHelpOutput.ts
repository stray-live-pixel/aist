export function formatHelpOutput(): string {
  return `AIST command line interface

Usage:
  aist --help
  aist --version
  aist paths [--workspace <path>]
  aist doctor [--workspace <path>]
  aist daemon --workspace <path> [--socket <path>]
  aist chat new [--workspace <path>] [--model <model>] [--json]
  aist chat list [--workspace <path>] [--json]
  aist chat get <chatId> [--workspace <path>] [--json]
  aist chat clear <chatId> [--workspace <path>] [--json]
  aist chat set-model <chatId> <model> [--workspace <path>] [--json]
  aist chat ask <chatId> --prompt <text>|--stdin --workspace <path> --jsonl [--approval-mode ask|auto-readonly|auto-all|deny]
  aist config get [key] [--workspace <path>] [--json]
  aist config set <key> <value> --scope global|workspace [--workspace <path>] [--json]
  aist auth openrouter set-key [--from-env] [--json]
  aist auth openrouter status [--json]
  aist auth codex status [--json]
  aist models list [--provider openrouter|codex|all] [--json]
  aist models refresh [--provider openrouter|codex|all] [--json]
  aist autonomous list [--workspace <path>] [--json]
  aist autonomous flow start <flowId> [--workspace <path>] --jsonl [--engine <id>] [--dry-run|--no-dry-run] [--isolated] [--vcs-command git|arc]
  aist autonomous run start <runId> [--workspace <path>] --jsonl [--engine <id>] [--dry-run|--no-dry-run] [--isolated] [--vcs-command git|arc]
  aist autonomous stop <sessionId> [--workspace <path>] [--json]
  aist autonomous export <sessionId> [--workspace <path>] [--format markdown|json]

Commands:
  paths     Print workspace and global AIST paths.
  doctor    Check workspace and global AIST storage paths.
  daemon    Start the local-socket JSON-RPC backend for one workspace.
  chat      Create, list, inspect and update file-backed chats.
  config    Read or write non-secret CLI/backend settings.
  auth      Manage model provider auth status and global secrets.
  models    List model options from provider adapters or safe fallbacks.
  autonomous
            Inspect and run native autonomous flows and batch runs.

Options:
  --workspace <path>  Workspace root. Defaults to the current directory.
  --socket <path>     Override daemon local socket path.
  --model <model>     Model id for chat creation.
  --scope <scope>     Config write scope: global or workspace.
  --provider <name>   Model provider: openrouter, codex, or all.
  --engine <id>       Autonomous engine id: dry-run, openrouter-api, codex-api, claude-cli, or codex-cli.
  --format <format>   Export format: markdown or json.
  --approval-mode <mode>
                      Headless tool policy: ask, auto-readonly, auto-all, or deny.
  --dry-run           Force autonomous dry-run mode (default for autonomous start).
  --no-dry-run        Execute the selected autonomous engine instead of dry-run.
  --isolated          Run autonomous work in a git-like VCS worktree and branch.
  --vcs-command <cmd> Git-like VCS command for isolated runs: git by default, arc for Yandex VCS.
  --vcs-base-branch <branch>
                      Base branch for isolated autonomous worktree creation.
  --vcs-branch <name> Branch name for isolated autonomous work.
  --vcs-worktree <path>
                      Worktree path for isolated autonomous work.
  --keep-worktree     Keep the isolated worktree after autonomous run completion.
  --from-env          Read OPENROUTER_API_KEY instead of stdin for set-key.
  --json              Print machine-readable JSON.
  --jsonl             Print newline-delimited runtime events.
  --help, -h          Show this help.
  --version, -v       Show the package version.
`;
}
