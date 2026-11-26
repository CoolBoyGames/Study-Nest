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

export interface CardPayload {
  word: string;
  meaning: string;
  partOfSpeech: string;
  example: string;
  notes: string;
  tags: string[];
}

export const vocabApi = {
  listDecks: () => apiFetch<DeckWithCounts[]>('/api/decks'),

  createDeck: (name: string, description: string) =>
    apiFetch<DeckWithCounts>('/api/decks', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),

  updateDeck: (id: string, patch: { name?: string; description?: string }) =>
    apiFetch<Deck>(`/api/decks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  deleteDeck: (id: string) =>
    apiFetch<void>(`/api/decks/${id}`, {
      method: 'DELETE',
    }),

  listCards: (deckId: string, search = '') => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiFetch<VocabCard[]>(`/api/decks/${deckId}/cards${qs}`);
  },

  createCard: (deckId: string, payload: CardPayload) =>
    apiFetch<VocabCard>(`/api/decks/${deckId}/cards`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateCard: (cardId: string, payload: Partial<CardPayload>) =>
    apiFetch<VocabCard>(`/api/cards/${cardId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteCard: (cardId: string) =>
    apiFetch<void>(`/api/cards/${cardId}`, {
      method: 'DELETE',
    }),

  getReviewQueue: (deckId?: string) => {
    const qs = deckId ? `?deckId=${encodeURIComponent(deckId)}` : '';
    return apiFetch<VocabCardWithPreviews[]>(`/api/reviews/queue${qs}`);
  },

  submitReview: (cardId: string, rating: ReviewRating) =>
    apiFetch<ReviewSubmissionResponse>(`/api/reviews/${cardId}`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    }),

  getStats: (deckId?: string) => {
    const qs = deckId ? `?deckId=${encodeURIComponent(deckId)}` : '';
    return apiFetch<SrsStats>(`/api/vocab/stats${qs}`);
  },

  importCards: (deckId: string, format: 'csv' | 'json', data: string) =>
    apiFetch<ImportCardsResponse>(`/api/decks/${deckId}/import`, {
      method: 'POST',
      body: JSON.stringify({ format, data }),
    }),

  exportUrl: (deckId: string, format: 'csv' | 'json') =>
    `/api/decks/${deckId}/export?format=${format}`,
};
