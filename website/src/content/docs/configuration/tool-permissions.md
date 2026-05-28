---
title: Tool permissions
description: Control which tools run automatically and which ask first.
---

`openrouterAgent.toolPermissions` stores per-tool approval mode.

Allowed values:

- `auto` — run without manual confirmation;
- `ask` — show an approval card in chat before running.

The settings UI also provides presets:

| Preset       | Behavior                                                                       |
| ------------ | ------------------------------------------------------------------------------ |
| `balanced`   | Read/search automatically; ask before shell commands and file mutations.       |
| `fast-edit`  | Read/search/create/edit automatically; ask before shell commands and deletion. |
| `autonomous` | Run every available tool automatically.                                        |
| `custom`     | Shown when current permissions do not match a preset.                          |
