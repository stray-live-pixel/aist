import { createRoot } from 'react-dom/client';

import { App } from './App';
import './styles.css';

/**
 * Монтирует общий UI в DOM-узел #root.
 *
 * Не вызывается автоматически: каждая оболочка (web/vscode/desktop) сначала регистрирует свой
 * AgentHost через setAgentHost(), а затем вызывает mountApp(). Так транспорт гарантированно готов
 * до первого рендера и первого действия пользователя.
 */
export function mountApp(): void {
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('AIST UI: root element #root not found.');
  }

  createRoot(root).render(<App />);
}
