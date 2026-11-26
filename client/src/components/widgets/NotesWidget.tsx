import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold,
  BookOpen,
  CheckSquare,
  Code,
  Download,
  FilePlus,
  FolderPlus,
  Heading1,
  Heading2,
  Link as LinkIcon,
  List,
  Pin,
  Search,
  Trash2,
} from 'lucide-react';
import {
  NOTE_TEMPLATES,
  type Course,
  type Notebook,
  type NoteTag,
  type PlannerNote,
} from '@studyspace/shared';
import { notesApi, type NoteUpdatePayload } from '../../api/notes';
import { plannerApi } from '../../api/planner';
import { useContainerWidth } from '../../hooks/useContainerWidth';
import { useT } from '../../i18n';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useToastStore } from '../../stores/useToastStore';
import { Button, EmptyState, IconButton, Input, Select, Skeleton, Tabs } from '../ui';
import { MarkdownPreview } from './notes/MarkdownPreview';

type EditorMode = 'split' | 'write' | 'preview';
type TemplateKey = keyof typeof NOTE_TEMPLATES;

export function NotesWidget() {
  const { t } = useT();
  const pushToast = useToastStore((s) => s.push);
  const setVocabQuickAddDraft = useSettingsStore((s) => s.setVocabQuickAddDraft);
  const setWidgetVisible = useSettingsStore((s) => s.setWidgetVisible);
  const selectedCourseId = useSettingsStore((s) => s.selectedCourseId);
  const setSelectedCourseId = useSettingsStore((s) => s.setSelectedCourseId);

  const [notes, setNotes] = useState<PlannerNote[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [tagsList, setTagsList] = useState<NoteTag[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);

  const [searchQ, setSearchQ] = useState('');
  const [notebookFilter, setNotebookFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const courseFilter = selectedCourseId;

  const [activeId, setActiveId] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [bodyDraft, setBodyDraft] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [selectedText, setSelectedText] = useState('');

  const [mode, setMode] = useState<EditorMode>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'write' : 'split'
  );
  const [containerRef, containerWidth] = useContainerWidth(560);
  const isCompactPane = containerWidth < 480;
  const activeMode: EditorMode = isCompactPane && mode === 'split' ? 'write' : mode;
  const [templateKey, setTemplateKey] = useState<TemplateKey>('lecture');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [newNbOpen, setNewNbOpen] = useState(false);
  const [newNbName, setNewNbName] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimerRef = useRef<number | undefined>(undefined);
  const pendingSaveRef = useRef<{ id: string; patch: NoteUpdatePayload } | null>(null);

  const loadSelectedIntoDrafts = (note: PlannerNote | undefined) => {
    if (!note) return;
    setActiveId(note.id);
    setTitleDraft(note.title);
    setBodyDraft(note.body);
    setTagsInput(note.tags.join(', '));
    setSaveStatus('idle');
  };

  const flushPendingSave = useCallback(async () => {
    if (saveTimerRef.current !== undefined) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = undefined;
    }
    const pending = pendingSaveRef.current;
    if (!pending) return;
    pendingSaveRef.current = null;
    try {
      const saved = await notesApi.updateNote(pending.id, pending.patch);
      setNotes((prev) => prev.map((n) => (n.id === saved.id ? saved : n)));
      setSaveStatus('saved');
    } catch {
      // ignore flush error
    }
  }, []);

  const fetchAll = useCallback(
    async (
      filters: { q?: string; notebookId?: string; courseId?: string; tag?: string } = {}
    ) => {
      try {
        const [nList, nbList, tList, cList] = await Promise.all([
          notesApi.listNotes(filters),
          notesApi.listNotebooks(),
          notesApi.listTags(),
          plannerApi.listCourses(),
        ]);
        setNotes(nList);
        setNotebooks(nbList);
        setTagsList(tList);
        setCourses(cList);
        setError('');
        return nList;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load notes.');
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const prevCourseRef = useRef(selectedCourseId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const initialCourse = useSettingsStore.getState().selectedCourseId;
        const [nList, nbList, tList, cList] = await Promise.all([
          notesApi.listNotes({ courseId: initialCourse }),
          notesApi.listNotebooks(),
          notesApi.listTags(),
          plannerApi.listCourses(),
        ]);
        if (cancelled) return;
        setNotes(nList);
        setNotebooks(nbList);
        setTagsList(tList);
        setCourses(cList);
        if (nList[0]) {
          setActiveId(nList[0].id);
          setTitleDraft(nList[0].title);
          setBodyDraft(nList[0].body);
          setTagsInput(nList[0].tags.join(', '));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load notes.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      void flushPendingSave();
    };
  }, [flushPendingSave]);

  useEffect(() => {
    if (prevCourseRef.current === selectedCourseId) return;
    prevCourseRef.current = selectedCourseId;
    let cancelled = false;
    void notesApi
      .listNotes({
        q: searchQ,
        notebookId: notebookFilter,
        courseId: selectedCourseId,
        tag: tagFilter,
      })
      .then((list) => {
        if (!cancelled) setNotes(list);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [notebookFilter, searchQ, selectedCourseId, tagFilter]);

  const applyFilterReload = async (next: {
    q?: string;
    notebookId?: string;
    courseId?: string;
    tag?: string;
  }) => {
    const list = await notesApi.listNotes(next);
    setNotes(list);
    if (list.length > 0 && !list.some((n) => n.id === activeId)) {
      loadSelectedIntoDrafts(list[0]);
    }
  };

  const scheduleAutosave = (noteId: string, patch: NoteUpdatePayload) => {
    if (!noteId) return;
    setSaveStatus('saving');
    const merged: NoteUpdatePayload = {
      ...(pendingSaveRef.current?.id === noteId ? pendingSaveRef.current.patch : {}),
      ...patch,
    };
    pendingSaveRef.current = { id: noteId, patch: merged };

    if (saveTimerRef.current !== undefined) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(async () => {
      const current = pendingSaveRef.current;
      pendingSaveRef.current = null;
      saveTimerRef.current = undefined;
      if (!current) return;
      try {
        const saved = await notesApi.updateNote(current.id, current.patch);
        setNotes((prev) => prev.map((n) => (n.id === saved.id ? saved : n)));
        if (current.patch.tags !== undefined) {
          const nextTags = await notesApi.listTags();
          setTagsList(nextTags);
        }
        setSaveStatus('saved');
      } catch {
        setSaveStatus('idle');
        pushToast('Autosave failed.', 'warning');
      }
    }, 300);
  };

  const handleSelectNote = async (note: PlannerNote) => {
    await flushPendingSave();
    loadSelectedIntoDrafts(note);
    setSelectedText('');
  };

  const handleCreateNote = async (tplKey: TemplateKey = templateKey) => {
    await flushPendingSave();
    const tpl = NOTE_TEMPLATES[tplKey];
    try {
      const created = await notesApi.createNote({
        title: tpl.title,
        body: tpl.body,
        notebookId: notebookFilter || null,
        courseId: courseFilter || null,
      });
      setNotes((prev) => [created, ...prev]);
      loadSelectedIntoDrafts(created);
      if (mode === 'preview') setMode('split');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Could not create note.', 'warning');
    }
  };

  const handleDeleteActive = async () => {
    const target = notes.find((n) => n.id === activeId);
    if (!target) return;
    if (saveTimerRef.current !== undefined) {
      window.clearTimeout(saveTimerRef.current);
    }
    pendingSaveRef.current = null;

    const remaining = notes.filter((n) => n.id !== target.id);
    setNotes(remaining);
    loadSelectedIntoDrafts(remaining[0]);

    try {
      await notesApi.deleteNote(target.id);
      pushToast(`Deleted “${target.title}”`, 'info', {
        label: 'Undo',
        onAction: () => {
          void notesApi
            .createNote({
              title: target.title,
              body: target.body,
              notebookId: target.notebookId,
              courseId: target.courseId,
              pinned: target.pinned,
              tags: target.tags,
            })
            .then((restored) => {
              setNotes((prev) => [restored, ...prev]);
              loadSelectedIntoDrafts(restored);
            });
        },
      });
    } catch (err) {
      void fetchAll();
      pushToast(err instanceof Error ? err.message : 'Could not delete note.', 'warning');
    }
  };

  const handleCreateNotebook = async () => {
    if (!newNbName.trim()) return;
    const created = await notesApi.createNotebook(newNbName.trim());
    setNotebooks((prev) => [...prev, created]);
    setNewNbName('');
    setNewNbOpen(false);
    if (activeId) {
      scheduleAutosave(activeId, { notebookId: created.id });
    }
    pushToast(`Notebook “${created.name}” created.`, 'success');
  };

  const insertSnippet = (before: string, after = '', placeholder = '') => {
    const el = textareaRef.current;
    if (!el || !activeId) return;
    const start = el.selectionStart ?? bodyDraft.length;
    const end = el.selectionEnd ?? bodyDraft.length;
    const chosen = bodyDraft.slice(start, end) || placeholder;
    const nextBody = `${bodyDraft.slice(0, start)}${before}${chosen}${after}${bodyDraft.slice(end)}`;
    setBodyDraft(nextBody);
    scheduleAutosave(activeId, { body: nextBody });
    window.requestAnimationFrame(() => {
      el.focus();
      const cursorPos = start + before.length + chosen.length;
      el.setSelectionRange(cursorPos, cursorPos);
    });
  };

  const handleExportMd = () => {
    const safeName =
      titleDraft
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'note';
    const blob = new Blob([`# ${titleDraft}\n\n${bodyDraft}`], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCaptureSelection = () => {
    const word = selectedText.trim();
    if (!word) return;
    setVocabQuickAddDraft({ word, notes: `From note: ${titleDraft}` });
    setWidgetVisible('vocab', true);
    pushToast(`Prefilled “${word}” in Vocabulary quick-add.`, 'info');
  };

  const updateSelection = () => {
    const el = textareaRef.current;
    if (el && document.activeElement === el) {
      const sel = el.value.slice(el.selectionStart, el.selectionEnd).trim();
      setSelectedText(sel);
      return;
    }
    const winSel = window.getSelection()?.toString().trim() ?? '';
    setSelectedText(winSel);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
        <p className="text-sm text-[var(--text)]">{error}</p>
        <Button variant="outline" size="sm" onClick={() => void fetchAll()}>
          Retry
        </Button>
      </div>
    );
  }

  const activeNote = notes.find((n) => n.id === activeId);
  const wordCount = bodyDraft.trim() ? bodyDraft.trim().split(/\s+/).length : 0;

  return (
    <div ref={containerRef} className="flex flex-col gap-3">
      {/* Top search, filters & template creation */}
      <div className={`grid gap-1.5 ${isCompactPane ? 'grid-cols-2' : 'grid-cols-12'}`}>
        <div className={`relative ${isCompactPane ? 'col-span-2' : 'col-span-5'}`}>
          <Input
            aria-label={t('notes.searchPlaceholder')}
            placeholder={t('notes.searchPlaceholder')}
            value={searchQ}
            onChange={(e) => {
              const q = e.target.value;
              setSearchQ(q);
              void applyFilterReload({
                q,
                notebookId: notebookFilter,
                courseId: courseFilter,
                tag: tagFilter,
              });
            }}
            className="pl-8"
          />
          <Search
            size={14}
            strokeWidth={1.5}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
        </div>

        <div className={isCompactPane ? 'col-span-1' : 'col-span-3'}>
          <Select
            aria-label="Filter by notebook"
            value={notebookFilter}
            onChange={(e) => {
              const notebookId = e.target.value;
              setNotebookFilter(notebookId);
              void applyFilterReload({
                q: searchQ,
                notebookId,
                courseId: courseFilter,
                tag: tagFilter,
              });
            }}
            options={[
              { value: '', label: t('notes.allNotebooks') },
              ...notebooks.map((nb) => ({ value: nb.id, label: nb.name })),
            ]}
          />
        </div>

        <div className={isCompactPane ? 'col-span-1' : 'col-span-2'}>
          <Select
            aria-label="Note template"
            value={templateKey}
            onChange={(e) => setTemplateKey(e.target.value as TemplateKey)}
            options={Object.entries(NOTE_TEMPLATES).map(([k, v]) => ({
              value: k,
              label: v.label,
            }))}
          />
        </div>

        <div className={`${isCompactPane ? 'col-span-2' : 'col-span-2'} flex justify-end gap-1`}>
          <IconButton label="New notebook" onClick={() => setNewNbOpen((v) => !v)}>
            <FolderPlus size={16} strokeWidth={1.5} />
          </IconButton>
          <IconButton label="New note from template" onClick={() => void handleCreateNote()}>
            <FilePlus size={16} strokeWidth={1.5} />
          </IconButton>
        </div>
      </div>

      {newNbOpen && (
        <div className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-2">
          <div className="flex-1">
            <Input
              aria-label="Notebook name"
              placeholder="New notebook name…"
              value={newNbName}
              onChange={(e) => setNewNbName(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={() => void handleCreateNotebook()}>
            Add
          </Button>
        </div>
      )}

      {/* Course + Tag filter row */}
      <div className="grid grid-cols-2 gap-1.5">
        <Select
          aria-label="Filter notes by course"
          value={courseFilter}
          onChange={(e) => {
            const courseId = e.target.value;
            setSelectedCourseId(courseId);
            void applyFilterReload({
              q: searchQ,
              notebookId: notebookFilter,
              courseId,
              tag: tagFilter,
            });
          }}
          options={[
            { value: '', label: t('notes.allCourses') },
            ...courses.map((c) => ({ value: c.id, label: c.code || c.name })),
          ]}
        />
        <Select
          aria-label={t('notes.allTags')}
          value={tagFilter}
          onChange={(e) => {
            const tag = e.target.value;
            setTagFilter(tag);
            void applyFilterReload({
              q: searchQ,
              notebookId: notebookFilter,
              courseId: courseFilter,
              tag,
            });
          }}
          options={[
            { value: '', label: t('notes.allTags') },
            ...tagsList.map((tagItem) => ({ value: tagItem.name, label: `#${tagItem.name}` })),
          ]}
        />
      </div>

      {/* Main split workspace: left list + right editor/preview */}
      <div className={`grid gap-3 ${isCompactPane ? 'grid-cols-1' : 'grid-cols-12'}`}>
        {/* Note list */}
        <div className={isCompactPane ? '' : 'col-span-4'}>
          {notes.length === 0 ? (
            <EmptyState
              message={t('notes.empty')}
              actionLabel={t('notes.newNote')}
              onAction={() => void handleCreateNote('blank')}
            />
          ) : (
            <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
              {notes.map((n) => {
                const selected = n.id === activeId;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => void handleSelectNote(n)}
                      className={`flex w-full cursor-pointer flex-col gap-0.5 rounded-[var(--radius-sm)] border px-2.5 py-2 text-left transition-colors ${
                        selected
                          ? 'border-[var(--primary)] bg-[var(--surface-hover)]'
                          : 'border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-xs font-semibold text-[var(--text)]">
                          {n.title}
                        </span>
                        {n.pinned && (
                          <Pin size={11} strokeWidth={2} className="shrink-0 text-[var(--primary)]" />
                        )}
                      </div>
                      <span className="truncate text-[11px] text-[var(--text-muted)]">
                        {n.body.replace(/[#>*`-]/g, '').trim() || 'Empty note'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Editor & Preview */}
        <div className={`flex flex-col gap-2 ${isCompactPane ? '' : 'col-span-8'}`}>
          {activeNote ? (
            <>
              <div className="flex items-center gap-1.5">
                <div className="flex-1">
                  <Input
                    aria-label="Note title"
                    value={titleDraft}
                    onChange={(e) => {
                      const nextTitle = e.target.value;
                      setTitleDraft(nextTitle);
                      scheduleAutosave(activeNote.id, { title: nextTitle.trim() || 'Untitled note' });
                    }}
                  />
                </div>
                <IconButton
                  label={activeNote.pinned ? 'Unpin note' : 'Pin note'}
                  active={activeNote.pinned}
                  onClick={() => scheduleAutosave(activeNote.id, { pinned: !activeNote.pinned })}
                >
                  <Pin size={16} strokeWidth={1.5} />
                </IconButton>
                <IconButton label="Export markdown (.md)" onClick={handleExportMd}>
                  <Download size={16} strokeWidth={1.5} />
                </IconButton>
                <IconButton label="Delete note" onClick={() => void handleDeleteActive()}>
                  <Trash2 size={16} strokeWidth={1.5} />
                </IconButton>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <Select
                  aria-label="Note notebook"
                  value={activeNote.notebookId ?? ''}
                  onChange={(e) =>
                    scheduleAutosave(activeNote.id, { notebookId: e.target.value || null })
                  }
                  options={[
                    { value: '', label: 'No notebook' },
                    ...notebooks.map((nb) => ({ value: nb.id, label: nb.name })),
                  ]}
                />
                <Select
                  aria-label="Note course"
                  value={activeNote.courseId ?? ''}
                  onChange={(e) =>
                    scheduleAutosave(activeNote.id, { courseId: e.target.value || null })
                  }
                  options={[
                    { value: '', label: 'No course' },
                    ...courses.map((c) => ({ value: c.id, label: c.code || c.name })),
                  ]}
                />
                <Input
                  aria-label="Note tags"
                  placeholder="tags, comma"
                  value={tagsInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTagsInput(val);
                    scheduleAutosave(activeNote.id, {
                      tags: val
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                    });
                  }}
                />
              </div>

              {/* Formatting toolbar + view mode */}
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center gap-0.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-0.5">
                  <IconButton label="Heading 1" onClick={() => insertSnippet('# ', '', 'Heading')}>
                    <Heading1 size={14} strokeWidth={1.5} />
                  </IconButton>
                  <IconButton label="Heading 2" onClick={() => insertSnippet('## ', '', 'Subheading')}>
                    <Heading2 size={14} strokeWidth={1.5} />
                  </IconButton>
                  <IconButton label="Bold" onClick={() => insertSnippet('**', '**', 'bold')}>
                    <Bold size={14} strokeWidth={1.5} />
                  </IconButton>
                  <IconButton label="Bullet list" onClick={() => insertSnippet('- ', '', 'item')}>
                    <List size={14} strokeWidth={1.5} />
                  </IconButton>
                  <IconButton label="Checklist" onClick={() => insertSnippet('- [ ] ', '', 'task')}>
                    <CheckSquare size={14} strokeWidth={1.5} />
                  </IconButton>
                  <IconButton label="Inline code" onClick={() => insertSnippet('`', '`', 'code')}>
                    <Code size={14} strokeWidth={1.5} />
                  </IconButton>
                  <IconButton
                    label="Link"
                    onClick={() => insertSnippet('[', '](https://example.com)', 'link')}
                  >
                    <LinkIcon size={14} strokeWidth={1.5} />
                  </IconButton>
                </div>

                <div className={isCompactPane ? 'w-32' : 'w-40'}>
                  <Tabs
                    items={
                      isCompactPane
                        ? [
                            { id: 'write' as EditorMode, label: t('notes.edit') },
                            { id: 'preview' as EditorMode, label: t('notes.preview') },
                          ]
                        : [
                            { id: 'split' as EditorMode, label: t('notes.split') },
                            { id: 'write' as EditorMode, label: t('notes.edit') },
                            { id: 'preview' as EditorMode, label: t('notes.preview') },
                          ]
                    }
                    value={activeMode}
                    onChange={setMode}
                    ariaLabel={t('notes.modeAria')}
                  />
                </div>
              </div>

              {/* Editor + Preview panes */}
              <div
                className={`grid gap-2 ${activeMode === 'split' ? 'grid-cols-2' : 'grid-cols-1'}`}
                onMouseUp={updateSelection}
                onKeyUp={updateSelection}
              >
                {activeMode !== 'preview' && (
                  <textarea
                    ref={textareaRef}
                    aria-label={t('notes.bodyPlaceholder')}
                    rows={10}
                    value={bodyDraft}
                    onBlur={() => void flushPendingSave()}
                    onChange={(e) => {
                      const nextBody = e.target.value;
                      setBodyDraft(nextBody);
                      scheduleAutosave(activeNote.id, { body: nextBody });
                    }}
                    placeholder={t('notes.bodyPlaceholder')}
                    className="h-56 w-full resize-y rounded-[var(--radius-sm)] border border-[var(--border-control)] bg-[var(--surface)] p-2.5 font-mono text-xs leading-relaxed text-[var(--text)] placeholder:text-[var(--text-muted)]"
                  />
                )}

                {activeMode !== 'write' && (
                  <div className="h-56 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-2.5">
                    <MarkdownPreview markdown={bodyDraft} />
                  </div>
                )}
              </div>

              {/* Footer: word count, autosave status, selection -> vocab */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">{t('notes.words', { count: wordCount })}</span>
                  <span aria-live="polite">
                    {saveStatus === 'saving'
                      ? t('notes.saving')
                      : saveStatus === 'saved'
                        ? t('notes.saved')
                        : ''}
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={!selectedText}
                  onClick={handleCaptureSelection}
                >
                  <BookOpen size={13} strokeWidth={1.5} />
                  {selectedText ? `Add “${selectedText.slice(0, 18)}” to Vocab` : 'Select text → Vocab'}
                </Button>
              </div>
            </>
          ) : (
            <EmptyState
              message="Select or create a note to begin writing."
              actionLabel="New note"
              onAction={() => void handleCreateNote()}
            />
          )}
        </div>
      </div>
    </div>
  );
}
