# Backend Approval Protocol

This protocol is the shared contract for future CLI/backend tool approvals and the existing VS Code editable diff preview.

## Approval Entity

Every approval request is JSONL-friendly and uses `ToolApprovalRequest`:

- `approvalId`, `runId`, `toolCallId`, `toolName`
- `reason`, `args`
- `previewKind`: `none`, `vscode-editable-diff`, or `headless-diff-artifact`
- `previewPayload`: file summaries, proposed content for UI preview, or a diff artifact reference
- `status`: `pending`, `approved`, or `denied`

Decisions use `approve`, `deny-stop`, or `deny-continue` plus optional sanitized `comment`, `rememberGlobal`, and `rememberProject` fields.

## Tool Classes

- `auto`: read-only and safe state tools such as `read_file`, `list_files`, `grep_search`, and `set_plan_item_status`.
- `approval`: shell, directory, delete, planning, skills, project tools, and unknown tools.
- `ui-assisted-preview`: `edit_file`, `write_file`, and `replace_in_file` when the client advertises `vscodeEditableDiffPreview`.

`edit_file` is never auto-applied by the protocol. Without a VS Code preview capability, edit tools fall back to `headless-diff-artifact`.

## VS Code Preview Flow

1. Backend receives a mutating filesystem tool call.
2. Backend computes the proposed edit but does not write it.
3. Backend emits `tool.call.approvalRequested` with `previewKind: "vscode-editable-diff"` and proposed file content in `previewPayload`.
4. VS Code adapter opens an editable diff through `previewFilesystemApprovalRequest`.
5. On Allow, the adapter returns final approved content/result. That final content is the source of truth, so user edits made in the right-hand diff are preserved.
6. Backend applies the final content and resolves the approval as `approved`.

## Headless Fallback

When no VS Code preview capability is available, the backend writes a proposed diff to:

```text
.aist-agent/runs/<runId>/artifacts/approvals/<approvalId>.diff
```

The approval event carries an artifact reference and compact file summaries. A future `approval.resolve` CLI command can approve or deny the pending request without needing a UI.

`deny-continue` returns a structured denied tool result to the model. `deny-stop` marks the approval denied and stops the run.
