import { type AutonomousFlowDefinition, type EditableAutonomousFlowDefinition } from '../../../shared/types';

export function toEditableFlow(flow: AutonomousFlowDefinition): EditableAutonomousFlowDefinition {
  return {
    id: flow.id,
    title: flow.title,
    description: flow.description,
    body: flow.body,
    defaultModel: flow.defaultModel,
    defaultCodexModel: flow.defaultCodexModel,
    defaultSummaryRules: flow.defaultSummaryRules,
    stages: flow.stages.map((stage) => ({
      file: stage.file,
      title: stage.title,
      body: stage.body,
      model: stage.model,
      codexModel: stage.codexModel,
      contexts: stage.contexts,
      summaryRules: stage.summaryRules
    }))
  };
}
