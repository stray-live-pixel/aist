import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';

import type { ChatModelSettings } from '../../core/shared/types/types';
import {
  containsSecretLikePath as containsSecretLikePathObject,
  getJsonPath as getJsonPathObject,
  normalizeConfigScope as normalizeConfigScopeObject,
  normalizeToolPermissionsSetting as normalizeToolPermissionsSettingObject,
  redactConfigValue as redactConfigValueObject
} from './configValues';
import { createFileBackedRuntimeChatRepository as createRepositoryAdapter } from './createFileBackedRuntimeChatRepository';
import { formatError as formatErrorObject } from './formatError';
import {
  mergeJsonObjects as mergeJsonObjectsObject,
  readOptionalJsonObject as readOptionalJsonObjectObject
} from './jsonFiles';
import {
  asJsonObject as asJsonObjectObject,
  isJsonObject as isJsonObjectObject,
  isJsonValue as isJsonValueObject
} from './jsonGuards';
import {
  createJsonRpcError as createJsonRpcErrorObject,
  isJsonRpcResponse as isJsonRpcResponseObject,
  isValidJsonRpcRequest as isValidJsonRpcRequestObject,
  toJsonRpcError as toJsonRpcErrorObject
} from './jsonRpc';
import {
  formatMemorySubagentSuccessText as formatMemorySubagentSuccessTextObject,
  getReflectionMemoryNote as getReflectionMemoryNoteObject,
  getReflectionMemoryScope as getReflectionMemoryScopeObject
} from './memorySubagentMessages';
import {
  dedupeAndSortModels as dedupeAndSortModelsObject,
  fallbackModels as fallbackModelsObject,
  getDaemonModelOption as getDaemonModelOptionObject
} from './modelOptions';
import { normalizeChatModelSettings as normalizeChatModelSettingsObject } from './normalizeChatModelSettings';
import {
  asOptionalRecord as asOptionalRecordObject,
  optionalNumber as optionalNumberObject,
  optionalString as optionalStringObject,
  requireJsonValue as requireJsonValueObject,
  requireRecord as requireRecordObject,
  requireString as requireStringObject
} from './params';
import { prepareSocketPath as prepareSocketPathObject } from './prepareSocketPath';
import { sanitizeLogDetails as sanitizeLogDetailsObject } from './sanitizeLogDetails';
import { toDaemonChat as toDaemonChatObject } from './toDaemonChat';
import {
  hasApprovalDecision as hasApprovalDecisionObject,
  isEditorContextInput as isEditorContextInputObject,
  normalizeAutonomousExportFormat as normalizeAutonomousExportFormatObject,
  normalizeDaemonSkill as normalizeDaemonSkillObject,
  normalizeModelProvider as normalizeModelProviderObject,
  parseAutonomousLaunch as parseAutonomousLaunchObject
} from './validators';

export { fs, net, path };
export { FileBackedConfigStore, FileSecretStore, OPENROUTER_API_KEY_SECRET_KEY } from '../../core/app/config/config';
export { AgentRuntimeService } from '../../core/app/runtime/agentRuntime';
export { ChatRepository } from '../../core/entities/chat/chatRepository';
export { AgentMemoryStore, createMemoryStorePaths } from '../../core/entities/memory/memory';
export { createAuxiliaryModelInvoker as createCoreAuxiliaryModelInvoker } from '../../core/entities/model/auxiliaryModel';
export { CodexAuthSessionProvider } from '../../core/entities/model/codexAuth';
export { CodexResponsesTransport } from '../../core/entities/model/codexTransport';
export { DEFAULT_MODEL } from '../../core/entities/model/modelDefaults';
export { normalizeProviderProfiles } from '../../core/entities/model/normalizeProviderProfiles';
export { OpenRouterTransport } from '../../core/entities/model/openrouterTransport';
export { RunRepository } from '../../core/entities/run/runRepository';
export {
  globalSettingsFile,
  globalWorkspaceRoot,
  safeMkdir,
  workspaceAistRoot,
  workspaceSettingsFile
} from '../../core/entities/storage/storage';
export { SubagentRepository } from '../../core/entities/subagent/subagentRepository';
export {
  getToolExecutionRequirement,
  normalizeToolApprovalDecision
} from '../../core/features/approval/approvalProtocol';
export {
  createCompactionMessages,
  selectCompactionTailMessages,
  splitCompactionHistory
} from '../../core/features/compaction/compaction';
export { analyzeMemoryChatDetailed, getRelevantMemoryPromptBlockBySubagent } from '../../core/features/memory-subagent';
export { validateReflectionCandidates } from '../../core/features/reflection/reflection';
export { runNodeSkillTool } from '../../core/features/skills/skills';
export { buildFileAgentSystemPrompt } from '../../core/features/system-prompt/filePromptConfig';
export { DefaultToolRegistry } from '../../core/features/tool-execution/toolRegistry';
export { ToolRunner } from '../../core/features/tool-execution/toolRunner';
export { AutonomousBackend } from '../../core/processes/autonomous';
export { getRepoVerificationContextNote } from '../../core/shared/lib/repoMap';
export { createNodeFilesystemToolRunner } from '../../core/tools/fs/node_filesystem_tools/nodeFilesystemTools';
export {
  DAEMON_BUSY_ERROR_CODE,
  DAEMON_EVENT_METHOD,
  DAEMON_PROTOCOL_VERSION,
  getDaemonSocketPath
} from '../daemonProtocol';
export { dispatchDaemonRpcMethod } from '../daemon/handlers/dispatchDaemonRpcMethod';
export { DaemonRpcError } from './DaemonRpcError';
export { DaemonFileLogger } from './DaemonFileLogger';
export {
  E2E_OPENROUTER_ENDPOINT_ENV_KEY,
  OPENROUTER_ENV_KEY,
  READONLY_DAEMON_TOOLS,
  REDACTED_VALUE,
  unusedFetch
} from './constants';
export { createMemorySubagentMessages } from './memorySubagentMessages';

export const createFileBackedRuntimeChatRepository = (repository: any) => createRepositoryAdapter({ repository });
export const prepareSocketPath = (socketPath: string) => prepareSocketPathObject({ socketPath });
export const isValidJsonRpcRequest = (value: unknown) => isValidJsonRpcRequestObject(value);
export const isJsonRpcResponse = (value: unknown) => isJsonRpcResponseObject(value);
export const createJsonRpcError = (code: number, dataCode: string, message: string, details: any = {}) =>
  createJsonRpcErrorObject({ code, dataCode, message, details });
export const toJsonRpcError = (error: unknown) => toJsonRpcErrorObject({ error });
export const getDaemonModelOption = (modelId: string) => getDaemonModelOptionObject({ modelId });
export const isEditorContextInput = (value: unknown) => isEditorContextInputObject(value);
export const normalizeDaemonSkill = (value: unknown) => normalizeDaemonSkillObject({ value });
export const normalizeChatModelSettings = (value: unknown, fallback: ChatModelSettings) =>
  normalizeChatModelSettingsObject({ value, fallback });
export const createMemorySubagentSuccessText = (candidateCount: number) =>
  formatMemorySubagentSuccessTextObject({ candidateCount });
export const formatMemorySubagentSuccessText = (candidateCount: number) =>
  formatMemorySubagentSuccessTextObject({ candidateCount });
export const getReflectionMemoryScope = (candidate: any) => getReflectionMemoryScopeObject({ candidate });
export const getReflectionMemoryNote = (candidate: any) => getReflectionMemoryNoteObject({ candidate });
export const fallbackModels = (provider: any) => fallbackModelsObject({ provider });
export const dedupeAndSortModels = (models: any) => dedupeAndSortModelsObject({ models });
export const toDaemonChat = (chat: any) => toDaemonChatObject({ chat });
export const requireRecord = (value: unknown, label: string) => requireRecordObject({ value, label });
export const asOptionalRecord = (value: unknown) => asOptionalRecordObject({ value });
export const requireString = (input: Record<string, unknown>, key: string) => requireStringObject({ input, key });
export const optionalString = (input: Record<string, unknown>, key: string) => optionalStringObject({ input, key });
export const getAuxiliaryLegacySettingKey = (id: 'compaction' | 'tool' | 'memory', key: string) =>
  id === 'compaction' ? `compaction.${key}` : id === 'tool' ? `toolModel.${key}` : `memorySubagent.${key}`;
export const optionalNumber = (input: Record<string, unknown>, key: string) => optionalNumberObject({ input, key });
export const hasApprovalDecision = (input: Record<string, unknown>) => hasApprovalDecisionObject({ input });
export const requireJsonValue = (value: unknown, key: string) => requireJsonValueObject({ value, key });
export const normalizeConfigScope = (value: string) => normalizeConfigScopeObject({ value });
export const normalizeToolPermissionsSetting = (value: unknown) => normalizeToolPermissionsSettingObject({ value });
export const normalizeModelProvider = (value: string) => normalizeModelProviderObject({ value });
export const parseAutonomousLaunch = (value: unknown) => parseAutonomousLaunchObject({ value });
export const normalizeAutonomousExportFormat = (value: string) => normalizeAutonomousExportFormatObject({ value });
export const isJsonValue = (value: unknown) => isJsonValueObject(value);
export const isJsonObject = (value: unknown) => isJsonObjectObject(value);
export const readOptionalJsonObject = (filePath: string) => readOptionalJsonObjectObject({ filePath });
export const mergeJsonObjects = (base: any, override: any) => mergeJsonObjectsObject({ base, override });
export const getJsonPath = (settings: any, key: string) => getJsonPathObject({ settings, key });
export const redactConfigValue = (key: string, value: any) => redactConfigValueObject({ key, value });
export const containsSecretLikePath = (key: string, value: any) => containsSecretLikePathObject({ key, value });
export const asJsonObject = (value: any) => asJsonObjectObject({ value });
export const sanitizeLogDetails = (value: unknown) => sanitizeLogDetailsObject({ value });
export const formatError = (error: unknown) => formatErrorObject({ error });
