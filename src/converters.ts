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

export function markdownToConfluenceStorage(markdown: string): string {
  const lines = normalizeLines(markdown).split('\n');
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let inCode = false;
  let codeLanguage = '';
  let codeLines: string[] = [];
  let listStack: Array<'ul' | 'ol'> = [];

  const flushParagraph = (): void => {
    if (paragraph.length > 0) {
      blocks.push(`<p>${paragraph.map(confluenceInline).join('<br />')}</p>`);
      paragraph = [];
    }
  };

  const closeListsTo = (level: number): void => {
    while (listStack.length > level) {
      const tag = listStack.pop();
      blocks.push(`</${tag}>`);
    }
  };

  const openListItemLevel = (level: number, tag: 'ul' | 'ol'): void => {
    closeListsTo(level - 1);
    if (listStack.length < level) {
      listStack.push(tag);
      blocks.push(`<${tag}>`);
      return;
    }

    const current = listStack[level - 1];
    if (current !== tag) {
      closeListsTo(level - 1);
      listStack.push(tag);
      blocks.push(`<${tag}>`);
    }
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fence = line.match(/^```\s*([^`]*)\s*$/);

    if (fence) {
      flushParagraph();
      closeListsTo(0);
      if (inCode) {
        blocks.push(confluenceCodeMacro(codeLines.join('\n'), codeLanguage));
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
      closeListsTo(0);
      const table = collectTable(lines, i);
      blocks.push(confluenceTable(table.rows));
      i = table.endIndex;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeListsTo(0);
      const level = heading[1].length;
      blocks.push(`<h${level}>${confluenceInline(heading[2])}</h${level}>`);
      continue;
    }

    const list = line.match(/^(\s*)([-*+] |\d+\.\s+)(.+)$/);
    if (list) {
      flushParagraph();
      const level = Math.floor(list[1].replace(/\t/g, '  ').length / 2) + 1;
      const tag = /\d+\.\s+/.test(list[2]) ? 'ol' : 'ul';
      openListItemLevel(level, tag);
      blocks.push(`<li>${confluenceInline(list[3])}</li>`);
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      closeListsTo(0);
      blocks.push(`<blockquote><p>${confluenceInline(quote[1])}</p></blockquote>`);
      continue;
    }

    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushParagraph();
      closeListsTo(0);
      blocks.push('<hr />');
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      closeListsTo(0);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  closeListsTo(0);

  if (inCode) {
    blocks.push(confluenceCodeMacro(codeLines.join('\n'), codeLanguage));
  }

  return blocks.join('\n');
}

function normalizeLines(input: string): string {
  return input.replace(/\r\n?/g, '\n').trimEnd();
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
    return `${marker.repeat(level)} ${jiraInline(list[3])}`;
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

  let text = input.replace(/`([^`]+)`/g, (_match, code: string) => save(`{{${code}}}`));
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt: string, url: string) => save(`!${url.trim()}|alt=${alt.trim()}!`));
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, url: string) => save(`[${label}|${url.trim()}]`));
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

  let text = escapeHtml(input);
  text = text.replace(/`([^`]+)`/g, (_match, code: string) => save(`<code>${code}</code>`));
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt: string, url: string) => save(`<ac:image ac:alt="${escapeAttribute(alt.trim())}"><ri:url ri:value="${escapeAttribute(url.trim())}" /></ac:image>`));
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label: string, url: string) => save(`<a href="${escapeAttribute(url.trim())}">${label}</a>`));
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

function confluenceCodeMacro(code: string, language: string): string {
  const languageParam = language ? `<ac:parameter ac:name="language">${escapeHtml(language)}</ac:parameter>` : '';
  return `<ac:structured-macro ac:name="code">${languageParam}<ac:plain-text-body><![CDATA[${code.replaceAll(']]>', ']]]]><![CDATA[>')}]]></ac:plain-text-body></ac:structured-macro>`;
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

function trimTrailingBlankLines(lines: string[]): string[] {
  const result = [...lines];
  while (result.length > 0 && result[result.length - 1] === '') {
    result.pop();
  }
  return result;
}
