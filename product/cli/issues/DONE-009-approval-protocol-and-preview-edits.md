# 009 — Approval protocol and preview edit preservation

## Priority

P1 — critical UX requirement, high complexity.

## Goal

Спроектировать и реализовать backend approval protocol, который сохраняет важную фичу preview edits при переносе tool execution в CLI/backend.

## Context

Сейчас preview edits делает VS Code extension: `previewFilesystemTool` открывает editable diff, пользователь правит правую сторону и нажимает Allow/Deny. После выноса runtime в CLI backend нельзя потерять этот UX. При этом headless CLI должен иметь fallback: diff artifact и команда approve/deny.

## Scope

- В core contracts добавить approval entities:
  - `approvalId`, `runId`, `toolCallId`, `toolName`, `reason`, `args`, `previewKind`, `previewPayload`, `status`;
  - decisions: approve, deny-stop, deny-continue, comment, rememberGlobal, rememberProject.
- Разделить tools на:
  - auto executable;
  - approval required;
  - UI-assisted preview required.
- Для edit/write/replace/apply_patch добавить preview request event вместо немедленного применения, если client поддерживает VS Code preview capability.
- Для headless CLI добавить diff artifact fallback: backend пишет proposed diff/patch в run artifacts и ждёт `approval.resolve` или применяет policy.
- Extension adapter должен уметь получить preview request, открыть editable diff, вернуть final approved content/result.
- Добавить tests на state machine: pending -> approved/denied, deny-continue возвращает tool result модели, deny-stop останавливает run.

## Out of scope

- Daemon transport implementation.
- Полный перенос toolRunner.
- UI polish webview approval card.

## Implementation notes

- Preview result должен быть source-of-truth: если пользователь отредактировал diff перед Allow, backend применяет финальный текст, а не исходный model patch.
- Approval comments и memory fields должны пройти через тот же sanitizer, что текущий flow.
- Не допускать auto-apply `edit_file` без approval, даже в fast/autonomous presets, пока явно не принято другое решение.
- События approvals должны быть JSONL-friendly.

## Acceptance criteria

- Есть документированный protocol для VS Code-assisted preview и headless fallback.
- Tests покрывают approval lifecycle и сохранение final edited content.
- Текущий VS Code preview edits не сломан.
- CLI сможет позже использовать тот же protocol без UI.

## Suggested verification

- `npm run typecheck`
- Focused unit tests approval protocol/tool preview state
- Manual extension smoke: `edit_file` preview opens and rollback works
