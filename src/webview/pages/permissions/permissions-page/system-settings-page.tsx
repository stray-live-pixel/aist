import { CheckCircle2, Gauge, LogIn, LogOut } from 'lucide-react';
import { memo } from 'react';

import { useI18n } from '../../../shared/i18n';
import { vscode } from '../../../shared/lib/vscode';
import type { AgentLanguage } from '../../../shared/types';
import { Badge, Button, Card, Select, TextField } from '../../../shared/ui';
import styles from '../PermissionsPage.module.scss';
import { clampNumber } from './utils';

/**
 * Что это: системные настройки языка, лимита tool-итераций и Codex auth.
 * Зачем нужно: изолирует IPC-команды системного уровня от остальных вкладок settings.
 */
export const SystemSettingsPage = memo(function SystemSettingsPage({
  agentLanguage,
  maxToolIterations,
  codexAuthenticated
}: {
  agentLanguage: AgentLanguage;
  maxToolIterations: number;
  codexAuthenticated: boolean;
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
          onChange={(event) =>
            vscode.postMessage({ type: 'setAgentLanguage', language: event.target.value as AgentLanguage })
          }
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
            vscode.postMessage({
              type: 'setMaxToolIterations',
              maxToolIterations: clampNumber(event.target.value, 0, Number.MAX_SAFE_INTEGER, 0, true)
            })
          }
        />
      </Card>
      <Card
        title={t('settings.system.codexTitle')}
        description={
          codexAuthenticated
            ? t('settings.system.codexDescriptionAuthorized')
            : t('settings.system.codexDescriptionUnauthorized')
        }
      >
        {codexAuthenticated ? (
          <div className={styles.actions}>
            <Badge tone="success" icon={<CheckCircle2 size={12} />}>
              {t('common.authorized')}
            </Badge>
            <Button
              variant="secondary"
              leadingIcon={<LogOut size={14} />}
              onClick={() => vscode.postMessage({ type: 'codexLogout' })}
            >
              {t('settings.system.logout')}
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            leadingIcon={<LogIn size={14} />}
            onClick={() => vscode.postMessage({ type: 'codexLogin' })}
          >
            {t('common.authorize')}
          </Button>
        )}
      </Card>
    </div>
  );
});
