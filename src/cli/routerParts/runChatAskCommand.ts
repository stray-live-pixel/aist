import path from 'node:path';

import { FileBackedConfigStore } from '../../core/app/config/config';
import { AgentRuntimeService } from '../../core/app/runtime/agentRuntime';
import { ChatRepository } from '../../core/entities/chat/chatRepository';
import { AgentMemoryStore, createMemoryStorePaths } from '../../core/entities/memory/memory';
import { RunRepository } from '../../core/entities/run/runRepository';
import { getRelevantMemoryPromptBlockBySubagent } from '../../core/features/memory-subagent';
import { buildFileAgentSystemPrompt } from '../../core/features/system-prompt/filePromptConfig';
import { DefaultToolRegistry } from '../../core/features/tool-execution/toolRegistry';
import { getRepoVerificationContextNote } from '../../core/shared/lib/repoMap';
import { type RuntimeEvent } from '../../core/shared/types/types';
import { createNodeFilesystemToolRunner } from '../../core/tools/fs/node_filesystem_tools/nodeFilesystemTools';
import { CLI_APPROVAL_REQUIRED_EXIT_CODE } from './CLI_APPROVAL_REQUIRED_EXIT_CODE';
import { CLI_NAME } from './CLI_NAME';
import { CliCommand } from './CliCommand';
import { CliCommandError } from './CliCommandError';
import { CliUsageError } from './CliUsageError';
import { CliWriter } from './CliWriter';
import { RunCliOptions } from './RunCliOptions';
import { createFileBackedRuntimeChatRepository } from './createFileBackedRuntimeChatRepository';
import { createHeadlessModelClient } from './createHeadlessModelClient';
import { createHeadlessToolCallHandler } from './createHeadlessToolCallHandler';
import { getHeadlessConfiguredSkills } from './getHeadlessConfiguredSkills';
import { getHeadlessLanguage } from './getHeadlessLanguage';
import { getHeadlessModelOption } from './getHeadlessModelOption';
import { getHeadlessRuntimeConfig } from './getHeadlessRuntimeConfig';
import { readStreamText } from './readStreamText';
import { requireChat } from './requireChat';
import { resolveChatWorkspaceRoot } from './resolveChatWorkspaceRoot';
import { silentLogger } from './silentLogger';

export async function runChatAskCommand(
  command: Extract<CliCommand, { kind: 'chatAsk' }>,
  options: RunCliOptions,
  stdout: CliWriter,
  stderr: CliWriter
): Promise<number> {
  const workspaceRoot = await resolveChatWorkspaceRoot(command.workspace, options);
  const chatRepository = new ChatRepository({ workspaceRoot, homeDir: options.homeDir });
  const chat = await requireChat(chatRepository, command.chatId);
  if (chat.busy) {
    throw new CliCommandError('run.busy', `Chat already has an active run: ${chat.id}`, {
      details: { chatId: chat.id }
    });
  }

  const prompt = command.stdin ? await readStreamText(options.stdin || process.stdin) : command.prompt || '';
  if (!prompt.trim()) {
    throw new CliUsageError(`'chat ask' prompt is empty.`);
  }

  const configStore = new FileBackedConfigStore({ workspaceRoot, homeDir: options.homeDir, logger: silentLogger });
  const modelClient = options.modelClient || (await createHeadlessModelClient(chat.model, configStore, options));
  const runRepository = new RunRepository({ workspaceRoot, homeDir: options.homeDir });
  const toolRegistry = options.toolRegistry || new DefaultToolRegistry();
  const memoryStore = new AgentMemoryStore(createMemoryStorePaths({ workspaceRoot, homeDir: options.homeDir }));
  const runState: {
    approvalRequired?: {
      runId: string;
      chatId: string;
      approvalId: string;
      messageId: string;
      toolName: string;
    };
    runError?: Extract<RuntimeEvent, { type: 'run.error' }>;
  } = {};
  const writeEvent = (event: RuntimeEvent): void => {
    if (event.type === 'tool.call.approvalRequested' && command.approvalMode !== 'deny') {
      runState.approvalRequired = {
        runId: event.runId,
        chatId: event.chatId,
        approvalId: event.approvalId,
        messageId: event.messageId,
        toolName: event.toolCall.name
      };
    }
    if (event.type === 'run.error') {
      runState.runError = event;
    }
    stdout(`${JSON.stringify(event)}\n`);
  };

  const runtime = new AgentRuntimeService({
    chatRepository: createFileBackedRuntimeChatRepository(chatRepository),
    runRepository,
    modelClient,
    toolRegistry,
    handleToolCall: createHeadlessToolCallHandler({
      approvalMode: command.approvalMode,
      filesystem: options.filesystemToolRunner || {
        execute: createNodeFilesystemToolRunner({
          context: {
            workspaceRoot,
            workspaceName: path.basename(workspaceRoot)
          }
        })
      },
      memoryStore,
      toolRegistry,
      configStore,
      workspaceRoot
    }),
    configProvider: {
      getSnapshot: () => getHeadlessRuntimeConfig(configStore)
    },
    promptProvider: {
      getSystemPrompt: async () => {
        const skills = await getHeadlessConfiguredSkills(configStore);
        return buildFileAgentSystemPrompt({
          workspaceRoot,
          homeDir: options.homeDir,
          language: await getHeadlessLanguage(configStore),
          skills: skills.map(({ id, label, description }) => ({ id, label, description }))
        });
      }
    },
    contextProviders: {
      getRepoContextNote: (inputPrompt) => getRepoVerificationContextNote(workspaceRoot, inputPrompt),
      getMemoryContextBlock: (input) =>
        getRelevantMemoryPromptBlockBySubagent({
          selection: {
            prompt: input.prompt,
            chatHistory: input.chat.messages,
            memoryItems: memoryStore.list(),
            chatModel: input.chat.model,
            settings: { model: input.chat.model, reasoningEffort: input.chat.modelSettings.reasoningEffort }
          },
          modelClient
        })
    },
    modelCatalog: {
      getOption: getHeadlessModelOption
    },
    skillProvider: {
      getSkills: () => getHeadlessConfiguredSkills(configStore)
    },
    workspaceRootProvider: {
      getWorkspaceRoot: () => workspaceRoot
    },
    eventSink: {
      emit: writeEvent
    },
    logger: silentLogger,
    concurrencyScope: 'chat',
    reflection: {
      enabled: false
    }
  });

  const result = await runtime.ask(chat.id, prompt);
  if (!result.accepted) {
    throw new CliCommandError(result.error.code || 'run.rejected', result.error.message, {
      details: { chatId: chat.id }
    });
  }

  if (runState.approvalRequired) {
    stderr(
      `${CLI_NAME}: approval required for tool ${runState.approvalRequired.toolName} in run ${runState.approvalRequired.runId}; approval.resolve is not implemented in this MVP.\n`
    );
    return CLI_APPROVAL_REQUIRED_EXIT_CODE;
  }

  if (runState.runError) {
    stderr(`${CLI_NAME}: run failed: ${runState.runError.error.message}\n`);
    return 1;
  }

  return 0;
}
