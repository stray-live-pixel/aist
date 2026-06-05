import { setAgentHost } from '../shared/api/agentHost';
import { mountApp } from '../shared/app/mountApp';
import { createWebAgentHost } from './adapters/createWebAgentHost';

// Web shell: регистрируем web-транспорт (HTTP RPC + SSE) и монтируем общий UI.
setAgentHost(createWebAgentHost());
mountApp();
