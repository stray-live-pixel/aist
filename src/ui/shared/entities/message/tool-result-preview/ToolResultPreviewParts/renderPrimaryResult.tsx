import { type ChatMessage } from '../../../../types';
import { asString } from '../../tool-value';
import { BashScriptResult } from './BashScriptResult';
import { CodePreview } from './CodePreview';
import { CompactFacts } from './CompactFacts';
import { DeniedResult } from './DeniedResult';
import { EntriesList } from './EntriesList';
import { ErrorText } from './ErrorText';
import { MemoryNotesPreview } from './MemoryNotesPreview';
import { PlanChangePreview } from './PlanChangePreview';
import { PlanStatusPreview } from './PlanStatusPreview';
import { SearchFiles } from './SearchFiles';

export function renderPrimaryResult(
  message: ChatMessage,
  result?: Record<string, unknown>,
  preview?: Record<string, unknown>
) {
  if (message.name === 'run_bash_script') return <BashScriptResult message={message} result={result} />;
  if (message.name === 'get_relevant_memory') return <MemoryNotesPreview result={result} />;
  if (result?.decision === 'denied') return <DeniedResult result={result} />;
  if (message.name === 'create_plan' || message.name === 'update_plan') return <PlanChangePreview message={message} />;
  if (message.name === 'set_plan_item_status') return <PlanStatusPreview message={message} result={result} />;
  if (!result && preview) return <CompactFacts result={preview} />;
  if (!result) return null;
  if (asString(result.error)) return <ErrorText text={asString(result.error) || ''} />;

  if (message.name === 'read_file' || message.name === 'read_file_range') return <CodePreview result={result} />;
  if (message.name === 'list_files') return <EntriesList result={result} />;
  if (message.name === 'grep_search') return <SearchFiles result={result} />;

  return <CompactFacts result={result} />;
}
