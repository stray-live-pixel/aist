# VS Code UI

This folder is the new home for the VS Code-facing UI entrypoint.

The feature-complete webview implementation still lives under `src/webview/**` during the migration. The build entrypoint imports it from here so new shared UI work can move into `src/ui/shared/**` without disrupting the extension.
