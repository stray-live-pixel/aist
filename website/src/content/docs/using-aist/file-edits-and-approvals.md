---
title: File edits and approvals
description: How AIST keeps file changes reviewable.
---

AIST can propose file changes, but mutating tools require confirmation by default.

Before a file is changed, AIST opens a VS Code-native diff preview:

- `write_file` previews the complete target content;
- `replace_in_file` previews the generated replacement;

You can review the diff, adjust the right-hand side if needed, and approve only when the result is acceptable.

Read-only tools usually run automatically. Shell commands, directory creation, deletion, and file mutations ask for approval by default.
