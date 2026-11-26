import { describe, expect, it } from 'vitest';
import { parseMarkdownBlocks, tokenizeInline } from './markdown';

describe('markdown parser', () => {
  it('parses headings, task lists, blockquotes, and code blocks', () => {
    const md = [
      '# Lecture Notes',
      '',
      '> Key theorem',
      '',
      '- [x] Derive formula',
      '- [ ] Solve problem set',
      '',
      '```',
      'const x = 1;',
      '```',
    ].join('\n');

    const blocks = parseMarkdownBlocks(md);
    expect(blocks[0]).toMatchObject({ type: 'heading', level: 1 });
    expect(blocks[1]).toMatchObject({ type: 'quote' });
    expect(blocks[2]).toMatchObject({
      type: 'list',
      items: [
        { checked: true },
        { checked: false },
      ],
    });
    expect(blocks[3]).toEqual({ type: 'codeblock', code: 'const x = 1;' });
  });

  it('parses inline formatting and strips unsafe javascript links', () => {
    const tokens = tokenizeInline(
      'Read **bold**, *italic*, `code`, [safe](https://example.com) and [bad](javascript:alert(1))'
    );
    expect(tokens.some((t) => t.type === 'bold' && t.value === 'bold')).toBe(true);
    expect(tokens.some((t) => t.type === 'italic' && t.value === 'italic')).toBe(true);
    expect(tokens.some((t) => t.type === 'code' && t.value === 'code')).toBe(true);
    expect(
      tokens.some((t) => t.type === 'link' && t.href === 'https://example.com/')
    ).toBe(true);
    expect(tokens.some((t) => t.type === 'link' && t.href.includes('javascript'))).toBe(false);
  });
});
