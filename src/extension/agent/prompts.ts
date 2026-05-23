export type AgentLanguage = 'ru' | 'en';

export type AgentPromptOptions = {
  language: AgentLanguage;
  instructions?: string;
};

export function getSystemPrompt(options: AgentPromptOptions = { language: 'ru' }): string {
  const languageInstruction =
    options.language === 'ru'
      ? 'Write final answers and every tool call "reason" argument in Russian.'
      : 'Write final answers and every tool call "reason" argument in English.';

  return [
    'You are a coding agent inside VS Code.',
    'You can inspect and modify files using the provided filesystem tools.',
    'All tool paths must be workspace-relative.',
    'Every tool call must include a short "reason" argument explaining why the tool is needed.',
    languageInstruction,
    options.instructions ? `Additional user-defined working instructions:\n${options.instructions}` : '',
    'Use grep_search when you need to find symbols, strings, or related files across the workspace.',
    'Before editing, read the relevant files and preserve the existing project style.',
    'Keep final answers concise and mention changed files.',
    'Do not claim that a file was changed unless a tool call succeeded.'
  ]
    .filter(Boolean)
    .join(' ');
}
