/**
 * Что это: пустое состояние истории сообщений.
 * Зачем нужно: объясняет пользователю, что агент готов работать.
 * Пример использования: <EmptyState />.
 */
import { Sparkles } from 'lucide-react';

import { useI18n } from '../../shared/i18n';
import { getWebviewAssetUri } from '../../shared/lib/assets';
import { AistBrand } from '../../shared/ui/AistLogo';

export function EmptyState() {
  const { t } = useI18n();
  const hasLogo = Boolean(getWebviewAssetUri('logo'));

  return (
    <div className="grid gap-4 py-5">
      {hasLogo ? <AistBrand /> : <Sparkles className="mx-auto" size={100} />}
      <div className="grid gap-1 text-center">
        <h1 className="text-base font-semibold">{t('empty.title')}</h1>
        <p className="text-sm text-[var(--vscode-descriptionForeground)]">{t('empty.description')}</p>
      </div>
    </div>
  );
}
