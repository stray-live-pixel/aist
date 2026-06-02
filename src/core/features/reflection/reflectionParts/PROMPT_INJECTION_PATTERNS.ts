export const PROMPT_INJECTION_PATTERNS = [
  /\b(ignore|disregard|override)\s+(all\s+)?(previous|prior|system|developer|tool)\s+(instructions|messages|rules)\b/i,
  /\b(system|developer)\s+prompt\b/i,
  /\breveal\s+(the\s+)?(hidden\s+)?(prompt|instructions|secrets?)\b/i,
  /\byou\s+are\s+now\b/i
];
