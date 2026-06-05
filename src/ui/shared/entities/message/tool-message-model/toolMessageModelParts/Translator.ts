import { type useI18n } from '../../../../shared/i18n';

export type Translator = ReturnType<typeof useI18n>['t'];
