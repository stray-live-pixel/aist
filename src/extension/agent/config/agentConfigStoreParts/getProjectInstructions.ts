import { getPromptConfig } from './getPromptConfig';

export function getProjectInstructions(): string {
  return getPromptConfig()
    .localInstructions.map((item) => item.content)
    .join('\n\n');
}
