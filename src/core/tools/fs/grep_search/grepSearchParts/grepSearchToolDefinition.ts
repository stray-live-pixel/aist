import { type OpenRouterTool } from '../../../../shared/types/types';

export const grepSearchToolDefinition: OpenRouterTool = {
  type: 'function',
  function: {
    name: 'grep_search',
    description:
      'Search workspace files for text or a regular expression and return matching file paths with line numbers.',
    parameters: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'A short explanation of why this tool call is needed.' },
        nextStep: {
          type: 'string',
          description: 'A short explanation of how this result will be used and what will be done next.'
        },
        query: { type: 'string', description: 'Text or regular expression to search for.' },
        path: { type: 'string', description: 'Workspace-relative file or directory path to search. Default is ".".' },
        include: { type: 'string', description: 'Glob pattern within the search path. Default is "**/*".' },
        regex: { type: 'boolean', description: 'Treat query as a JavaScript regular expression. Default is false.' },
        caseSensitive: { type: 'boolean', description: 'Use case-sensitive matching. Default is false.' },
        contextLines: {
          type: 'number',
          description: 'Number of lines before and after each match. Default is 0, maximum is 5.'
        },
        beforeLines: {
          type: 'number',
          description: 'Number of lines before each match. Defaults to contextLines, maximum is 5.'
        },
        afterLines: {
          type: 'number',
          description: 'Number of lines after each match. Defaults to contextLines, maximum is 5.'
        },
        filesOnly: {
          type: 'boolean',
          description: 'Return only unique matching file paths without line text. Default is false.'
        },
        countOnly: {
          type: 'boolean',
          description: 'Return matching file paths with match counts, without line text. Default is false.'
        },
        exclude: {
          type: 'string',
          description: 'Additional glob pattern to exclude from search, combined with the standard ignored directories.'
        },
        maxResults: {
          type: 'number',
          description: 'Maximum number of matches to return, or paths in compact modes. Default is 100.'
        },
        maxFiles: { type: 'number', description: 'Maximum number of files to inspect. Default is 2000.' }
      },
      required: ['reason', 'nextStep', 'query'],
      additionalProperties: false
    }
  }
};
