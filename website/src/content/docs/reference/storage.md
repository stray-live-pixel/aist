---
title: Storage locations
description: Where AIST stores workspace and user data.
---

Workspace data is stored in `.aist-agent` inside the current workspace.

Typical workspace storage includes:

- chat and run data;
- workspace settings when `agentConfigScope` is `workspace`;
- autonomous runner flows, runs, sessions, and artifacts;
- daemon diagnostics in `.aist-agent/daemon.log`.

Secrets remain global-only and are not written to workspace settings.
