export type AgentLanguage = 'ru' | 'en';

export type AgentPromptOptions = {
  language: AgentLanguage;
  /** Когда false, Turbo tools просит модель не тратить токены на reason/nextStep у вызовов инструментов. */
  toolCallNotesRequired?: boolean;
  instructions?: string;
  skills?: Array<{
    id: string;
    label: string;
    description: string;
  }>;
};

/**
 * Собирает базовый system prompt как короткий контракт поведения агента.
 * Секции оставлены явными: модели лучше следуют named blocks, а тестам проще
 * проверять инварианты без привязки к длинному prose-тексту.
 */
export function getSystemPrompt(options: AgentPromptOptions = { language: 'ru' }): string {
  return [
    section('Identity', [
      'You are AIST, a coding agent inside VS Code.',
      'Inspect and change the current workspace only through the provided tools.'
    ]),
    section('Workflow', [
      'Inspect relevant files first, then plan, edit, verify when useful, and finish concisely.',
      'Before code changes, call create_plan with a short title and sequential one-sentence steps.',
      'Use update_plan only when the plan meaning changes; use set_plan_item_status for exactly one step at a time.',
      'After a tool succeeds, use its result to move forward; if blocked, explain the blocker.'
    ]),
    section('Tool rules', [
      'All tool paths must be workspace-relative.',
      ...getToolCallNotesRules({ required: options.toolCallNotesRequired !== false }),
      'Use grep_search for symbols, strings, or related files across the workspace.',
      'Prefer read_file for first-pass file context; use read_file_range only for known lines, large files, or clearly sufficient small fragments.',
      'Do not explore unfamiliar files by chaining read_file_range calls; switch to read_file, grep_search, or an outline/map.',
      'Use run_bash_script freely for project commands, tests, builds, diagnostics, and git-safe inspection; keep scripts focused and workspace-relative.',
      'For workspace mutations, prefer previewable file-edit tools; if shell is the better mutation path, say why standard edit tools are not suitable.',
      'Do not repeat an identical tool call when its result is already in the conversation.',
      'If replace_in_file returns code TEXT_NOT_FOUND, read a nearby range before retrying the replacement.',
      'Approval comments in tool results are high-priority user instructions for the current run; follow them before choosing the next step.'
    ]),
    section('Editing rules', [
      'Read relevant files before editing and preserve the existing style.',
      'Prefer small focused changes with write_file or replace_in_file when possible.',
      'Treat edits as approval-aware: mutating tools may require user confirmation, so keep changes reviewable.',
      'Do not invent tool results, file contents, builds, or tests; only claim what actually happened.',
      'After successful edits, verify at most once when verification is useful.'
    ]),
    section('Language', [
      getLanguageInstruction({
        language: options.language,
        toolCallNotesRequired: options.toolCallNotesRequired !== false
      }),
      'Keep final answers concise and mention changed files.'
    ]),
    getUserInstructionsSection(options.instructions),
    getSkillsInstruction(options.skills || [])
  ]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Форматирует секции одинаково, чтобы prompt был компактным и snapshot tests
 * ловили случайное превращение короткого контракта обратно в длинный абзац.
 */
function section(title: string, lines: string[]): string {
  return [`## ${title}`, ...lines.map((line) => `- ${line}`)].join('\n');
}

/**
 * Что это: выбирает правила заполнения служебных полей tool-call.
 * Зачем нужно: Turbo tools должен отключать не только required в schema, но и текстовое требование в system prompt.
 * Какую продуктовую проблему решает: даже старые чаты при следующем запросе перестают тратить токены на «Зачем» и «Дальше».
 */
function getToolCallNotesRules({ required }: { required: boolean }): string[] {
  if (!required) {
    return [
      'Turbo tools mode is active: do not include reason or nextStep in tool-call arguments unless the user explicitly asks for detailed tool tracing.',
      'Use the saved tokens for the actual task and continue from tool results without narrating why the tool was called.'
    ];
  }

  return [
    'Every tool call must include a concrete short reason in clear product language: why this exact tool is needed now.',
    'Every tool call must include a concise nextStep: how you will use the result and what you will do next.'
  ];
}

/**
 * Отдельная функция нужна, чтобы языковая политика была проверяемым инвариантом
 * для EN/RU prompt и не размазывалась по остальным секциям.
 */
export function getLanguageInstruction({
  language,
  toolCallNotesRequired = true
}: {
  language: AgentLanguage;
  toolCallNotesRequired?: boolean;
}): string {
  if (!toolCallNotesRequired) {
    return language === 'ru'
      ? 'Write final answers in Russian. Do not add reason or nextStep to tool-call arguments in Turbo tools mode.'
      : 'Write final answers in English. Do not add reason or nextStep to tool-call arguments in Turbo tools mode.';
  }

  return language === 'ru'
    ? 'Write final answers and every tool call "reason" and "nextStep" argument in Russian.'
    : 'Write final answers and every tool call "reason" and "nextStep" argument in English.';
}

/**
 * Пользовательские инструкции идут отдельной секцией после kernel-правил: так они
 * видимы модели, но не смешиваются с неизменяемым контрактом tool/edit workflow.
 */
function getUserInstructionsSection(instructions: string | undefined): string {
  return instructions?.trim() ? `## User instructions\n${instructions.trim()}` : '';
}

/**
 * Skills добавляются только при наличии зарегистрированных skills, иначе prompt
 * не упоминает run_skill и не провоцирует модель искать несуществующий инструмент.
 */
function getSkillsInstruction(skills: AgentPromptOptions['skills']): string {
  if (!skills?.length) {
    return '';
  }

  const lines = skills.map((skill) => {
    const description = skill.description ? ` - ${skill.description}` : '';
    return `- ${skill.id}: ${skill.label}${description}`;
  });

  return [
    '## Skills',
    'Use run_skill only for listed custom skills.',
    'Available custom skills:',
    ...lines,
    'Call run_skill with a listed skillId and put task-specific payload in input.'
  ].join('\n');
}
