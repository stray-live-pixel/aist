import { upsertPromptItem } from './upsertPromptItem';

export async function setProjectInstructions(instructions: string): Promise<void> {
  await upsertPromptItem({
    scope: 'local',
    kind: 'instruction',
    id: 'project-instructions',
    label: 'Project instructions',
    content: instructions
  });
}
