export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'code'; value: string }
  | { type: 'link'; label: string; href: string };

export type MarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; tokens: InlineToken[] }
  | { type: 'paragraph'; tokens: InlineToken[] }
  | { type: 'quote'; tokens: InlineToken[] }
  | { type: 'codeblock'; code: string }
  | { type: 'list'; items: Array<{ checked: boolean | null; tokens: InlineToken[] }> };

function sanitizeHref(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      return u.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, idx) });
    }

    const raw = match[0];
    if (raw.startsWith('**') && raw.endsWith('**')) {
      tokens.push({ type: 'bold', value: raw.slice(2, -2) });
    } else if (raw.startsWith('*') && raw.endsWith('*')) {
      tokens.push({ type: 'italic', value: raw.slice(1, -1) });
    } else if (raw.startsWith('`') && raw.endsWith('`')) {
      tokens.push({ type: 'code', value: raw.slice(1, -1) });
    } else if (raw.startsWith('[')) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(raw);
      const label = linkMatch?.[1] ?? raw;
      const href = linkMatch?.[2] ? sanitizeHref(linkMatch[2].trim()) : null;
      if (href) {
        tokens.push({ type: 'link', label, href });
      } else {
        tokens.push({ type: 'text', value: label });
      }
    }

    lastIndex = idx + raw.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return tokens;
}

export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Fenced code block
    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] ?? '').trim().startsWith('```')) {
        codeLines.push(lines[i] ?? '');
        i++;
      }
      i++; // skip closing fence
      blocks.push({ type: 'codeblock', code: codeLines.join('\n') });
      continue;
    }

    // Headings
    const hMatch = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (hMatch) {
      const level = Math.min(3, hMatch[1]?.length ?? 1) as 1 | 2 | 3;
      blocks.push({ type: 'heading', level, tokens: tokenizeInline(hMatch[2] ?? '') });
      i++;
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      blocks.push({ type: 'quote', tokens: tokenizeInline(trimmed.slice(2)) });
      i++;
      continue;
    }

    // Unordered / checklist list
    if (/^[-*]\s+/.test(trimmed)) {
      const items: Array<{ checked: boolean | null; tokens: InlineToken[] }> = [];
      while (i < lines.length) {
        const cur = (lines[i] ?? '').trim();
        const itemMatch = /^[-*]\s+(.*)$/.exec(cur);
        if (!itemMatch) break;
        const body = itemMatch[1] ?? '';
        const taskMatch = /^\[( |x|X)\]\s+(.*)$/.exec(body);
        if (taskMatch) {
          items.push({
            checked: taskMatch[1]?.toLowerCase() === 'x',
            tokens: tokenizeInline(taskMatch[2] ?? ''),
          });
        } else {
          items.push({ checked: null, tokens: tokenizeInline(body) });
        }
        i++;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    // Paragraph
    const paraLines: string[] = [trimmed];
    i++;
    while (i < lines.length) {
      const next = (lines[i] ?? '').trim();
      if (
        !next ||
        next.startsWith('#') ||
        next.startsWith('> ') ||
        next.startsWith('```') ||
        /^[-*]\s+/.test(next)
      ) {
        break;
      }
      paraLines.push(next);
      i++;
    }
    blocks.push({ type: 'paragraph', tokens: tokenizeInline(paraLines.join(' ')) });
  }

  return blocks;
}
