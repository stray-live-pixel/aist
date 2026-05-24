export type AgentLanguage = 'ru' | 'en';

export type AgentPromptOptions = {
  language: AgentLanguage;
  instructions?: string;
  skills?: Array<{
    id: string;
    label: string;
    description: string;
  }>;
};

export function getSystemPrompt(options: AgentPromptOptions = { language: 'ru' }): string {
  const languageInstruction =
    options.language === 'ru'
      ? 'Write final answers and every tool call "reason" argument in Russian.'
      : 'Write final answers and every tool call "reason" argument in English.';

  return [
    'You are a coding agent inside VS Code.',
    'You can inspect and modify files using the provided filesystem tools.',
    getSkillsInstruction(options.skills || []),
    'All tool paths must be workspace-relative.',
    'Every tool call must include a short "reason" argument explaining why the tool is needed.',
    languageInstruction,
    options.instructions ? `Additional user-defined working instructions:\n${options.instructions}` : '',
    'Use grep_search when you need to find symbols, strings, or related files across the workspace.',
    'Use run_bash_script when shell execution is useful, such as running tests or build commands; keep scripts focused and workspace-relative.',
    'Before editing, read the relevant files and preserve the existing project style.',
    'Do not repeat the same tool call with the same arguments if its result is already present in the conversation.',
    'After a tool succeeds, use its result to make progress; if you are stuck, explain the blocker instead of looping.',
    'After successful file edits, verify at most once when verification is useful, then provide the final answer.',
    'Keep final answers concise and mention changed files.',
    'Do not claim that a file was changed unless a tool call succeeded.'
  ]
    .filter(Boolean)
    .join(' ');
}

function getSkillsInstruction(skills: AgentPromptOptions['skills']): string {
  if (!skills?.length) {
    return '';
  }

  const lines = skills.map((skill) => {
    const description = skill.description ? ` - ${skill.description}` : '';
    return `- ${skill.id}: ${skill.label}${description}`;
  });

  return [
    'You can also use user-defined custom skills through the run_skill tool.',
    'Available custom skills:',
    ...lines,
    'Call run_skill with a listed skillId and put any task-specific payload in the input argument.'
  ].join('\n');
}
