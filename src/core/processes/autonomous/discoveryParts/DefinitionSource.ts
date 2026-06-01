import { type AutonomousSourceKind } from '../types';

export type DefinitionSource = {
  kind: AutonomousSourceKind;
  flowsRoot: string;
  runsRoot: string;
};
