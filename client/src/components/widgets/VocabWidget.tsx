import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { FolderPlus, Layers, Trash2 } from 'lucide-react';
import type {
  DeckWithCounts,
  ReviewRating,
  SrsStats,
  VocabCard,
  VocabCardWithPreviews,
} from '@studyspace/shared';
import { vocabApi, type CardPayload } from '../../api/vocab';
import { useToastStore } from '../../stores/useToastStore';
import { Button, EmptyState, IconButton, Input, Modal, Select, Skeleton, Tabs } from '../ui';
import { VocabCardsManager } from './vocab/VocabCardsManager';
import { VocabImportExport } from './vocab/VocabImportExport';
import { VocabReviewSession } from './vocab/VocabReviewSession';

type VocabTab = 'review' | 'cards' | 'io';

const VOCAB_TABS: { id: VocabTab; label: string }[] = [
  { id: 'review', label: 'Review' },
  { id: 'cards', label: 'Cards' },
  { id: 'io', label: 'Import / Export' },
];

export function VocabWidget() {
  const pushToast = useToastStore((s) => s.push);

  const [tab, setTab] = useState<VocabTab>('review');
  const [decks, setDecks] = useState<DeckWithCounts[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [queue, setQueue] = useState<VocabCardWithPreviews[]>([]);
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [stats, setStats] = useState<SrsStats | null>(null);
  const [search, setSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [deckModalOpen, setDeckModalOpen] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDesc, setNewDeckDesc] = useState('');
  const [confirmDeleteDeck, setConfirmDeleteDeck] = useState(false);

  const loadWorkspace = useCallback(async (deckIdOverride?: string) => {
    setLoading(true);
    setError('');
    try {
      const deckList = await vocabApi.listDecks();
      setDecks(deckList);

      const activeId =
        deckIdOverride ??
        (selectedDeckId && deckList.some((d) => d.id === selectedDeckId)
          ? selectedDeckId
          : deckList[0]?.id ?? '');

      setSelectedDeckId(activeId);

      const [nextStats, nextQueue, nextCards] = await Promise.all([
        vocabApi.getStats(activeId || undefined),
        vocabApi.getReviewQueue(activeId || undefined),
        activeId ? vocabApi.listCards(activeId, search) : Promise.resolve([]),
      ]);

      setStats(nextStats);
      setQueue(nextQueue);
      setCards(nextCards);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load vocabulary workspace.');
    } finally {
      setLoading(false);
    }
  }, [search, selectedDeckId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const deckList = await vocabApi.listDecks();
        const activeId = deckList[0]?.id ?? '';
        const [nextStats, nextQueue, nextCards] = await Promise.all([
          vocabApi.getStats(activeId || undefined),
          vocabApi.getReviewQueue(activeId || undefined),
          activeId ? vocabApi.listCards(activeId) : Promise.resolve([]),
        ]);
        if (cancelled) return;
        setDecks(deckList);
        setSelectedDeckId(activeId);
        setStats(nextStats);
        setQueue(nextQueue);
        setCards(nextCards);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load vocabulary workspace.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshDeckData = useCallback(
    async (deckId: string, query = search) => {
      try {
        const [deckList, nextStats, nextQueue, nextCards] = await Promise.all([
          vocabApi.listDecks(),
          vocabApi.getStats(deckId || undefined),
          vocabApi.getReviewQueue(deckId || undefined),
          deckId ? vocabApi.listCards(deckId, query) : Promise.resolve([]),
        ]);
        setDecks(deckList);
        setStats(nextStats);
        setQueue(nextQueue);
        setCards(nextCards);
      } catch (err) {
        pushToast(err instanceof Error ? err.message : 'Refresh failed.', 'warning');
      }
    },
    [pushToast, search]
  );

  const handleSelectDeck = async (nextId: string) => {
    setSelectedDeckId(nextId);
    setConfirmDeleteDeck(false);
    await refreshDeckData(nextId);
  };

  const handleSearchChange = async (nextQuery: string) => {
    setSearch(nextQuery);
    if (!selectedDeckId) return;
    try {
      const filtered = await vocabApi.listCards(selectedDeckId, nextQuery);
      setCards(filtered);
    } catch {
      // ignore transient search error
    }
  };

  const handleCreateDeck = async (e: FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;
    try {
      const created = await vocabApi.createDeck(newDeckName.trim(), newDeckDesc.trim());
      setNewDeckName('');
      setNewDeckDesc('');
      setDeckModalOpen(false);
      setSelectedDeckId(created.id);
      await refreshDeckData(created.id);
      pushToast(`Deck “${created.name}” created.`, 'success');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to create deck.', 'warning');
    }
  };

  const handleDeleteDeck = async () => {
    if (!selectedDeckId) return;
    try {
      await vocabApi.deleteDeck(selectedDeckId);
      setConfirmDeleteDeck(false);
      pushToast('Deck deleted.', 'info');
      await loadWorkspace('');
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to delete deck.', 'warning');
    }
  };

  const handleRate = async (cardId: string, rating: ReviewRating) => {
    const res = await vocabApi.submitReview(cardId, rating);
    setQueue((q) => q.filter((c) => c.id !== cardId));
    setStats(res.stats);
    const [deckList, updatedCards] = await Promise.all([
      vocabApi.listDecks(),
      selectedDeckId ? vocabApi.listCards(selectedDeckId, search) : Promise.resolve([]),
    ]);
    setDecks(deckList);
    setCards(updatedCards);
  };

  const handleCreateCard = async (payload: CardPayload) => {
    if (!selectedDeckId) return;
    await vocabApi.createCard(selectedDeckId, payload);
    pushToast(`Added “${payload.word}”.`, 'success');
    await refreshDeckData(selectedDeckId);
  };

  const handleUpdateCard = async (cardId: string, payload: CardPayload) => {
    await vocabApi.updateCard(cardId, payload);
    pushToast(`Updated “${payload.word}”.`, 'success');
    await refreshDeckData(selectedDeckId);
  };

  const handleDeleteCard = async (cardId: string) => {
    await vocabApi.deleteCard(cardId);
    pushToast('Card deleted.', 'info');
    await refreshDeckData(selectedDeckId);
  };

  const handleImport = async (format: 'csv' | 'json', data: string) => {
    if (!selectedDeckId) return;
    const result = await vocabApi.importCards(selectedDeckId, format, data);
    pushToast(`Imported ${result.imported} cards.`, 'success');
    await refreshDeckData(selectedDeckId);
    setTab('cards');
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-4 gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-5 text-center">
        <p className="text-sm text-[var(--text)]">{error}</p>
        <Button variant="outline" size="sm" onClick={() => void loadWorkspace()}>
          Retry
        </Button>
      </div>
    );
  }

  const activeDeck = decks.find((d) => d.id === selectedDeckId);

  return (
    <div className="flex flex-col gap-3">
      {/* Deck selector + actions */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Select
            aria-label="Select vocabulary deck"
            value={selectedDeckId}
            onChange={(e) => void handleSelectDeck(e.target.value)}
            options={
              decks.length > 0
                ? decks.map((d) => ({
                    value: d.id,
                    label: `${d.name} (${d.dueCount} due)`,
                  }))
                : [{ value: '', label: 'No decks yet' }]
            }
          />
        </div>

        <IconButton label="Create deck" onClick={() => setDeckModalOpen(true)}>
          <FolderPlus size={18} strokeWidth={1.5} />
        </IconButton>

        {activeDeck &&
          (confirmDeleteDeck ? (
            <Button size="sm" variant="outline" onClick={() => void handleDeleteDeck()}>
              Confirm
            </Button>
          ) : (
            <IconButton label="Delete current deck" onClick={() => setConfirmDeleteDeck(true)}>
              <Trash2 size={16} strokeWidth={1.5} />
            </IconButton>
          ))}
      </div>

      {!activeDeck ? (
        <EmptyState
          icon={<Layers size={24} strokeWidth={1.5} />}
          message="Create a vocabulary deck to start spaced-repetition study."
          actionLabel="Create deck"
          onAction={() => setDeckModalOpen(true)}
        />
      ) : (
        <>
          {/* Compact SRS stats strip */}
          {stats && (
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5">
                <div className="tabular-nums text-sm font-semibold text-[var(--primary)]">
                  {stats.dueToday}
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">Due</div>
              </div>
              <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5">
                <div className="tabular-nums text-sm font-semibold text-[var(--text)]">
                  {stats.newCount}/{stats.learnedCount}
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">New/Lrn</div>
              </div>
              <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5">
                <div className="tabular-nums text-sm font-semibold text-[var(--text)]">
                  {stats.retentionRate}%
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">Retain</div>
              </div>
              <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5">
                <div className="tabular-nums text-sm font-semibold text-[var(--text)]">
                  {stats.reviewStreak}d
                </div>
                <div className="text-[11px] text-[var(--text-muted)]">Streak</div>
              </div>
            </div>
          )}

          <Tabs items={VOCAB_TABS} value={tab} onChange={setTab} ariaLabel="Vocabulary tools" />

          {tab === 'review' && (
            <VocabReviewSession
              queue={queue}
              stats={stats}
              onRate={handleRate}
              onRefresh={() => void refreshDeckData(activeDeck.id)}
              onAddCard={() => setTab('cards')}
            />
          )}

          {tab === 'cards' && (
            <VocabCardsManager
              deckName={activeDeck.name}
              cards={cards}
              search={search}
              onSearchChange={(val) => void handleSearchChange(val)}
              onCreateCard={handleCreateCard}
              onUpdateCard={handleUpdateCard}
              onDeleteCard={handleDeleteCard}
            />
          )}

          {tab === 'io' && (
            <VocabImportExport
              deckId={activeDeck.id}
              deckName={activeDeck.name}
              onImport={handleImport}
            />
          )}
        </>
      )}

      <Modal open={deckModalOpen} onClose={() => setDeckModalOpen(false)} title="Create new deck">
        <form onSubmit={(e) => void handleCreateDeck(e)} className="flex flex-col gap-3">
          <Input
            label="Deck name *"
            placeholder="e.g. Organic Chemistry Terms"
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
            autoFocus
          />
          <Input
            label="Description"
            placeholder="Optional notes about this deck"
            value={newDeckDesc}
            onChange={(e) => setNewDeckDesc(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDeckModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create deck</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default VocabWidget;
