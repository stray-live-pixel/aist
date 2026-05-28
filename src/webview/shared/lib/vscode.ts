import type { WebviewToExtensionMessage } from '../types';

type VsCodeWebviewState = {
  chatId?: string;
};

type VsCodeApi = {
  postMessage(message: WebviewToExtensionMessage): void;
  getState(): VsCodeWebviewState | undefined;
  setState(state: VsCodeWebviewState): void;
};

declare global {
  function acquireVsCodeApi(): VsCodeApi;
}

export const vscode = acquireVsCodeApi();
