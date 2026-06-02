import { AgentConfigScope } from './AgentConfigScope';

export async function setAgentConfigScope(_scope: AgentConfigScope): Promise<void> {
  // Kept for backward compatibility with old webview messages. New instruction
  // management always uses global ~/.aist-agent and local .aist-agent stores.
}
