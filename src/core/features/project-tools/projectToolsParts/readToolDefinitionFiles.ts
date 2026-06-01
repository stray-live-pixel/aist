import fs from 'node:fs/promises';

export async function readToolDefinitionFiles(toolsRoot: string): Promise<string[]> {
  const entries = await fs.readdir(toolsRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort();
}
