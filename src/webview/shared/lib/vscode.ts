import type { WebviewToExtensionMessage } from '../types';

type VsCodeApi = {
  postMessage(message: WebviewToExtensionMessage): void;
};

declare global {
  function acquireVsCodeApi(): VsCodeApi;
}

export const vscode = acquireVsCodeApi();
