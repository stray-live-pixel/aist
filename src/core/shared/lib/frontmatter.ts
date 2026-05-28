export type FrontmatterValue = string | number | boolean | null | FrontmatterObject | FrontmatterValue[];

export type FrontmatterObject = {
  [key: string]: FrontmatterValue;
};

export type ParsedMarkdownFrontmatter = {
  attributes: FrontmatterObject;
  body: string;
};

type ParsedBlock = {
  lines: string[];
  bodyStartLine: number;
};

/**
 * Разбирает Markdown с YAML-like frontmatter subset, который реально используется
 * legacy `prompt/`. Полный YAML намеренно не подключаем: зависимость увеличила бы
 * surface area, а старые definitions используют только scalar, multiline block и
 * простые списки объектов.
 */
export function parseMarkdownFrontmatter(markdown: string): ParsedMarkdownFrontmatter {
  const block = splitFrontmatter(markdown);
  if (!block) {
    return { attributes: {}, body: markdown };
  }

  return {
    attributes: parseFrontmatterLines(block.lines),
    body: markdown.split(/\r?\n/).slice(block.bodyStartLine).join('\n')
  };
}

function splitFrontmatter(markdown: string): ParsedBlock | undefined {
  const lines = markdown.split(/\r?\n/);
  if (lines[0]?.trim() !== '---') {
    return undefined;
  }

  const endIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (endIndex < 0) {
    throw new Error('Frontmatter block is not closed.');
  }

  return { lines: lines.slice(1, endIndex), bodyStartLine: endIndex + 1 };
}

function parseFrontmatterLines(lines: string[]): FrontmatterObject {
  const result: FrontmatterObject = {};

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (isIgnorableLine(line)) {
      continue;
    }

    const keyValue = parseKeyValue(line.trim());
    if (!keyValue) {
      throw new Error(`Invalid frontmatter line: ${line}`);
    }

    if (keyValue.rawValue === '|') {
      const multiline = collectIndentedBlock(lines, lineIndex + 1, 2);
      result[keyValue.key] = normalizeMultiline(multiline.lines);
      lineIndex = multiline.endIndex;
      continue;
    }

    if (keyValue.rawValue === '') {
      const list = collectList(lines, lineIndex + 1, 2);
      result[keyValue.key] = list.items;
      lineIndex = list.endIndex;
      continue;
    }

    result[keyValue.key] = parseScalar(keyValue.rawValue);
  }

  return result;
}

function collectList(
  lines: string[],
  startIndex: number,
  indent: number
): { items: FrontmatterValue[]; endIndex: number } {
  const items: FrontmatterValue[] = [];
  let lineIndex = startIndex;

  while (lineIndex < lines.length) {
    const line = lines[lineIndex];
    if (isIgnorableLine(line)) {
      lineIndex += 1;
      continue;
    }

    if (countIndent(line) < indent || !line.slice(indent).startsWith('-')) {
      break;
    }

    const itemText = line.slice(indent + 1).trim();
    if (!itemText.includes(':')) {
      items.push(parseScalar(itemText));
      lineIndex += 1;
      continue;
    }

    const objectItem: FrontmatterObject = {};
    const first = parseKeyValue(itemText);
    if (!first) {
      throw new Error(`Invalid list object item: ${line}`);
    }
    objectItem[first.key] = first.rawValue === '|' ? '' : parseScalar(first.rawValue);
    lineIndex += 1;

    while (lineIndex < lines.length) {
      const nestedLine = lines[lineIndex];
      if (isIgnorableLine(nestedLine)) {
        lineIndex += 1;
        continue;
      }

      const nestedIndent = countIndent(nestedLine);
      if (nestedIndent <= indent) {
        break;
      }

      const nestedKeyValue = parseKeyValue(nestedLine.trim());
      if (!nestedKeyValue) {
        break;
      }

      if (nestedKeyValue.rawValue === '|') {
        const multiline = collectIndentedBlock(lines, lineIndex + 1, nestedIndent + 2);
        objectItem[nestedKeyValue.key] = normalizeMultiline(multiline.lines);
        lineIndex = multiline.endIndex + 1;
      } else {
        objectItem[nestedKeyValue.key] = parseScalar(nestedKeyValue.rawValue);
        lineIndex += 1;
      }
    }

    items.push(objectItem);
  }

  return { items, endIndex: lineIndex - 1 };
}

function collectIndentedBlock(
  lines: string[],
  startIndex: number,
  indent: number
): { lines: string[]; endIndex: number } {
  const blockLines: string[] = [];
  let lineIndex = startIndex;

  while (lineIndex < lines.length) {
    const line = lines[lineIndex];
    if (line.trim() !== '' && countIndent(line) < indent) {
      break;
    }
    blockLines.push(line.slice(Math.min(indent, countIndent(line))));
    lineIndex += 1;
  }

  return { lines: blockLines, endIndex: lineIndex - 1 };
}

function parseKeyValue(line: string): { key: string; rawValue: string } | undefined {
  const separatorIndex = line.indexOf(':');
  if (separatorIndex < 0) {
    return undefined;
  }

  return {
    key: line.slice(0, separatorIndex).trim(),
    rawValue: line.slice(separatorIndex + 1).trim()
  };
}

function parseScalar(rawValue: string): FrontmatterValue {
  if (rawValue === 'true') {
    return true;
  }
  if (rawValue === 'false') {
    return false;
  }
  if (rawValue === 'null') {
    return null;
  }
  if (/^-?\d+$/.test(rawValue)) {
    return Number(rawValue);
  }
  if ((rawValue.startsWith('"') && rawValue.endsWith('"')) || (rawValue.startsWith("'") && rawValue.endsWith("'"))) {
    return rawValue.slice(1, -1);
  }

  return rawValue;
}

function normalizeMultiline(lines: string[]): string {
  return lines.join('\n').replace(/\n+$/, '');
}

function isIgnorableLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === '' || trimmed.startsWith('#');
}

function countIndent(line: string): number {
  return line.match(/^ */)?.[0].length ?? 0;
}
