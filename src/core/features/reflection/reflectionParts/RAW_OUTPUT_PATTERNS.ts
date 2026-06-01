export const RAW_OUTPUT_PATTERNS = [
  /\btool_call_id\b/i,
  /\b(stdout|stderr)\b\s*[:=]/i,
  /\bBEGIN[_ -]?(TOOL|COMMAND)[_ -]?OUTPUT\b/i,
  /\braw\s+(tool|command)\s+output\b/i
];
