import { Fragment, useEffect, useRef, useState } from 'react';
import { FilePlus, Trash2 } from 'lucide-react';
import type { ScratchpadNote } from '@studyspace/shared';
import { toolsApi } from '../../api/tools';
import { useToastStore } from '../../stores/useToastStore';
import { parseMarkdownBlocks, type InlineToken } from '../../utils/markdown';
import { Button, IconButton, Input, Select, Skeleton, Tabs } from '../ui';

type NoteViewMode = 'write' | 'preview';

const MODE_TABS: { id: NoteViewMode; label: string }[] = [
  { id: 'write', label: 'Write' },
  { id: 'preview', label: 'Preview' },
];

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

export function NotesWidget() {
  const pushToast = useToastStore((s) => s.push);

  const [notes, setNotes] = useState<ScratchpadNote[]>([]);
  const [activeId, setActiveId] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [contentDraft, setContentDraft] = useState('');
  const [mode, setMode] = useState<NoteViewMode>('write');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const saveTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await toolsApi.listNotes();
        if (cancelled) return;
        setNotes(list);
        const first = list[0];
        if (first) {
          setActiveId(first.id);
          setTitleDraft(first.title);
          setContentDraft(first.content);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load notes.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (saveTimerRef.current !== undefined) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const scheduleAutosave = (noteId: string, nextTitle: string, nextContent: string) => {
    if (!noteId) return;
    setSaveStatus('saving');
    if (saveTimerRef.current !== undefined) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        const saved = await toolsApi.saveNote(noteId, {
          title: nextTitle.trim() || 'Untitled note',
          content: nextContent,
        });
        setNotes((prev) => prev.map((n) => (n.id === saved.id ? saved : n)));
        setSaveStatus('saved');
      } catch {
        setSaveStatus('idle');
        pushToast('Autosave failed. Check connection.', 'warning');
      }
    }, 500);
  };

  const handleSelectNote = (id: string) => {
    const found = notes.find((n) => n.id === id);
    if (!found) return;
    setActiveId(found.id);
    setTitleDraft(found.title);
    setContentDraft(found.content);
    setSaveStatus('idle');
  };

  const handleNewNote = async () => {
    try {
      const created = await toolsApi.createNote(`Note ${notes.length + 1}`, '');
      setNotes((prev) => [created, ...prev]);
      setActiveId(created.id);
      setTitleDraft(created.title);
      setContentDraft(created.content);
      setMode('write');
      setSaveStatus('saved');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not create note.', 'warning');
    }
  };

  const handleDeleteNote = async () => {
    if (notes.length <= 1 || !activeId) return;
    try {
      await toolsApi.deleteNote(activeId);
      const remaining = notes.filter((n) => n.id !== activeId);
      setNotes(remaining);
      const next = remaining[0];
      if (next) {
        setActiveId(next.id);
        setTitleDraft(next.title);
        setContentDraft(next.content);
      }
      pushToast('Note deleted.', 'info');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not delete note.', 'warning');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
        <p className="text-sm text-[var(--text)]">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setError('');
            setLoading(true);
            void toolsApi
              .listNotes()
              .then((list) => {
                setNotes(list);
                if (list[0]) {
                  setActiveId(list[0].id);
                  setTitleDraft(list[0].title);
                  setContentDraft(list[0].content);
                }
              })
              .catch((e: unknown) =>
                setError(e instanceof Error ? e.message : 'Could not load notes.')
              )
              .finally(() => setLoading(false));
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  const blocks = parseMarkdownBlocks(contentDraft);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Select
            aria-label="Select note"
            value={activeId}
            onChange={(e) => handleSelectNote(e.target.value)}
            options={notes.map((n) => ({ value: n.id, label: n.title }))}
          />
        </div>
        <IconButton label="New note" onClick={() => void handleNewNote()}>
          <FilePlus size={18} strokeWidth={1.5} />
        </IconButton>
        {notes.length > 1 && (
          <IconButton label="Delete note" onClick={() => void handleDeleteNote()}>
            <Trash2 size={16} strokeWidth={1.5} />
          </IconButton>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <Input
            aria-label="Note title"
            value={titleDraft}
            onChange={(e) => {
              const nextTitle = e.target.value;
              setTitleDraft(nextTitle);
              scheduleAutosave(activeId, nextTitle, contentDraft);
            }}
          />
        </div>
        <span className="shrink-0 text-xs text-[var(--text-muted)]" aria-live="polite">
          {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : ''}
        </span>
      </div>

      <Tabs items={MODE_TABS} value={mode} onChange={setMode} ariaLabel="Note mode" />

      {mode === 'write' ? (
        <textarea
          aria-label="Scratchpad markdown content"
          rows={9}
          value={contentDraft}
          onChange={(e) => {
            const nextContent = e.target.value;
            setContentDraft(nextContent);
            scheduleAutosave(activeId, titleDraft, nextContent);
          }}
          placeholder="Write markdown notes… (# heading, - [ ] task, **bold**, `code`)"
          className="w-full resize-y rounded-[var(--radius-sm)] border border-[var(--border-control)] bg-[var(--surface)] p-3 font-mono text-xs leading-relaxed text-[var(--text)] placeholder:text-[var(--text-muted)]"
        />
      ) : (
        <div className="min-h-48 max-h-72 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text)]">
          {blocks.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)]">Nothing written yet.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
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
                          className={item.checked !== null ? 'list-none -ml-4 flex items-center gap-2' : 'list-disc'}
                        >
                          {item.checked !== null && (
                            <span
                              aria-hidden="true"
                              className={`inline-block h-3.5 w-3.5 rounded-[3px] border ${
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
          )}
        </div>
      )}
    </div>
  );
}
