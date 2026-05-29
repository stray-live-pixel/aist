import fs from 'node:fs';

import type { StoredAgentConfig } from '../types';

/**
 * Что это: безопасно читает settings.json агента из указанного файла.
 * Зачем нужно: daemon не должен падать из-за отсутствующего или битого config,
 * иначе пользователь не сможет отправить сообщение в чат.
 */
export function readStoredAgentConfig(params: { filePath: string }): StoredAgentConfig {
  try {
    if (!fs.existsSync(params.filePath)) return {};

    // Читаем файл синхронно: prompt собирается прямо перед model request,
    // а файл маленький и должен отражать последнее состояние настроек.
    const parsed = JSON.parse(fs.readFileSync(params.filePath, 'utf8')) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as StoredAgentConfig) : {};
  } catch {
    // Битый config игнорируем так же, как extension-хранилище: лучше отправить
    // базовый prompt, чем полностью заблокировать агента.
    return {};
  }
}
