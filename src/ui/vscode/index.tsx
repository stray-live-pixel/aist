import { setAgentHost } from '../shared/api/agentHost';
import { mountApp } from '../shared/app/mountApp';
import { createVscodeAgentHost } from './adapters/createVscodeAgentHost';

// VS Code shell: регистрируем vscode-транспорт и монтируем общий UI.
setAgentHost(createVscodeAgentHost());
mountApp();
