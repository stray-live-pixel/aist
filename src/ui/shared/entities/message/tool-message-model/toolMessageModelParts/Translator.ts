import { type useI18n } from '../../../../i18n';

export type Translator = ReturnType<typeof useI18n>['t'];
