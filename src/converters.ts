export function markdownToJira(markdown: string): string {
  const lines = normalizeLines(markdown).split('\n');
  const output: string[] = [];
  let inCode = false;
  let codeLanguage = '';
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fence = line.match(/^```\s*([^`]*)\s*$/);

    if (fence) {
      if (inCode) {
        output.push(`{code${codeLanguage ? `:language=${codeLanguage}` : ''}}`);
        output.push(...codeLines);
        output.push('{code}');
        inCode = false;
        codeLanguage = '';
        codeLines = [];
      } else {
        inCode = true;
        codeLanguage = fence[1]?.trim() ?? '';
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (isTableStart(lines, i)) {
      const table = collectTable(lines, i);
      output.push(...jiraTable(table.rows));
      i = table.endIndex;
      continue;
    }

    output.push(jiraLine(line));
  }

  if (inCode) {
    output.push(`{code${codeLanguage ? `:language=${codeLanguage}` : ''}}`);
    output.push(...codeLines);
    output.push('{code}');
  }

  return trimTrailingBlankLines(output).join('\n');
}

export function markdownToConfluenceHtml(markdown: string): string {
  const lines = normalizeLines(markdown).split('\n');
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let inCode = false;
  let codeLanguage = '';
  let codeLines: string[] = [];

  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      blocks.push(`<p>${paragraph.map(confluenceInline).join('<br />')}</p>`);
      paragraph = [];
    }
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fence = line.match(/^```\s*([^`]*)\s*$/);

    if (fence) {
      flushParagraph();
      if (inCode) {
        blocks.push(confluenceCodeBlock(codeLines.join('\n'), codeLanguage));
        inCode = false;
        codeLanguage = '';
        codeLines = [];
      } else {
        inCode = true;
        codeLanguage = fence[1]?.trim() ?? '';
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (isTableStart(lines, i)) {
      flushParagraph();
      const table = collectTable(lines, i);
      blocks.push(confluenceTable(table.rows));
      i = table.endIndex;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      blocks.push(`<h${level}>${confluenceInline(heading[2])}</h${level}>`);
      continue;
    }

    const list = line.match(/^(\s*)([-*+] |\d+\.\s+)(.+)$/);
    if (list) {
      flushParagraph();
      const renderedList = collectConfluenceList(lines, i);
      blocks.push(renderedList.html);
      i = renderedList.endIndex;
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      blocks.push(`<blockquote><p>${confluenceInline(quote[1])}</p></blockquote>`);
      continue;
    }

    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushParagraph();
      blocks.push('<hr />');
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();

  if (inCode) {
    blocks.push(confluenceCodeBlock(codeLines.join('\n'), codeLanguage));
  }

  return blocks.join('\n');
}

function normalizeLines(input: string): string {
  const normalized = input.replace(/\r\n?/g, '\n').trimEnd();
  const lines = normalized.split('\n');

  if (lines[0]?.trim() === '---') {
    const closingIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
    if (closingIndex > 0) {
      return lines.slice(closingIndex + 1).join('\n').replace(/^\n+/, '').trimEnd();
    }
  }

  return normalized;
}

function jiraLine(line: string): string {
  if (line.trim() === '') {
    return '';
  }

  const heading = line.match(/^(#{1,6})\s+(.+)$/);
  if (heading) {
    return `h${heading[1].length}. ${jiraInline(heading[2])}`;
  }

  const list = line.match(/^(\s*)([-*+] |\d+\.\s+)(.+)$/);
  if (list) {
    const level = Math.floor(list[1].replace(/\t/g, '  ').length / 2) + 1;
    const marker = /\d+\.\s+/.test(list[2]) ? '#' : '*';
    return `${marker.repeat(level)} ${jiraInline(formatTaskText(list[3]))}`;
  }

  const quote = line.match(/^>\s?(.*)$/);
  if (quote) {
    return `bq. ${jiraInline(quote[1])}`;
  }

  if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
    return '----';
  }

  return jiraInline(line);
}

function jiraInline(input: string): string {
  const placeholders: string[] = [];
  const save = (value: string): string => {
    const token = `\u0000${placeholders.length}\u0000`;
    placeholders.push(value);
    return token;
  };

  let text = input.replace(/(?<!!)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target: string, alias: string | undefined) => save((alias ?? target).trim()));
  text = text.replace(/`([^`]+)`/g, (_match, code: string) => save(`{{${code}}}`));
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt: string, url: string) => save(`!${url.trim()}|alt=${alt.trim()}!`));
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, url: string) => save(`[${label}|${url.trim()}]`));
  text = text.replace(/~~([^~]+)~~/g, (_match, value: string) => save(`-${value}-`));
  text = text.replace(/\*\*([^*]+)\*\*/g, (_match, value: string) => save(`*${value}*`));
  text = text.replace(/__([^_]+)__/g, (_match, value: string) => save(`*${value}*`));
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '_$1_');
  text = text.replace(/(?<!_)_([^_]+)_(?!_)/g, '_$1_');

  return placeholders.reduce((value, replacement, index) => value.replaceAll(`\u0000${index}\u0000`, replacement), text);
}

function confluenceInline(input: string): string {
  const placeholders: string[] = [];
  const save = (value: string): string => {
    const token = `\u0000${placeholders.length}\u0000`;
    placeholders.push(value);
    return token;
  };

  let text = input.replace(/(?<!!)\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target: string, alias: string | undefined) => save(escapeHtml((alias ?? target).trim())));
  text = escapeHtml(text);
  text = text.replace(/`([^`]+)`/g, (_match, code: string) => save(`<code>${code}</code>`));
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt: string, url: string) => save(`<img src="${escapeAttribute(url.trim())}" alt="${escapeAttribute(alt.trim())}" />`));
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, url: string) => save(`<a href="${escapeAttribute(url.trim())}">${label}</a>`));
  text = text.replace(/~~([^~]+)~~/g, (_match, value: string) => save(`<del>${value}</del>`));
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  text = text.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  text = text.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');

  return placeholders.reduce((value, replacement, index) => value.replaceAll(`\u0000${index}\u0000`, replacement), text);
}

function escapeHtml(input: string): string {
  return input
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function escapeAttribute(input: string): string {
  return escapeHtml(input).replaceAll("'", '&#39;');
}

function confluenceCodeBlock(code: string, language: string): string {
  const languageAttribute = language ? ` data-language="${escapeAttribute(language)}"` : '';
  return `<pre><code${languageAttribute}>${escapeHtml(code)}</code></pre>`;
}

function isTableStart(lines: string[], index: number): boolean {
  return index + 1 < lines.length && /^\s*\|?.+\|.+\|?\s*$/.test(lines[index]) && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1]);
}

function collectTable(lines: string[], startIndex: number): { rows: string[][]; endIndex: number } {
  const rows: string[][] = [];
  let i = startIndex;
  while (i < lines.length && /^\s*\|?.+\|.+\|?\s*$/.test(lines[i])) {
    if (i !== startIndex + 1) {
      rows.push(splitTableRow(lines[i]));
    }
    i += 1;
  }
  return { rows, endIndex: i - 1 };
}

function splitTableRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

function jiraTable(rows: string[][]): string[] {
  return rows.map((row, index) => {
    const delimiter = index === 0 ? '||' : '|';
    return `${delimiter}${row.map(jiraInline).join(delimiter)}${delimiter}`;
  });
}

function confluenceTable(rows: string[][]): string {
  const renderedRows = rows.map((row, index) => {
    const cellTag = index === 0 ? 'th' : 'td';
    const cells = row.map((cell) => `<${cellTag}>${confluenceInline(cell)}</${cellTag}>`).join('');
    return `<tr>${cells}</tr>`;
  });
  return `<table><tbody>${renderedRows.join('')}</tbody></table>`;
}

interface ConfluenceListNode {
  tag: 'ul' | 'ol';
  content: string;
  children: ConfluenceListNode[];
}

function collectConfluenceList(lines: string[], startIndex: number): { html: string; endIndex: number } {
  const roots: ConfluenceListNode[] = [];
  const stack: Array<{ level: number; node: ConfluenceListNode }> = [];
  let index = startIndex;

  while (index < lines.length) {
    const match = lines[index].match(/^(\s*)([-*+] |\d+\.\s+)(.+)$/);
    if (!match) {
      break;
    }

    const level = Math.floor(match[1].replace(/\t/g, '  ').length / 2) + 1;
    const node: ConfluenceListNode = {
      tag: /\d+\.\s+/.test(match[2]) ? 'ol' : 'ul',
      content: formatTaskText(match[3]),
      children: [],
    };

    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    const parent = stack[stack.length - 1]?.node;
    (parent ? parent.children : roots).push(node);
    stack.push({ level, node });
    index += 1;
  }

  return { html: renderConfluenceListNodes(roots), endIndex: index - 1 };
}

function renderConfluenceListNodes(nodes: ConfluenceListNode[]): string {
  let html = '';
  let index = 0;

  while (index < nodes.length) {
    const tag = nodes[index].tag;
    html += `<${tag}>`;
    while (index < nodes.length && nodes[index].tag === tag) {
      const node = nodes[index];
      html += `<li>${confluenceInline(node.content)}${renderConfluenceListNodes(node.children)}</li>`;
      index += 1;
    }
    html += `</${tag}>`;
  }

  return html;
}

function formatTaskText(input: string): string {
  return input.replace(/^\[([ xX])\]\s+/, (_match, state: string) => (state === ' ' ? '☐ ' : '☑ '));
}

function trimTrailingBlankLines(lines: string[]): string[] {
  const result = [...lines];
  while (result.length > 0 && result[result.length - 1] === '') {
    result.pop();
  }
  return result;
}
