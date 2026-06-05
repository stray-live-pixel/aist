import { useI18n } from '../../../../shared/i18n';
import { buildToolDisplayModel } from '../../tool-message-model';
import { getToolPreview, getToolResult } from '../../tool-value';
import styles from '../ToolResultPreview.module.scss';
import { type ToolResultPreviewProps } from '../types';
import { getSecondaryFiles } from '../utils';
import { FileLinks } from './FileLinks';
import { Reason } from './Reason';
import { renderPrimaryResult } from './renderPrimaryResult';

export function ToolResultPreview({ message }: ToolResultPreviewProps) {
  const { t } = useI18n();
  const model = buildToolDisplayModel(message, t);
  const result = getToolResult(message);
  const preview = getToolPreview(message);
  const secondaryFiles = getSecondaryFiles(model.files, model.primaryFile);

  return (
    <div className={styles.root}>
      {message.reason ? <Reason text={message.reason} /> : null}
      {secondaryFiles.length ? <FileLinks files={secondaryFiles.slice(0, 12)} /> : null}
      {renderPrimaryResult(message, result, preview)}
    </div>
  );
}
