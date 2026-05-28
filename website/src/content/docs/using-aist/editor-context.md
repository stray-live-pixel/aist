---
title: Editor context
description: How AIST uses selected code and the active file.
---

Every request can include context from the active editor.

- If text is selected, AIST sends the selected code.
- If there is no selection, AIST can send active file content.
- File content is limited by `openrouterAgent.maxContextChars`.
- Context includes the file path and VS Code language ID.

You usually do not need to paste file content manually. Open the relevant file or select the relevant code before sending your prompt.

The behavior is controlled by `openrouterAgent.editorContextMode`.
