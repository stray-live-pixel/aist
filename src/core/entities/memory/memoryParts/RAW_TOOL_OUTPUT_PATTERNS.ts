export const RAW_TOOL_OUTPUT_PATTERNS = [
  /\btool_call_id\b/i,
  /\b(stdout|stderr|exitCode|durationMs|timedOut)\b\s*[:=]/i,
  /\bBEGIN[_ -]?(TOOL|COMMAND)[_ -]?OUTPUT\b/i,
  /\braw\s+(tool|command)\s+output\b/i
];
