import { Gauge, HelpCircle, MessageSquareText, Route, Settings2, TimerReset } from 'lucide-react';
import { useMemo, useState } from 'react';

import { getActiveModelProvider } from '../../../../features/select-model';
import { useI18n } from '../../../../shared/i18n';
import type { AgentState } from '../../../../shared/types';
import { Button, Card, InfoTile, Text, Tooltip } from '../../../../shared/ui';
import styles from '../../PermissionsPage.module.scss';
import type { SettingsPageId } from '../types';
import { OverviewInfoModal } from './OverviewInfoModal';
import { formatCompactNumber } from './formatCompactNumber';
import { getEditorContextModeDescription } from './getEditorContextModeDescription';
import { getEditorContextModeLabel } from './getEditorContextModeLabel';
import { getReasoningEffortDescription } from './getReasoningEffortDescription';
import { getReasoningEffortLabel } from './getReasoningEffortLabel';

/**
 * Что это: карточка настроек запроса, с которыми агент ответит прямо сейчас.
 * Зачем нужно: модель, контекст редактора и лимиты влияют на качество и скорость, поэтому их важно видеть рядом.
 * Какую продуктовую проблему решает: пользователь понимает не только «какая модель», но и как AIST подготовит следующий запрос.
 */
export function RequestSettingsOverviewCard({
  state,
  onNavigate
}: {
  state: AgentState;
  onNavigate(page: SettingsPageId): void;
}) {
  const { t } = useI18n();
  const [helpOpen, setHelpOpen] = useState(false);
  const settings = state.activeChat.modelSettings;
  const activeModel = useMemo(
    () => state.models.find((model) => model.id === settings.model),
    [settings.model, state.models]
  );
  const provider =
    activeModel?.provider || getActiveModelProvider(settings.model, state.models, state.providerProfiles);
  const providerProfile = state.providerProfiles.find((profile) => profile.provider === provider);
  const modelName = activeModel?.name || settings.model;
  const maxIterations = settings.maxToolIterations || state.maxToolIterations;
  const providerName = providerProfile?.name || getProviderLabel({ provider, t });
  const contextDescription = activeModel?.contextLength
    ? t('settings.overview.request.contextKnown', { count: formatCompactNumber({ value: activeModel.contextLength }) })
    : t('settings.overview.request.contextUnknown');

  return (
    <Card
      className={styles.compactOverviewCard}
      title={t('settings.overview.request.title')}
      description={t('settings.overview.request.description')}
      actions={
        <div className={styles.overviewHeaderActions}>
          <Button variant="ghost" size="sm" leadingIcon={<HelpCircle size={14} />} onClick={() => setHelpOpen(true)}>
            {t('settings.overview.action.explain')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leadingIcon={<Settings2 size={14} />}
            onClick={() => onNavigate('providers')}
          >
            {t('settings.overview.action.providers')}
          </Button>
        </div>
      }
    >
      <div className={styles.overviewRequestLead}>
        <div className={styles.overviewRequestModelIcon}>
          <MessageSquareText size={17} />
        </div>
        <div className={styles.overviewRequestModelText}>
          <Text as="p" variant="bodyStrong">
            {t('settings.overview.request.route', { model: modelName, provider: providerName })}
          </Text>
          <Text as="p" variant="body">
            {contextDescription}
          </Text>
        </div>
      </div>

      <div className={styles.overviewTileGridCompact}>
        <InfoTile
          icon={<Gauge size={15} />}
          title={t('settings.overview.request.reasoningTitle')}
          value={getReasoningEffortLabel({ effort: settings.reasoningEffort, t })}
          description={getReasoningEffortDescription({ effort: settings.reasoningEffort, t })}
          tone={settings.reasoningEffort === 'auto' ? 'neutral' : 'accent'}
          actions={
            <Tooltip content={t('settings.overview.request.reasoningHint')}>
              <span className={styles.overviewInlineHint}>{t('settings.overview.action.whereChange')}</span>
            </Tooltip>
          }
        />
        <InfoTile
          icon={<Route size={15} />}
          title={t('settings.overview.request.editorContextTitle')}
          value={getEditorContextModeLabel({ mode: settings.editorContextMode, t })}
          description={getEditorContextModeDescription({ mode: settings.editorContextMode, t })}
          tone={settings.editorContextMode === 'off' ? 'warning' : 'success'}
        />
        <InfoTile
          icon={<TimerReset size={15} />}
          title={t('settings.overview.request.iterationTitle')}
          value={
            maxIterations
              ? t('settings.overview.request.iterationCount', { count: maxIterations })
              : t('settings.overview.request.iterationUnlimited')
          }
          description={t('settings.overview.request.iterationDescription')}
          tone={maxIterations ? 'neutral' : 'warning'}
          actions={
            <Button variant="ghost" size="sm" onClick={() => onNavigate('system')}>
              {t('settings.overview.action.limit')}
            </Button>
          }
        />
      </div>
      {helpOpen ? <OverviewInfoModal onClose={() => setHelpOpen(false)} /> : null}
    </Card>
  );
}

/**
 * Что это: человекочитаемое имя провайдера модели.
 * Зачем нужно: Overview объясняет маршрут запроса без показа внутренних id профилей.
 * Какую продуктовую проблему решает: пользователь понимает, куда отправится следующий запрос.
 */
function getProviderLabel({ provider, t }: { provider: string | undefined; t: ReturnType<typeof useI18n>['t'] }) {
  if (provider === 'codex') return 'ChatGPT Codex';
  if (provider === 'openrouter') return 'OpenRouter';

  return t('settings.overview.request.unknownProvider');
}
