/**
 * Что это: готовые тексты для git commit и pull request isolated branch.
 * Зачем нужно: commit и PR должны отражать смысл изменений, а не просто начало пользовательского prompt.
 * Какую продуктовую проблему решает: reviewer быстрее понимает результат работы isolated агента.
 */
export type IsolationGitMetadata = {
  /** Commit subject/body, который видит reviewer в истории isolated branch. */
  readonly commitMessage: string;
  /** Заголовок pull request, который должен объяснять итоговую ценность изменений. */
  readonly prTitle: string;
  /** Описание pull request с кратким контекстом и ссылкой на isolated session. */
  readonly prBody: string;
  /** Признак, что title/message были придуманы моделью, а не fallback-логикой. */
  readonly generatedByModel: boolean;
};
