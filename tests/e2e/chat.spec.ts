import { expect, findFrameByText, runCommand, test } from './fixtures';

test('opens the aist chat webview in VS Code', async ({ workbench }) => {
  await runCommand(workbench, 'aist: Open Chat');

  const webview = await findFrameByText(workbench, 'Ready to work with your codebase');
  const prompt = webview.getByPlaceholder('Ask the agent to inspect, create, edit, or delete workspace files...');
  const send = webview.getByRole('button', { name: 'Send' });

  await expect(prompt).toBeVisible();
  await expect(send).toBeDisabled();

  await prompt.fill('List the files in this workspace without changing anything.');

  await expect(send).toBeEnabled();
});
