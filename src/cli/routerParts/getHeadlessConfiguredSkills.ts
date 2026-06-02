import { FileBackedConfigStore } from '../../core/app/config/config';
import { type AgentSkill } from '../../core/features/skills/skills';
import { getFirstConfigSetting } from './getFirstConfigSetting';
import { normalizeHeadlessSkill } from './normalizeHeadlessSkill';

export async function getHeadlessConfiguredSkills(configStore: FileBackedConfigStore): Promise<readonly AgentSkill[]> {
  const value = await getFirstConfigSetting(configStore, ['openrouterAgent.customSkills', 'customSkills']);
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => normalizeHeadlessSkill(item)).filter((skill): skill is AgentSkill => Boolean(skill));
}
