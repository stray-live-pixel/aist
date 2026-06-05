import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import styles from '../../PermissionsPage.module.scss';

export function MarkdownPreview({ markdown, emptyText }: { markdown: string; emptyText: string }) {
  return (
    <div className={styles.markdownPreview}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown.trim() || emptyText}</ReactMarkdown>
    </div>
  );
}
