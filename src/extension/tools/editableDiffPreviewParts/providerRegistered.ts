/**
 * Что это: состояние регистрации provider для editable diff preview.
 * Зачем нужно: VS Code content provider должен регистрироваться один раз за процесс extension.
 * Какую проблему решает: после декомпозиции файлы разделяют один mutable state без присваивания imported binding.
 */
export const providerRegistrationState = {
  registered: false
};
