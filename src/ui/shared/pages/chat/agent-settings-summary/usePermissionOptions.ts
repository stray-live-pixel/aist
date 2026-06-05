import { useMemo } from 'react';

import type { AgentState } from '../../../shared/types';
import type { SelectOption } from '../../../shared/ui';
import type { Translate } from './types';

/**
 * Что это: подготавливает варианты preset доступа для compact Select.
 * Зачем нужно: composer должен показывать и встроенные presets, и временный custom-режим.
 * Какую проблему решает: список permissions собирается в одном месте и не дублируется в UI.
 */
export function usePermissionOptions({ state, t }: { state: AgentState; t: Translate }): SelectOption[] {
  return useMemo(
    () => [
      ...(state.activeToolPermissionPresetId === 'custom' ? [{ value: 'custom', label: t('common.custom') }] : []),
      ...state.toolPermissionPresets.map((preset) => ({
        value: preset.id,
        label: t(`settings.preset.${preset.id}.label` as never)
      }))
    ],
    [state.activeToolPermissionPresetId, state.toolPermissionPresets, t]
  );
}
