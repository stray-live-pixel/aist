/**
 * Одно совпадение, которое grep_search возвращает модели.
 *
 * В обычном режиме это строка, колонка и текст. В compact-режимах тот же тип
 * используется для списка файлов или количества совпадений по каждому файлу.
 */
export type SearchMatch = {
  path: string;
  line?: number;
  column?: number;
  text?: string;
  count?: number;
  before?: string[];
  after?: string[];
};
