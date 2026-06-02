export function createTextPreview(value: string, maxChars: number): { text: string; omittedChars: number } {
  if (value.length <= maxChars) {
    return { text: value, omittedChars: 0 };
  }

  const headChars = Math.floor(maxChars * 0.7);
  const tailChars = maxChars - headChars;
  const omittedChars = value.length - maxChars;
  return {
    text: `${value.slice(0, headChars).trimEnd()}\n\n[... ${omittedChars} chars omitted from model history ...]\n\n${value
      .slice(value.length - tailChars)
      .trimStart()}`,
    omittedChars
  };
}
