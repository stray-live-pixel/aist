"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode10 = __toESM(require("vscode"));

// src/extension/agent/agentController.ts
var vscode7 = __toESM(require("vscode"));

// src/extension/openrouter/client.ts
var vscode = __toESM(require("vscode"));

// src/extension/shared/constants.ts
var OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
var OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
var DEFAULT_MODEL = "openai/gpt-4o-mini";
var FALLBACK_MODEL_OPTIONS = [
  {
    id: DEFAULT_MODEL,
    name: "GPT-4o mini",
    contextLength: void 0,
    supportsTools: true
  }
];

// src/extension/openrouter/client.ts
var OpenRouterClient = class {
  async chat(messages, tools, modelOverride) {
    const config = vscode.workspace.getConfiguration("openrouterAgent");
    const apiKey = config.get("apiKey") || process.env.OPENROUTER_API_KEY;
    const model = modelOverride || config.get("model") || DEFAULT_MODEL;
    const siteUrl = config.get("siteUrl") || "";
    const siteName = config.get("siteName") || "VS Code OpenRouter AI Agent";
    if (!apiKey) {
      throw new Error("Set openrouterAgent.apiKey in VS Code settings or OPENROUTER_API_KEY in your environment.");
    }
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...siteUrl ? { "HTTP-Referer": siteUrl } : {},
        ...siteName ? { "X-Title": siteName } : {}
      },
      body: JSON.stringify({
        model,
        messages,
        ...tools ? { tools, tool_choice: "auto" } : {},
        temperature: 0.2
      })
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter request failed: ${response.status} ${response.statusText}
${text}`);
    }
    const data = await response.json();
    const answer = data.choices?.[0]?.message;
    if (!answer) {
      throw new Error("OpenRouter returned an empty response.");
    }
    return answer;
  }
  async listModels() {
    const config = vscode.workspace.getConfiguration("openrouterAgent");
    const apiKey = config.get("apiKey") || process.env.OPENROUTER_API_KEY;
    const response = await fetch(`${OPENROUTER_MODELS_URL}?output_modalities=text`, {
      method: "GET",
      headers: {
        ...apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
      }
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter models request failed: ${response.status} ${response.statusText}
${text}`);
    }
    const data = await response.json();
    const models = (data.data || []).filter((model) => model.id).map((model) => ({
      id: model.id,
      name: model.name || model.id,
      contextLength: model.context_length,
      supportsTools: Boolean(model.supported_parameters?.includes("tools"))
    }));
    return models.sort((a, b) => a.name.localeCompare(b.name));
  }
};

// src/extension/shared/errors.ts
function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

// src/extension/shared/webviewHtml.ts
var vscode2 = __toESM(require("vscode"));
function getWebviewHtml(webview, extensionUri) {
  const nonce = getNonce();
  const scriptUri = webview.asWebviewUri(vscode2.Uri.joinPath(extensionUri, "dist", "webview.js"));
  const styleUri = webview.asWebviewUri(vscode2.Uri.joinPath(extensionUri, "dist", "webview.css"));
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <link href="${styleUri}" rel="stylesheet">
  <title>OpenRouter AI Agent</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}
function getNonce() {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let index = 0; index < 32; index += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// src/extension/shared/workspace.ts
var import_node_path = __toESM(require("node:path"));
var vscode3 = __toESM(require("vscode"));
function getWorkspaceFolder() {
  const folders = vscode3.workspace.workspaceFolders || [];
  if (!folders.length) {
    throw new Error("Open a VS Code workspace folder before using filesystem tools.");
  }
  return folders[0];
}
function getWorkspaceName() {
  const folders = vscode3.workspace.workspaceFolders || [];
  return folders[0]?.name || "No workspace";
}
function resolveWorkspacePath(relativePath) {
  const folder = getWorkspaceFolder();
  const rootPath = folder.uri.fsPath;
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const targetPath = import_node_path.default.resolve(rootPath, normalized);
  const relativeToRoot = import_node_path.default.relative(rootPath, targetPath);
  if (relativeToRoot === ".." || relativeToRoot.startsWith(`..${import_node_path.default.sep}`) || import_node_path.default.isAbsolute(relativeToRoot)) {
    throw new Error(`Path is outside the workspace: ${relativePath}`);
  }
  return vscode3.Uri.file(targetPath);
}

// src/extension/tools/filesystemTools.ts
var import_node_path2 = __toESM(require("node:path"));
var import_node_os = __toESM(require("node:os"));
var import_node_util = require("node:util");
var vscode4 = __toESM(require("vscode"));
var textEncoder = new import_node_util.TextEncoder();
var textDecoder = new import_node_util.TextDecoder("utf-8");
var filesystemTools = [
  {
    type: "function",
    function: {
      name: "get_workspace_info",
      description: "Get the current VS Code workspace folder and active editor metadata.",
      parameters: {
        type: "object",
        properties: {
          reason: {
            type: "string",
            description: "A short explanation of why this tool call is needed."
          }
        },
        required: ["reason"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "List files and directories under a workspace-relative path.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "A short explanation of why this tool call is needed." },
          path: { type: "string", description: 'Workspace-relative directory path. Use "." for root.' },
          maxDepth: { type: "number", description: "Maximum recursive depth. Default is 2." },
          limit: { type: "number", description: "Maximum number of entries. Default is 200." }
        },
        required: ["reason"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a UTF-8 text file from the workspace.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "A short explanation of why this tool call is needed." },
          path: { type: "string", description: "Workspace-relative file path." },
          maxChars: { type: "number", description: "Maximum characters to return. Default is 20000." }
        },
        required: ["reason", "path"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Create or overwrite a UTF-8 text file in the workspace.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "A short explanation of why this tool call is needed." },
          path: { type: "string", description: "Workspace-relative file path." },
          content: { type: "string", description: "Full file content to write." }
        },
        required: ["reason", "path", "content"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "replace_in_file",
      description: "Replace text in an existing UTF-8 file.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "A short explanation of why this tool call is needed." },
          path: { type: "string", description: "Workspace-relative file path." },
          search: { type: "string", description: "Exact text to find." },
          replace: { type: "string", description: "Replacement text." },
          all: { type: "boolean", description: "Replace all matches instead of only the first." }
        },
        required: ["reason", "path", "search", "replace"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_directory",
      description: "Create a workspace directory, including parent directories.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "A short explanation of why this tool call is needed." },
          path: { type: "string", description: "Workspace-relative directory path." }
        },
        required: ["reason", "path"],
        additionalProperties: false
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_path",
      description: "Delete a workspace file or directory. Directories require recursive=true.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string", description: "A short explanation of why this tool call is needed." },
          path: { type: "string", description: "Workspace-relative path." },
          recursive: { type: "boolean", description: "Delete directories recursively." }
        },
        required: ["reason", "path"],
        additionalProperties: false
      }
    }
  }
];
async function runFilesystemTool(toolName, args) {
  switch (toolName) {
    case "list_files":
      return listFiles(args);
    case "read_file":
      return readFile(args);
    case "write_file":
      return writeFile(args);
    case "replace_in_file":
      return replaceInFile(args);
    case "create_directory":
      return createDirectory(args);
    case "delete_path":
      return deletePath(args);
    case "get_workspace_info":
      return getWorkspaceInfo();
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
async function previewFilesystemTool(toolName, args) {
  if (toolName === "write_file") {
    const filePath = requireString(args.path, "path");
    const nextContent = requireString(args.content, "content");
    return showFileDiff(filePath, nextContent);
  }
  if (toolName === "replace_in_file") {
    const filePath = requireString(args.path, "path");
    const search = requireString(args.search, "search");
    const replace = requireString(args.replace, "replace");
    const replaceAll = Boolean(args.all);
    const uri = resolveWorkspacePath(filePath);
    const content = textDecoder.decode(await vscode4.workspace.fs.readFile(uri));
    if (!content.includes(search)) {
      throw new Error(`Text was not found in ${filePath}.`);
    }
    const nextContent = replaceAll ? content.split(search).join(replace) : content.replace(search, replace);
    return showFileDiff(filePath, nextContent);
  }
  return void 0;
}
function getWorkspaceInfo() {
  const folder = getWorkspaceFolder();
  const editor = vscode4.window.activeTextEditor;
  return {
    ok: true,
    workspaceName: folder.name,
    workspacePath: folder.uri.fsPath,
    activeFile: editor ? editor.document.fileName : null,
    activeLanguage: editor ? editor.document.languageId : null
  };
}
async function listFiles(args) {
  const uri = resolveWorkspacePath(String(args.path || "."));
  const maxDepth = clampNumber(args.maxDepth, 2, 0, 8);
  const limit = clampNumber(args.limit, 200, 1, 1e3);
  const entries = [];
  await walkDirectory(uri, ".", 0, maxDepth, limit, entries);
  return {
    ok: true,
    path: args.path || ".",
    entries,
    truncated: entries.length >= limit
  };
}
async function readFile(args) {
  const filePath = requireString(args.path, "path");
  const maxChars = clampNumber(args.maxChars, 2e4, 1e3, 2e5);
  const uri = resolveWorkspacePath(filePath);
  const content = textDecoder.decode(await vscode4.workspace.fs.readFile(uri));
  const truncated = content.length > maxChars;
  return {
    ok: true,
    path: filePath,
    content: truncated ? content.slice(0, maxChars) : content,
    truncated
  };
}
async function writeFile(args) {
  const filePath = requireString(args.path, "path");
  const content = requireString(args.content, "content");
  const uri = resolveWorkspacePath(filePath);
  await vscode4.workspace.fs.createDirectory(vscode4.Uri.file(import_node_path2.default.dirname(uri.fsPath)));
  await vscode4.workspace.fs.writeFile(uri, textEncoder.encode(content));
  return {
    ok: true,
    path: filePath,
    bytes: Buffer.byteLength(content, "utf8")
  };
}
async function replaceInFile(args) {
  const filePath = requireString(args.path, "path");
  const search = requireString(args.search, "search");
  const replace = requireString(args.replace, "replace");
  const replaceAll = Boolean(args.all);
  const uri = resolveWorkspacePath(filePath);
  const content = textDecoder.decode(await vscode4.workspace.fs.readFile(uri));
  if (!content.includes(search)) {
    throw new Error(`Text was not found in ${filePath}.`);
  }
  const nextContent = replaceAll ? content.split(search).join(replace) : content.replace(search, replace);
  const count = replaceAll ? content.split(search).length - 1 : 1;
  await vscode4.workspace.fs.writeFile(uri, textEncoder.encode(nextContent));
  return {
    ok: true,
    path: filePath,
    replacements: count
  };
}
async function createDirectory(args) {
  const dirPath = requireString(args.path, "path");
  const uri = resolveWorkspacePath(dirPath);
  await vscode4.workspace.fs.createDirectory(uri);
  return {
    ok: true,
    path: dirPath
  };
}
async function deletePath(args) {
  const targetPath = requireString(args.path, "path");
  const uri = resolveWorkspacePath(targetPath);
  await vscode4.workspace.fs.delete(uri, {
    recursive: Boolean(args.recursive),
    useTrash: true
  });
  return {
    ok: true,
    path: targetPath,
    recursive: Boolean(args.recursive)
  };
}
async function showFileDiff(filePath, nextContent) {
  const targetUri = resolveWorkspacePath(filePath);
  const currentContent = await readFileIfExists(targetUri);
  if (currentContent === nextContent) {
    return {
      ok: true,
      path: filePath,
      diffShown: false,
      reason: "No file changes to preview."
    };
  }
  const tempRoot = vscode4.Uri.file(import_node_path2.default.join(import_node_os.default.tmpdir(), "openrouter-ai-agent-diffs", Date.now().toString()));
  await vscode4.workspace.fs.createDirectory(tempRoot);
  const originalUri = currentContent === void 0 ? vscode4.Uri.joinPath(tempRoot, `empty-${import_node_path2.default.basename(filePath)}`) : targetUri;
  const proposedUri = vscode4.Uri.joinPath(tempRoot, `proposed-${import_node_path2.default.basename(filePath) || "file"}`);
  if (currentContent === void 0) {
    await vscode4.workspace.fs.writeFile(originalUri, textEncoder.encode(""));
  }
  await vscode4.workspace.fs.writeFile(proposedUri, textEncoder.encode(nextContent));
  await vscode4.commands.executeCommand(
    "vscode.diff",
    originalUri,
    proposedUri,
    `OpenRouter Agent Preview: ${filePath}`,
    { preview: true }
  );
  return {
    ok: true,
    path: filePath,
    diffShown: true
  };
}
async function readFileIfExists(uri) {
  try {
    return textDecoder.decode(await vscode4.workspace.fs.readFile(uri));
  } catch (error) {
    if (error instanceof vscode4.FileSystemError) {
      return void 0;
    }
    return void 0;
  }
}
async function walkDirectory(uri, relativeBase, depth, maxDepth, limit, entries) {
  if (entries.length >= limit) {
    return;
  }
  const children = await vscode4.workspace.fs.readDirectory(uri);
  children.sort(([a], [b]) => a.localeCompare(b));
  for (const [name, type] of children) {
    if (entries.length >= limit) {
      return;
    }
    if (shouldSkipPath(name)) {
      continue;
    }
    const childRelative = relativeBase === "." ? name : `${relativeBase}/${name}`;
    const isDirectory = type === vscode4.FileType.Directory;
    entries.push({
      path: childRelative,
      type: isDirectory ? "directory" : "file"
    });
    if (isDirectory && depth < maxDepth) {
      await walkDirectory(vscode4.Uri.joinPath(uri, name), childRelative, depth + 1, maxDepth, limit, entries);
    }
  }
}
function shouldSkipPath(name) {
  return [".git", "node_modules", "dist", "out", ".vscode-test"].includes(name);
}
function requireString(value, name) {
  if (typeof value !== "string") {
    throw new Error(`Tool argument "${name}" must be a string.`);
  }
  return value;
}
function clampNumber(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.floor(numeric)));
}

// src/extension/tools/permissions.ts
var vscode5 = __toESM(require("vscode"));
var DEFAULT_TOOL_PERMISSIONS = {
  get_workspace_info: "auto",
  list_files: "auto",
  read_file: "auto",
  write_file: "ask",
  replace_in_file: "ask",
  create_directory: "ask",
  delete_path: "ask"
};
function getToolPermissions() {
  const configured = vscode5.workspace.getConfiguration("openrouterAgent").get("toolPermissions") || {};
  const permissions = {};
  for (const tool of filesystemTools) {
    const name = tool.function.name;
    permissions[name] = normalizePermission(configured[name], DEFAULT_TOOL_PERMISSIONS[name] || "ask");
  }
  return permissions;
}
function getToolPermission(toolName) {
  return getToolPermissions()[toolName] || DEFAULT_TOOL_PERMISSIONS[toolName] || "ask";
}
function getToolPermissionItems() {
  const permissions = getToolPermissions();
  return filesystemTools.map((tool) => ({
    name: tool.function.name,
    description: tool.function.description,
    permission: permissions[tool.function.name] || "ask",
    defaultPermission: DEFAULT_TOOL_PERMISSIONS[tool.function.name] || "ask"
  }));
}
async function setToolPermission(toolName, permission) {
  const nextPermissions = {
    ...getToolPermissions(),
    [toolName]: permission
  };
  await vscode5.workspace.getConfiguration("openrouterAgent").update("toolPermissions", nextPermissions, vscode5.ConfigurationTarget.Workspace);
}
function normalizePermission(value, fallback) {
  return value === "auto" || value === "ask" ? value : fallback;
}

// src/extension/agent/editorContext.ts
var vscode6 = __toESM(require("vscode"));
function getEditorContext() {
  const editor = vscode6.window.activeTextEditor;
  if (!editor) {
    return "";
  }
  const config = vscode6.workspace.getConfiguration("openrouterAgent");
  const maxChars = config.get("maxContextChars") || 12e3;
  const document = editor.document;
  const selectionText = document.getText(editor.selection);
  const fullText = document.getText();
  const truncatedText = fullText.length > maxChars ? `${fullText.slice(0, maxChars)}
...<truncated>` : fullText;
  return [
    `File: ${document.fileName}`,
    `Language: ${document.languageId}`,
    selectionText ? `Selected code:
${selectionText}` : `File content:
${truncatedText}`
  ].join("\n\n");
}
function stripCodeFence(text) {
  const trimmed = String(text || "").trim();
  const match = trimmed.match(/^```[a-zA-Z0-9_-]*\n([\s\S]*?)\n```$/);
  return match ? match[1] : trimmed;
}
async function replaceSelection(editor, text) {
  const selection = editor.selection;
  await editor.edit((editBuilder) => {
    if (selection.isEmpty) {
      editBuilder.insert(selection.active, text);
    } else {
      editBuilder.replace(selection, text);
    }
  });
}

// src/extension/agent/prompts.ts
function getSystemPrompt() {
  return [
    "You are a coding agent inside VS Code.",
    "You can inspect and modify files using the provided filesystem tools.",
    "All tool paths must be workspace-relative.",
    'Every tool call must include a short "reason" argument explaining why the tool is needed.',
    "Before editing, read the relevant files and preserve the existing project style.",
    "Keep final answers concise and mention changed files.",
    "Do not claim that a file was changed unless a tool call succeeded."
  ].join(" ");
}

// src/extension/agent/agentController.ts
var AgentController = class {
  constructor(context, chats) {
    this.context = context;
    this.chats = chats;
  }
  context;
  chats;
  panel;
  client = new OpenRouterClient();
  modelOptions = [...FALLBACK_MODEL_OPTIONS];
  modelsLoadedAt = 0;
  modelLoadPromise;
  openChat(chatId) {
    if (chatId) {
      this.chats.setActiveChat(chatId);
    }
    if (this.panel) {
      this.panel.reveal(vscode7.ViewColumn.Beside);
      this.sendState();
      return;
    }
    this.panel = vscode7.window.createWebviewPanel(
      "openrouterAgentChat",
      "OpenRouter AI Agent",
      vscode7.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode7.Uri.joinPath(this.context.extensionUri, "dist")]
      }
    );
    this.panel.webview.html = getWebviewHtml(this.panel.webview, this.context.extensionUri);
    this.panel.onDidDispose(() => {
      this.panel = void 0;
    });
    this.panel.webview.onDidReceiveMessage((message) => {
      void this.handleWebviewMessage(message);
    });
    this.sendState();
    void this.refreshModels();
  }
  createChat() {
    const configModel = vscode7.workspace.getConfiguration("openrouterAgent").get("model") || DEFAULT_MODEL;
    this.chats.createChat(configModel);
    this.openChat();
  }
  async editSelection() {
    const editor = vscode7.window.activeTextEditor;
    if (!editor) {
      vscode7.window.showWarningMessage("Open a file first.");
      return;
    }
    const instruction = await vscode7.window.showInputBox({
      title: "OpenRouter Agent: Edit Selection",
      prompt: "Describe what should be generated or changed",
      placeHolder: "Example: refactor this function and add error handling"
    });
    if (!instruction) {
      return;
    }
    await vscode7.window.withProgress(
      {
        location: vscode7.ProgressLocation.Notification,
        title: "OpenRouter Agent is editing...",
        cancellable: false
      },
      async () => {
        const selectedText = editor.document.getText(editor.selection);
        const activeChat = this.chats.getActiveChat();
        const prompt = [
          "You are editing code in VS Code.",
          "Return only the final code that should replace the current selection.",
          "Do not include markdown fences, explanations, or commentary.",
          "",
          `File: ${editor.document.fileName}`,
          `Language: ${editor.document.languageId}`,
          "",
          `Instruction:
${instruction}`,
          "",
          `Current selection:
${selectedText || "(empty selection at cursor)"}`
        ].join("\n");
        const answer = await this.client.chat(
          [
            { role: "system", content: getSystemPrompt() },
            { role: "user", content: prompt }
          ],
          void 0,
          activeChat.model
        );
        await replaceSelection(editor, stripCodeFence(answer.content || ""));
        this.chats.setLastAnswer(activeChat.id, answer.content || "");
      }
    );
  }
  async handleWebviewMessage(message) {
    if (message.type === "webviewReady") {
      this.sendState();
      void this.refreshModels();
    }
    if (message.type === "ask") {
      await this.ask(message.prompt);
    }
    if (message.type === "newChat") {
      this.createChat();
    }
    if (message.type === "setModel") {
      const chat = this.chats.getActiveChat();
      this.chats.setModel(chat.id, message.model);
      await vscode7.workspace.getConfiguration("openrouterAgent").update("model", message.model, vscode7.ConfigurationTarget.Workspace);
      this.sendState();
    }
    if (message.type === "setToolPermission") {
      await setToolPermission(message.toolName, message.permission);
      this.sendState();
    }
    if (message.type === "clear") {
      const chat = this.chats.getActiveChat();
      this.chats.clearChat(chat.id);
      this.sendState();
    }
    if (message.type === "copyMessage") {
      await vscode7.env.clipboard.writeText(message.markdown || "");
      vscode7.window.setStatusBarMessage("Copied message markdown", 1800);
    }
    if (message.type === "insertLastAnswer") {
      const chat = this.chats.getActiveChat();
      const editor = vscode7.window.activeTextEditor;
      if (!editor) {
        vscode7.window.showWarningMessage("Open a file first.");
        return;
      }
      await replaceSelection(editor, stripCodeFence(chat.lastAnswer));
    }
  }
  async ask(prompt) {
    const cleanPrompt = String(prompt || "").trim();
    if (!cleanPrompt) {
      return;
    }
    const chat = this.chats.getActiveChat();
    if (chat.busy) {
      return;
    }
    this.chats.appendMessage(chat.id, { role: "user", content: cleanPrompt });
    this.chats.setBusy(chat.id, true);
    this.sendState();
    try {
      const editorContext = getEditorContext();
      const userContent = [cleanPrompt, editorContext ? `

Active editor context:
${editorContext}` : ""].join("");
      chat.history.push({ role: "user", content: userContent });
      const answer = await this.runAgentLoop(chat);
      chat.history.push({ role: "assistant", content: answer });
      this.chats.setLastAnswer(chat.id, answer);
      this.chats.appendMessage(chat.id, { role: "assistant", content: answer });
    } catch (error) {
      this.chats.appendMessage(chat.id, { role: "error", content: getErrorMessage(error) });
    } finally {
      this.chats.setBusy(chat.id, false);
      this.sendState();
    }
  }
  async runAgentLoop(chat) {
    const config = vscode7.workspace.getConfiguration("openrouterAgent");
    const maxIterations = config.get("maxToolIterations") || 6;
    const workingMessages = [
      { role: "system", content: getSystemPrompt() },
      ...chat.history.filter((message) => message.role !== "system")
    ];
    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      const responseMessage = await this.client.chat(workingMessages, filesystemTools, chat.model);
      const toolCalls = Array.isArray(responseMessage.tool_calls) ? responseMessage.tool_calls : [];
      if (!toolCalls.length) {
        return responseMessage.content || "";
      }
      workingMessages.push({
        role: "assistant",
        content: responseMessage.content || "",
        tool_calls: toolCalls
      });
      for (const toolCall of toolCalls) {
        await this.handleToolCall(chat, workingMessages, toolCall);
      }
    }
    return "Stopped because the agent reached the tool iteration limit.";
  }
  async handleToolCall(chat, workingMessages, toolCall) {
    const toolName = toolCall.function.name;
    const args = parseToolArguments(toolCall.function.arguments);
    const reason = getToolReason(args);
    this.chats.appendMessage(chat.id, {
      role: "tool",
      name: toolName,
      status: "waiting",
      reason,
      args
    });
    this.sendState();
    try {
      const permission = getToolPermission(toolName);
      if (permission === "ask") {
        const allowed = await this.askToolPermission(toolName, args, reason);
        if (!allowed) {
          const result2 = { ok: false, error: "The user denied this tool call." };
          this.chats.appendMessage(chat.id, {
            role: "tool",
            name: toolName,
            status: "denied",
            reason,
            args,
            result: result2
          });
          workingMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result2)
          });
          return;
        }
      }
      const preview = await previewFilesystemTool(toolName, args);
      if (preview) {
        this.chats.appendMessage(chat.id, {
          role: "tool",
          name: toolName,
          status: "done",
          reason: `Diff preview: ${reason}`,
          args,
          result: preview
        });
        this.sendState();
      }
      this.chats.appendMessage(chat.id, {
        role: "tool",
        name: toolName,
        status: "running",
        reason,
        args
      });
      this.sendState();
      const result = await runFilesystemTool(toolName, args);
      this.chats.appendMessage(chat.id, {
        role: "tool",
        name: toolName,
        status: result.ok === false ? "error" : "done",
        reason,
        args,
        result
      });
      workingMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result, null, 2)
      });
    } catch (error) {
      const result = { ok: false, error: getErrorMessage(error) };
      this.chats.appendMessage(chat.id, {
        role: "tool",
        name: toolName,
        status: "error",
        reason,
        args,
        result
      });
      workingMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result)
      });
    }
    this.sendState();
  }
  async askToolPermission(toolName, args, reason) {
    const answer = await vscode7.window.showWarningMessage(
      `Allow OpenRouter Agent to run ${toolName}?`,
      {
        modal: true,
        detail: [`Reason: ${reason}`, "", `Arguments: ${JSON.stringify(redactLargeArgs(args), null, 2)}`].join("\n")
      },
      "Allow once",
      "Deny"
    );
    return answer === "Allow once";
  }
  sendState() {
    if (!this.panel) {
      return;
    }
    const activeChat = this.chats.getActiveChat();
    const configuredModel = vscode7.workspace.getConfiguration("openrouterAgent").get("model") || DEFAULT_MODEL;
    const models = mergeModels(this.modelOptions, configuredModel, activeChat.model);
    const { history: _history, ...webviewChat } = activeChat;
    this.panel.webview.postMessage({
      type: "state",
      workspaceName: getWorkspaceName(),
      tools: filesystemTools.map((tool) => tool.function.name),
      chats: this.chats.getSummaries(),
      activeChat: webviewChat,
      models,
      toolPermissions: getToolPermissionItems()
    });
  }
  async refreshModels() {
    const now = Date.now();
    if (this.modelLoadPromise || now - this.modelsLoadedAt < 5 * 60 * 1e3) {
      return this.modelLoadPromise || Promise.resolve();
    }
    this.modelLoadPromise = this.client.listModels().then((models) => {
      if (models.length) {
        this.modelOptions = models;
        this.modelsLoadedAt = Date.now();
        this.sendState();
      }
    }).catch((error) => {
      vscode7.window.setStatusBarMessage(`OpenRouter model list unavailable: ${getErrorMessage(error)}`, 4e3);
    }).finally(() => {
      this.modelLoadPromise = void 0;
    });
    return this.modelLoadPromise;
  }
};
function parseToolArguments(rawArgs) {
  if (!rawArgs) {
    return {};
  }
  if (typeof rawArgs === "object" && !Array.isArray(rawArgs)) {
    return rawArgs;
  }
  try {
    const parsed = JSON.parse(String(rawArgs));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
function getToolReason(args) {
  const reason = args.reason;
  return typeof reason === "string" && reason.trim() ? reason.trim() : "No reason provided by the model.";
}
function redactLargeArgs(args) {
  const result = {};
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === "string" && value.length > 600) {
      result[key] = `${value.slice(0, 600)}... <truncated>`;
    } else {
      result[key] = value;
    }
  }
  return result;
}
function mergeModels(models, ...selectedModels) {
  const byId = /* @__PURE__ */ new Map();
  for (const model of models) {
    byId.set(model.id, model);
  }
  for (const modelId of selectedModels) {
    if (!byId.has(modelId)) {
      byId.set(modelId, {
        id: modelId,
        name: modelId,
        supportsTools: true
      });
    }
  }
  return [...byId.values()];
}

// src/extension/chats/chatStore.ts
var import_node_crypto = require("node:crypto");
var vscode8 = __toESM(require("vscode"));
var ChatStore = class {
  chats = /* @__PURE__ */ new Map();
  activeChatId;
  changedEmitter = new vscode8.EventEmitter();
  onDidChange = this.changedEmitter.event;
  constructor(defaultModel = DEFAULT_MODEL) {
    this.createChat(defaultModel);
  }
  createChat(model = DEFAULT_MODEL) {
    const now = Date.now();
    const chat = {
      id: (0, import_node_crypto.randomUUID)(),
      title: "New chat",
      model,
      messages: [],
      history: [],
      lastAnswer: "",
      busy: false,
      createdAt: now,
      updatedAt: now
    };
    this.chats.set(chat.id, chat);
    this.activeChatId = chat.id;
    this.changedEmitter.fire();
    return chat;
  }
  getActiveChat() {
    if (!this.activeChatId || !this.chats.has(this.activeChatId)) {
      return this.createChat();
    }
    return this.chats.get(this.activeChatId);
  }
  getChat(chatId) {
    return this.chats.get(chatId);
  }
  setActiveChat(chatId) {
    const chat = this.chats.get(chatId);
    if (!chat) {
      throw new Error(`Chat not found: ${chatId}`);
    }
    this.activeChatId = chatId;
    this.touch(chat);
    return chat;
  }
  getSummaries() {
    return [...this.chats.values()].sort((a, b) => b.updatedAt - a.updatedAt).map((chat) => ({
      id: chat.id,
      title: chat.title,
      model: chat.model,
      messageCount: chat.messages.filter((message) => message.role === "user" || message.role === "assistant").length,
      busy: chat.busy,
      updatedAt: chat.updatedAt
    }));
  }
  appendMessage(chatId, message) {
    const chat = this.requireChat(chatId);
    const nextMessage = {
      id: (0, import_node_crypto.randomUUID)(),
      createdAt: Date.now(),
      ...message
    };
    chat.messages.push(nextMessage);
    if (message.role === "user" && message.content && chat.title === "New chat") {
      chat.title = message.content.trim().slice(0, 48) || chat.title;
    }
    this.touch(chat);
    return nextMessage;
  }
  clearChat(chatId) {
    const chat = this.requireChat(chatId);
    chat.messages = [];
    chat.history = [];
    chat.lastAnswer = "";
    chat.busy = false;
    chat.title = "New chat";
    this.touch(chat);
  }
  setModel(chatId, model) {
    const chat = this.requireChat(chatId);
    chat.model = model;
    this.touch(chat);
  }
  setBusy(chatId, busy) {
    const chat = this.requireChat(chatId);
    chat.busy = busy;
    this.touch(chat);
  }
  setLastAnswer(chatId, answer) {
    const chat = this.requireChat(chatId);
    chat.lastAnswer = answer;
    this.touch(chat);
  }
  requireChat(chatId) {
    const chat = this.chats.get(chatId);
    if (!chat) {
      throw new Error(`Chat not found: ${chatId}`);
    }
    return chat;
  }
  touch(chat) {
    chat.updatedAt = Date.now();
    this.changedEmitter.fire();
  }
};

// src/extension/chats/chatTreeProvider.ts
var vscode9 = __toESM(require("vscode"));
var ChatTreeProvider = class {
  constructor(store) {
    this.store = store;
    this.store.onDidChange(() => this.refresh());
  }
  store;
  changedEmitter = new vscode9.EventEmitter();
  onDidChangeTreeData = this.changedEmitter.event;
  refresh() {
    this.changedEmitter.fire();
  }
  getTreeItem(chat) {
    const item = new vscode9.TreeItem(chat.title, vscode9.TreeItemCollapsibleState.None);
    item.id = chat.id;
    item.description = chat.busy ? "running" : chat.model;
    item.tooltip = `${chat.title}
${chat.model}`;
    item.iconPath = new vscode9.ThemeIcon(chat.busy ? "sync~spin" : "comment-discussion");
    item.command = {
      command: "openrouterAgent.openChat",
      title: "Open Chat",
      arguments: [chat.id]
    };
    return item;
  }
  getChildren() {
    return this.store.getSummaries();
  }
};

// src/extension.ts
function activate(context) {
  const configModel = vscode10.workspace.getConfiguration("openrouterAgent").get("model") || DEFAULT_MODEL;
  const chats = new ChatStore(configModel);
  const agent = new AgentController(context, chats);
  const chatTreeProvider = new ChatTreeProvider(chats);
  context.subscriptions.push(
    vscode10.window.registerTreeDataProvider("openrouterAgent.chats", chatTreeProvider),
    vscode10.commands.registerCommand("openrouterAgent.openChat", (chatId) => agent.openChat(chatId)),
    vscode10.commands.registerCommand("openrouterAgent.newChat", () => agent.createChat()),
    vscode10.commands.registerCommand("openrouterAgent.editSelection", () => agent.editSelection())
  );
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
