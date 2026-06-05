import type { FileReference } from '../tool-message-model/types';

/**
 * Что это: props компонента WorkspaceFileLink.
 * Зачем нужно: ссылка на файл workspace с опциональной позицией и меткой.
 */
export type WorkspaceFileLinkProps = {
  /** Ссылка на файл, включая путь, строку и опциональную метку. */
  file: FileReference;
};
