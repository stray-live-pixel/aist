export type GrepSearchOptions = {
  query: string;
  searchPath: string;
  include: string;
  caseSensitive: boolean;
  useRegex: boolean;
  beforeLines: number;
  afterLines: number;
  filesOnly: boolean;
  countOnly: boolean;
  excludePatterns: string[];
  maxResults: number;
  maxFiles: number;
};
