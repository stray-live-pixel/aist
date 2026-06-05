import { type ChatMessage } from '../../../../types';
import { type ToolDisplayModel } from '../types';
import { Translator } from './Translator';
import { getAllFileReferences } from './getAllFileReferences';
import { getPrimaryFileReference } from './getPrimaryFileReference';
import { getShortSummary } from './getShortSummary';
import { getToolMeta } from './getToolMeta';
import { getToolTarget } from './getToolTarget';
import { uniqueFiles } from './uniqueFiles';

export function buildToolDisplayModel(message: ChatMessage, t: Translator): ToolDisplayModel {
  const meta = getToolMeta(message.name, t);
  const primaryFile = getPrimaryFileReference(message);
  const files = uniqueFiles(getAllFileReferences(message, primaryFile));
  const target = primaryFile?.path || getToolTarget(message, t) || '';

  return {
    action: meta.action,
    tone: meta.tone,
    primaryFile,
    files,
    title: target ? `${meta.action}: ${target}` : meta.action,
    summary: getShortSummary(message, t)
  };
}
