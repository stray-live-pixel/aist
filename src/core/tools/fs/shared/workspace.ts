/**
 * Проверенный workspace проекта.
 *
 * rootPath всегда является realpath директории, поэтому дальнейшие проверки
 * symlink-выходов сравнивают пути с уже нормализованным корнем проекта.
 */
export type Workspace = {
  rootPath: string;
};
