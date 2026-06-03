import { getPerformanceTelemetryDashboardState } from '../../../../core/features/performanceTelemetry';
import { getTelemetryDashboardState } from '../../../../core/features/telemetry/telemetry';
import { getAgentSkills } from '../../../skills/skills';
import { getAgentConfigScope, getProjectInstructions, getPromptConfig } from '../../config/agentConfigStore';
import { getAuxiliaryModelsSettings } from '../../config/auxiliaryModelSettings';
import { getCompactionSettings } from '../../config/compaction';
import { getComposerUiSettings } from '../../config/composerUi';
import { getApprovalNotificationSettings } from '../../config/notifications';
import { getActiveAgentMode, getAgentLanguage, getAgentModes } from '../../config/settings';
import { getAgentSettingsSnapshot, getDefaultModelSettings } from '../../config/settingsSnapshot';
import { getAgentInstructionSources } from '../../config/systemPrompt';
import { getDaemonToolCatalog, getDaemonTools } from '../../daemon/toolCatalog';
import { getAgentMemoryItems } from '../../memory/memory';
import { SendAgentStateParams } from './SendAgentStateParams';
import { buildProviderProfilesWithApiKeyStatus } from './buildProviderProfilesWithApiKeyStatus';
import { postStateToSurface } from './postStateToSurface';

export function sendAgentState(params: SendAgentStateParams): void {
  if (!params.surfaces.length) {
    params.logger.info('sendState skipped: no webview surfaces are registered');
    return;
  }

  const { configuredModel, maxToolIterations, reasoningEffort, codexServiceTier, editorContextMode, streamingEnabled } =
    getAgentSettingsSnapshot();
  const defaultModelSettings = getDefaultModelSettings();
  const language = getAgentLanguage();
  const activeMode = getActiveAgentMode();
  const agentModes = getAgentModes();
  const customSkills = getAgentSkills();
  const tools = getDaemonTools(customSkills);
  const agentConfigScope = getAgentConfigScope();
  const projectInstructions = getProjectInstructions();
  const instructionSources = getAgentInstructionSources();
  const promptConfig = getPromptConfig();
  const memoryItems = getAgentMemoryItems();
  const compactionSettings = getCompactionSettings();
  const auxiliaryModels = getAuxiliaryModelsSettings();
  const approvalNotificationSettings = getApprovalNotificationSettings();
  const composerUiSettings = getComposerUiSettings();
  const projectToolDiagnostics = getDaemonToolCatalog().snapshot().diagnostics;
  const telemetry = getTelemetryDashboardState();
  const performanceTelemetry = getPerformanceTelemetryDashboardState();

  void buildProviderProfilesWithApiKeyStatus(params)
    .then((providerProfiles) => {
      for (const surface of params.surfaces) {
        postStateToSurface(surface, {
          ...params,
          configuredModel,
          defaultModelSettings,
          maxToolIterations,
          reasoningEffort,
          codexServiceTier,
          editorContextMode,
          streamingEnabled,
          language,
          activeMode,
          agentModes,
          customSkills,
          tools,
          agentConfigScope,
          projectInstructions,
          promptConfig,
          memoryItems,
          instructionSources,
          auxiliaryModels,
          compactionSettings,
          approvalNotificationSettings,
          composerUiSettings,
          telemetry,
          performanceTelemetry,
          projectToolDiagnostics,
          providerProfiles
        });
      }
    })
    .catch((error) => params.logger.error('Failed to build provider auth state', error));
}
