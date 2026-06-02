import { type AgentSkill } from '../../core/features/skills/skills';

export function normalizeHeadlessSkill(value: unknown): AgentSkill | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id.trim() : '';
  const label = typeof record.label === 'string' ? record.label.trim() : '';
  const command = typeof record.command === 'string' ? record.command.trim() : '';
  if (!id || !label || !command) {
    return undefined;
  }

  return {
    id,
    label,
    command,
    permission: record.permission === 'auto' ? 'auto' : 'ask',
    description: typeof record.description === 'string' ? record.description.trim() : '',
    scope: typeof record.scope === 'string' ? record.scope : undefined
  };
}
