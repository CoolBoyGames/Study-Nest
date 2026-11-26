import { Fragment } from 'react';
import { parseMarkdownBlocks, type InlineToken } from '../../../utils/markdown';

function renderTokens(tokens: InlineToken[]) {
  return tokens.map((tok, idx) => {
    switch (tok.type) {
      case 'bold':
        return <strong key={idx}>{tok.value}</strong>;
      case 'italic':
        return <em key={idx}>{tok.value}</em>;
      case 'code':
        return (
          <code
            key={idx}
            className="rounded bg-[var(--surface-hover)] px-1 py-0.5 font-mono text-xs"
          >
            {tok.value}
          </code>
        );
      case 'link':
        return (
          <a
            key={idx}
            href={tok.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--primary)] underline"
          >
            {tok.label}
          </a>
        );
      default:
        return <Fragment key={idx}>{tok.value}</Fragment>;
    }
  });
}

export interface MarkdownPreviewProps {
  markdown: string;
}

export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  const blocks = parseMarkdownBlocks(markdown);

  if (blocks.length === 0) {
    return <p className="text-xs text-[var(--text-muted)]">Nothing written yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2.5 text-sm leading-relaxed text-[var(--text)]">
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          const cls =
            block.level === 1
              ? 'font-heading text-lg font-semibold'
              : block.level === 2
                ? 'font-heading text-base font-semibold'
                : 'font-heading text-sm font-semibold';
          return (
            <div key={idx} className={cls}>
              {renderTokens(block.tokens)}
            </div>
          );
        }
        if (block.type === 'quote') {
          return (
            <blockquote
              key={idx}
              className="border-l-2 border-[var(--primary)] pl-3 italic text-[var(--text-muted)]"
            >
              {renderTokens(block.tokens)}
            </blockquote>
          );
        }
        if (block.type === 'codeblock') {
          return (
            <pre
              key={idx}
              className="overflow-x-auto rounded-[var(--radius-sm)] bg-[var(--bg)] p-2.5 font-mono text-xs"
            >
              <code>{block.code}</code>
            </pre>
          );
        }
        if (block.type === 'list') {
          return (
            <ul key={idx} className="flex flex-col gap-1 pl-4">
              {block.items.map((item, itemIdx) => (
                <li
                  key={itemIdx}
                  className={
                    item.checked !== null ? '-ml-4 flex list-none items-center gap-2' : 'list-disc'
                  }
                >
                  {item.checked !== null && (
                    <span
                      aria-hidden="true"
                      className={`inline-block h-3.5 w-3.5 shrink-0 rounded-[3px] border ${
                        item.checked
                          ? 'border-[var(--primary)] bg-[var(--primary)]'
                          : 'border-[var(--border-control)]'
                      }`}
                    />
                  )}
                  <span className={item.checked ? 'line-through text-[var(--text-muted)]' : ''}>
                    {renderTokens(item.tokens)}
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        return <p key={idx}>{renderTokens(block.tokens)}</p>;
      })}
    </div>
  );
}
