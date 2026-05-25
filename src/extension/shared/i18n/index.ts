import { getAgentLanguage } from '../../agent/config/settings';
import en from './en.json';
import ru from './ru.json';

export type ExtensionTranslationKey = keyof typeof en;
type Dictionary = Record<ExtensionTranslationKey, string>;
type TranslationValues = Record<string, string | number>;

const dictionaries = {
  en,
  ru: ru as Dictionary
};

export function t(key: ExtensionTranslationKey, values?: TranslationValues): string {
  const language = getAgentLanguage();
  const dictionary = dictionaries[language === 'en' ? 'en' : 'ru'];
  const template = dictionary[key] ?? dictionaries.en[key] ?? key;
  return interpolate(template, values);
}

function interpolate(template: string, values?: TranslationValues): string {
  if (!values) {
    return template;
  }

  return template.replace(/{{(\w+)}}/g, (match, name) => {
    const value = values[name];
    if (name === 'reason') {
      const reason = String(value || '').trim();
      return reason ? `: ${reason}` : '.';
    }
    return String(value ?? match);
  });
}
