---
title: Edit Selection
description: Use AIST for small direct transformations in the editor.
---

**aist: Edit Selection** is useful for focused edits without starting a long chat flow.

1. Select code in the editor, or place the cursor where generated text should be inserted.
2. Run **aist: Edit Selection**.
3. Enter an instruction.
4. AIST calls the configured model and replaces the selection, or inserts text at the cursor if the selection is empty.

If the model returns one surrounding Markdown code fence, AIST strips it before inserting the result.
