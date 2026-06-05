import { Gauge } from 'lucide-react';
import { memo } from 'react';

import { useI18n } from '../../../i18n';
import { agentActions } from '../../../lib/agentActions';
import type { AgentLanguage, ComposerUiSettings } from '../../../types';
import { Card, Select, Switch, TextField } from '../../../ui';
import styles from '../PermissionsPage.module.scss';
import { clampNumber } from './utils';

/**
 * Что это: системные настройки языка, лимита tool-итераций и поведения Composer.
 * Зачем нужно: Codex авторизация переехала в настройки провайдера, поэтому системная страница отвечает только
 * за общие параметры агента, не смешивая сетевой маршрут и runtime-поведение.
 */
export const SystemSettingsPage = memo(function SystemSettingsPage({
  agentLanguage,
  maxToolIterations,
  composerUiSettings
}: {
  agentLanguage: AgentLanguage;
  maxToolIterations: number;
  composerUiSettings: ComposerUiSettings;
}) {
  const { t } = useI18n();
  return (
    <div className={styles.sectionStack}>
      <Card title={t('settings.system.languageTitle')} description={t('settings.system.languageDescription')}>
        <Select
          label={t('settings.system.responseLanguage')}
          value={agentLanguage}
          options={[
            { value: 'ru', label: 'Русский' },
            { value: 'en', label: 'English' }
          ]}
          onChange={(event) => agentActions.setAgentLanguage(event.target.value as AgentLanguage)}
        />
      </Card>
      <Card title={t('settings.system.iterationTitle')} description={t('settings.system.iterationDescription')}>
        <TextField
          type="number"
          min={0}
          step={1}
          value={maxToolIterations}
          leadingIcon={<Gauge size={15} />}
          onChange={(event) =>
            agentActions.setMaxToolIterations(clampNumber(event.target.value, 0, Number.MAX_SAFE_INTEGER, 0, true))
          }
        />
      </Card>
      <Card title={t('settings.system.composerTitle')} description={t('settings.system.composerDescription')}>
        <div className={styles.sectionStackCompact}>
          <Switch
            label={t('settings.system.composerMinimizeOnBlur')}
            description={t('settings.system.composerMinimizeOnBlurDescription')}
            checked={composerUiSettings.minimizeOnBlur}
            onChange={(event) => agentActions.setComposerUiSettings({ minimizeOnBlur: event.target.checked })}
          />
          <Switch
            label={t('settings.system.composerGradientWhileBusy')}
            description={t('settings.system.composerGradientWhileBusyDescription')}
            checked={composerUiSettings.gradientWhileBusy}
            onChange={(event) => agentActions.setComposerUiSettings({ gradientWhileBusy: event.target.checked })}
          />
        </div>
      </Card>
    </div>
  );
});
