import type { AutonomousDefinitionDiagnostic, AutonomousDefinitions } from './definitions';
import type { AutonomousEngineDescriptor } from './engine';
import type { AutonomousSessionView } from './session';

export type AutonomousState = {
  workspaceName: string;
  storageRoot: string;
  definitions: AutonomousDefinitions;
  engines: AutonomousEngineDescriptor[];
  sessions: AutonomousSessionView[];
  diagnostics: AutonomousDefinitionDiagnostic[];
};
