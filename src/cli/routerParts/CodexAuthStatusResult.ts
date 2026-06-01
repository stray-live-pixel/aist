import { AuthStatusResult } from './AuthStatusResult';

export type CodexAuthStatusResult = AuthStatusResult & {
  readonly login: 'vscode-extension';
};
