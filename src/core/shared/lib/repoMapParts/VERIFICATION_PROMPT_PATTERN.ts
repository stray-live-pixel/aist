export const VERIFICATION_PROMPT_PATTERN = new RegExp(
  [
    '\\b(add|build|change|compile|edit|error|failing|feature|fix|implement|issue|lint|modify|optimi[sz]e|refactor|task|test|update|verify)\\b',
    '\\u0434\\u043e\\u0431\\u0430\\u0432',
    '\\u0437\\u0430\\u0434\\u0430\\u0447',
    '\\u0438\\u0437\\u043c\\u0435\\u043d\\u0438',
    '\\u0438\\u0441\\u043f\\u0440\\u0430\\u0432',
    '\\u043e\\u0448\\u0438\\u0431',
    '\\u043e\\u043f\\u0442\\u0438\\u043c\\u0438\\u0437\\u0430\\u0446',
    '\\u043f\\u0440\\u043e\\u0432\\u0435\\u0440',
    '\\u0440\\u0435\\u0430\\u043b\\u0438\\u0437',
    '\\u0441\\u0431\\u043e\\u0440',
    '\\u0442\\u0435\\u0441\\u0442'
  ].join('|'),
  'i'
);
