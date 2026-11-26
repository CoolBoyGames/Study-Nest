import type {
  Deck,
  DeckWithCounts,
  ImportCardsResponse,
  ReviewRating,
  ReviewSubmissionResponse,
  SrsStats,
  VocabCard,
  VocabCardWithPreviews,
} from '@studyspace/shared';
import { apiFetch } from './client';
import { isStaticMode, staticVocabStore } from './staticStore';

export interface CardPayload {
  word: string;
  meaning: string;
  partOfSpeech: string;
  example: string;
  notes: string;
  tags: string[];
}

export const vocabApi = {
  listDecks: async () =>
    isStaticMode()
      ? staticVocabStore.listDecks()
      : apiFetch<DeckWithCounts[]>('/api/decks'),

  createDeck: async (name: string, description: string) =>
    isStaticMode()
      ? staticVocabStore.createDeck(name, description)
      : apiFetch<DeckWithCounts>('/api/decks', {
          method: 'POST',
          body: JSON.stringify({ name, description }),
        }),

  updateDeck: async (id: string, patch: { name?: string; description?: string }) =>
    isStaticMode()
      ? staticVocabStore.updateDeck(id, patch)
      : apiFetch<Deck>(`/api/decks/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        }),

  deleteDeck: async (id: string) =>
    isStaticMode()
      ? staticVocabStore.deleteDeck(id)
      : apiFetch<void>(`/api/decks/${id}`, {
          method: 'DELETE',
        }),

  listCards: async (deckId: string, search = '') => {
    if (isStaticMode()) {
      return staticVocabStore.listCards(deckId, search);
    }
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiFetch<VocabCard[]>(`/api/decks/${deckId}/cards${qs}`);
  },

  createCard: async (deckId: string, payload: CardPayload) =>
    isStaticMode()
      ? staticVocabStore.createCard(deckId, payload)
      : apiFetch<VocabCard>(`/api/decks/${deckId}/cards`, {
          method: 'POST',
          body: JSON.stringify(payload),
        }),

  updateCard: async (cardId: string, payload: Partial<CardPayload>) =>
    isStaticMode()
      ? staticVocabStore.updateCard(cardId, payload)
      : apiFetch<VocabCard>(`/api/cards/${cardId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        }),

  deleteCard: async (cardId: string) =>
    isStaticMode()
      ? staticVocabStore.deleteCard(cardId)
      : apiFetch<void>(`/api/cards/${cardId}`, {
          method: 'DELETE',
        }),

  getReviewQueue: async (deckId?: string) => {
    if (isStaticMode()) {
      return staticVocabStore.getReviewQueue(deckId);
    }
    const qs = deckId ? `?deckId=${encodeURIComponent(deckId)}` : '';
    return apiFetch<VocabCardWithPreviews[]>(`/api/reviews/queue${qs}`);
  },

  submitReview: async (cardId: string, rating: ReviewRating) =>
    isStaticMode()
      ? staticVocabStore.submitReview(cardId, rating)
      : apiFetch<ReviewSubmissionResponse>(`/api/reviews/${cardId}`, {
          method: 'POST',
          body: JSON.stringify({ rating }),
        }),

  getStats: async (deckId?: string) => {
    if (isStaticMode()) {
      return staticVocabStore.getStats(deckId);
    }
    const qs = deckId ? `?deckId=${encodeURIComponent(deckId)}` : '';
    return apiFetch<SrsStats>(`/api/vocab/stats${qs}`);
  },

  importCards: async (deckId: string, format: 'csv' | 'json', data: string) =>
    isStaticMode()
      ? staticVocabStore.importCards(deckId, format, data)
      : apiFetch<ImportCardsResponse>(`/api/decks/${deckId}/import`, {
          method: 'POST',
          body: JSON.stringify({ format, data }),
        }),

  downloadExport: async (deckId: string, format: 'csv' | 'json') => {
    if (isStaticMode()) {
      const { filename, content, mime } = staticVocabStore.exportCards(deckId, format);
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const res = await fetch(`/api/decks/${deckId}/export?format=${format}`);
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deck.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
