import { useState, type FormEvent } from 'react';
import { BookOpen, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { VocabCard } from '@studyspace/shared';
import type { CardPayload } from '../../../api/vocab';
import { Button, EmptyState, IconButton, Input } from '../../ui';

export interface VocabCardsManagerProps {
  deckName: string;
  cards: VocabCard[];
  search: string;
  prefillDraft?: { word: string; notes: string } | null;
  onClearPrefill?: () => void;
  onSearchChange: (val: string) => void;
  onCreateCard: (payload: CardPayload) => Promise<void>;
  onUpdateCard: (cardId: string, payload: CardPayload) => Promise<void>;
  onDeleteCard: (cardId: string) => Promise<void>;
}

const EMPTY_FORM = {
  word: '',
  meaning: '',
  partOfSpeech: '',
  example: '',
  notes: '',
  tagsRaw: '',
};

export function VocabCardsManager({
  deckName,
  cards,
  search,
  prefillDraft,
  onClearPrefill,
  onSearchChange,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
}: VocabCardsManagerProps) {
  const [showForm, setShowForm] = useState(Boolean(prefillDraft));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(() =>
    prefillDraft
      ? { ...EMPTY_FORM, word: prefillDraft.word, notes: prefillDraft.notes }
      : EMPTY_FORM
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  };

  const openEdit = (card: VocabCard) => {
    setEditingId(card.id);
    setForm({
      word: card.word,
      meaning: card.meaning,
      partOfSpeech: card.partOfSpeech,
      example: card.example,
      notes: card.notes,
      tagsRaw: card.tags.join(', '),
    });
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.word.trim() || !form.meaning.trim()) {
      setError('Word and meaning are required.');
      return;
    }

    const payload: CardPayload = {
      word: form.word.trim(),
      meaning: form.meaning.trim(),
      partOfSpeech: form.partOfSpeech.trim(),
      example: form.example.trim(),
      notes: form.notes.trim(),
      tags: form.tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };

    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await onUpdateCard(editingId, payload);
      } else {
        await onCreateCard(payload);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setShowForm(false);
      onClearPrefill?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save card.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            aria-label="Search cards"
            placeholder={`Search in ${deckName}…`}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
          <Search
            size={15}
            strokeWidth={1.5}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus size={15} strokeWidth={1.5} />
          Quick add
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="animate-fade-in flex flex-col gap-2.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-sm font-semibold">
              {editingId ? 'Edit card' : `New card in ${deckName}`}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
            >
              Cancel
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Word *"
              placeholder="e.g. Ubiquitous"
              value={form.word}
              onChange={(e) => setForm((f) => ({ ...f, word: e.target.value }))}
            />
            <Input
              label="Part of speech"
              placeholder="adjective, noun, verb…"
              value={form.partOfSpeech}
              onChange={(e) => setForm((f) => ({ ...f, partOfSpeech: e.target.value }))}
            />
          </div>

          <Input
            label="Meaning *"
            placeholder="Definition or translation"
            value={form.meaning}
            onChange={(e) => setForm((f) => ({ ...f, meaning: e.target.value }))}
          />
          <Input
            label="Example sentence"
            placeholder="Optional context sentence"
            value={form.example}
            onChange={(e) => setForm((f) => ({ ...f, example: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              label="Notes"
              placeholder="Root or memory cue"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
            <Input
              label="Tags (comma-separated)"
              placeholder="academic, gre"
              value={form.tagsRaw}
              onChange={(e) => setForm((f) => ({ ...f, tagsRaw: e.target.value }))}
            />
          </div>

          {error && (
            <span role="alert" className="text-xs text-[var(--danger)]">
              {error}
            </span>
          )}

          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add card'}
          </Button>
        </form>
      )}

      {cards.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={22} strokeWidth={1.5} />}
          message={
            search
              ? 'No cards match your search.'
              : 'This deck has no cards yet. Add your first term.'
          }
          actionLabel={!search ? 'Quick add card' : undefined}
          onAction={!search ? openAdd : undefined}
        />
      ) : (
        <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
          {cards.map((card) => (
            <li
              key={card.id}
              className="flex items-start justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-heading text-sm font-semibold text-[var(--text)]">
                    {card.word}
                  </span>
                  {card.partOfSpeech && (
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {card.partOfSpeech}
                    </span>
                  )}
                  <span className="ml-auto tabular-nums text-[11px] text-[var(--text-muted)]">
                    Due {card.dueDate}
                  </span>
                </div>
                <p className="truncate text-xs text-[var(--text-muted)]">{card.meaning}</p>
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <IconButton label={`Edit ${card.word}`} onClick={() => openEdit(card)}>
                  <Pencil size={15} strokeWidth={1.5} />
                </IconButton>

                {confirmDeleteId === card.id ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void onDeleteCard(card.id);
                      setConfirmDeleteId(null);
                    }}
                  >
                    Confirm
                  </Button>
                ) : (
                  <IconButton
                    label={`Delete ${card.word}`}
                    onClick={() => setConfirmDeleteId(card.id)}
                  >
                    <Trash2 size={15} strokeWidth={1.5} />
                  </IconButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
