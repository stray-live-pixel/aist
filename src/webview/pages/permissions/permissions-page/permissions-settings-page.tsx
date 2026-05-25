import { memo } from 'react';

import { PermissionPresetSelect, ToolPermissionSelect } from '../../../features';
import { useI18n } from '../../../shared/i18n';
import { vscode } from '../../../shared/lib/vscode';
import type { ToolPermissionItem, ToolPermissionPreset, ToolPermissionPresetId } from '../../../shared/types';
import { Badge, Button, Card } from '../../../shared/ui';
import styles from '../PermissionsPage.module.scss';

/**
 * Что это: раздел настройки preset и per-tool прав.
 * Зачем нужно: список tools может расти, поэтому строки вынесены в memo-компоненты и не пересоздают layout страницы.
 */
export const PermissionsSettingsPage = memo(function PermissionsSettingsPage({
  tools,
  permissionPresets,
  activePermissionPresetId
}: {
  tools: ToolPermissionItem[];
  permissionPresets: ToolPermissionPreset[];
  activePermissionPresetId: ToolPermissionPresetId | 'custom';
}) {
  const { t } = useI18n();
  return (
    <div className={styles.sectionStack}>
      <Card title={t('settings.permissions.presetsTitle')} description={t('settings.permissions.presetsDescription')}>
        <div className={styles.formGrid}>
          <PermissionPresetSelect presets={permissionPresets} activeId={activePermissionPresetId} />
          <div className={styles.twoColumns}>
            {permissionPresets.map((preset) => (
              <PermissionPresetButton key={preset.id} preset={preset} active={preset.id === activePermissionPresetId} />
            ))}
          </div>
          {activePermissionPresetId === 'custom' ? (
            <Badge tone="warning">{t('settings.permissions.customActive')}</Badge>
          ) : null}
        </div>
      </Card>
      <Card title={t('settings.permissions.perToolTitle')} description={t('settings.permissions.perToolDescription')}>
        <div className={styles.list}>
          {tools.map((tool) => (
            <ToolPermissionRow key={tool.name} item={tool} />
          ))}
        </div>
      </Card>
    </div>
  );
});

const PermissionPresetButton = memo(function PermissionPresetButton({
  preset,
  active
}: {
  preset: ToolPermissionPreset;
  active: boolean;
}) {
  const { t } = useI18n();
  return (
    <Button
      variant={active ? 'primary' : 'secondary'}
      onClick={() => vscode.postMessage({ type: 'setToolPermissionPreset', presetId: preset.id })}
    >
      {t(`settings.preset.${preset.id}.label` as never)}
    </Button>
  );
});

const ToolPermissionRow = memo(function ToolPermissionRow({ item }: { item: ToolPermissionItem }) {
  return <ToolPermissionSelect item={item} />;
});
