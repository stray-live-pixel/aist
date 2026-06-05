import { type ReactNode, createContext, useContext } from 'react';

import type { AgentLanguage } from '../types';
import en from './en.json';
import ru from './ru.json';

export type TranslationKey = keyof typeof en;
type Dictionary = Record<TranslationKey, string>;
type TranslationValues = Record<string, string | number>;

const dictionaries: Record<AgentLanguage, Dictionary> = {
  en,
  ru: ru as Dictionary
};

const LocaleContext = createContext<AgentLanguage>('ru');

export function I18nProvider({ language, children }: { language: AgentLanguage; children: ReactNode }) {
  return <LocaleContext.Provider value={language === 'en' ? 'en' : 'ru'}>{children}</LocaleContext.Provider>;
}

export function useLanguage(): AgentLanguage {
  return useContext(LocaleContext);
}

export function useI18n() {
  const language = useLanguage();
  return {
    language,
    t: (key: TranslationKey, values?: TranslationValues) => translate(language, key, values)
  };
}

export function translate(language: AgentLanguage, key: TranslationKey, values?: TranslationValues): string {
  const dictionary = dictionaries[language === 'en' ? 'en' : 'ru'];
  const template = dictionary[key] ?? dictionaries.en[key] ?? key;
  return interpolate(template, values);
}

export function pluralKey(language: AgentLanguage, baseKey: string, count: number): TranslationKey {
  const suffix = language === 'en' && count === 1 ? 'one' : count === 1 ? 'one' : 'other';
  return `${baseKey}_${suffix}` as TranslationKey;
}

function interpolate(template: string, values?: TranslationValues): string {
  if (!values) {
    return template;
  }

  return template.replace(/{{(\w+)}}/g, (match, name) => String(values[name] ?? match));
}
