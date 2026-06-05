import { HelpCircle } from 'lucide-react';
import { useState } from 'react';

import { useI18n } from '../../../../shared/i18n';
import { Button, Card } from '../../../../shared/ui';
import styles from '../../PermissionsPage.module.scss';
import { PromptHelpDialog } from './PromptHelpDialog';

export function PromptManagerIntro({
  titleKey,
  descriptionKey
}: {
  titleKey:
    | 'settings.promptManager.instructionsTitle'
    | 'settings.promptManager.rolesTitle'
    | 'settings.promptManager.presetsPageTitle';
  descriptionKey:
    | 'settings.promptManager.instructionsDescription'
    | 'settings.promptManager.rolesDescription'
    | 'settings.promptManager.presetsPageDescription';
}) {
  const { t } = useI18n();
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <Card
      title={t(titleKey)}
      description={t(descriptionKey)}
      actions={
        <Button size="sm" variant="ghost" leadingIcon={<HelpCircle size={14} />} onClick={() => setHelpOpen(true)}>
          {t('settings.promptManager.guide')}
        </Button>
      }
    >
      <div className={styles.reliabilityHint}>{t('settings.promptManager.autosaveHint')}</div>
      {helpOpen ? <PromptHelpDialog onClose={() => setHelpOpen(false)} /> : null}
    </Card>
  );
}
