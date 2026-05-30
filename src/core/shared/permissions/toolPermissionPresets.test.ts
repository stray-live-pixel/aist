import { describe, expect, it } from 'vitest';

import {
  getHeadlessToolPermission,
  getHeadlessToolPermissionPresetId,
  getToolPermissionPreset,
  getToolPermissionPresets
} from './toolPermissionPresets';

const tools = [
  { name: 'read_file', defaultPermission: 'ask' as const },
  { name: 'write_file', defaultPermission: 'ask' as const },
  { name: 'run_bash_script', defaultPermission: 'ask' as const },
  { name: 'run_skill', defaultPermission: 'ask' as const },
  { name: 'project_auto_tool', defaultPermission: 'auto' as const }
];

describe('shared tool permission presets', () => {
  it('keeps fast edit and autonomous skills automatic from the shared source', () => {
    const presets = getToolPermissionPresets({ tools });

    expect(presets.find((preset) => preset.id === 'fast-edit')?.permissions.run_skill).toBe('auto');
    expect(presets.find((preset) => preset.id === 'autonomous')?.permissions.run_skill).toBe('auto');
  });

  it('normalizes missing preset permissions through tool defaults', () => {
    const preset = getToolPermissionPreset({ presetId: 'balanced', tools });

    expect(preset?.permissions.project_auto_tool).toBe('auto');
  });

  it('maps headless modes to the same shared presets used by the extension', () => {
    expect(getHeadlessToolPermissionPresetId({ approvalMode: 'ask' })).toBe('confirm-all');
    expect(getHeadlessToolPermissionPresetId({ approvalMode: 'deny' })).toBe('confirm-all');
    expect(getHeadlessToolPermissionPresetId({ approvalMode: 'auto-readonly' })).toBe('balanced');
    expect(getHeadlessToolPermissionPresetId({ approvalMode: 'auto-all' })).toBe('autonomous');

    expect(getHeadlessToolPermission({ approvalMode: 'auto-readonly', toolName: 'read_file', tools })).toBe('auto');
    expect(getHeadlessToolPermission({ approvalMode: 'auto-readonly', toolName: 'run_skill', tools })).toBe('ask');
    expect(getHeadlessToolPermission({ approvalMode: 'auto-all', toolName: 'run_skill', tools })).toBe('auto');
  });
});
