import type { Notebook, NoteTag, PlannerNote } from '@studyspace/shared';
import { apiFetch } from './client';
import { isStaticMode, staticNotesStore } from './staticStore';

export interface NoteCreatePayload {
  title?: string;
  body?: string;
  notebookId?: string | null;
  courseId?: string | null;
  pinned?: boolean;
  tags?: string[];
}

export type NoteUpdatePayload = NoteCreatePayload;

export interface NotesFilter {
  q?: string;
  notebookId?: string;
  courseId?: string;
  tag?: string;
}

export const notesApi = {
  listNotebooks: async () =>
    isStaticMode() ? staticNotesStore.listNotebooks() : apiFetch<Notebook[]>('/api/notebooks'),

  createNotebook: async (name: string) =>
    isStaticMode()
      ? staticNotesStore.createNotebook(name)
      : apiFetch<Notebook>('/api/notebooks', {
          method: 'POST',
          body: JSON.stringify({ name }),
        }),

  deleteNotebook: async (id: string) =>
    isStaticMode()
      ? staticNotesStore.deleteNotebook(id)
      : apiFetch<void>(`/api/notebooks/${id}`, { method: 'DELETE' }),

  listTags: async () =>
    isStaticMode() ? staticNotesStore.listTags() : apiFetch<NoteTag[]>('/api/tags'),

  listNotes: async (filters: NotesFilter = {}) => {
    if (isStaticMode()) {
      return staticNotesStore.listNotes(filters);
    }
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    if (filters.notebookId) params.set('notebookId', filters.notebookId);
    if (filters.courseId) params.set('courseId', filters.courseId);
    if (filters.tag) params.set('tag', filters.tag);
    const qs = params.toString();
    return apiFetch<PlannerNote[]>(`/api/notes${qs ? `?${qs}` : ''}`);
  },

  createNote: async (payload: NoteCreatePayload) =>
    isStaticMode()
      ? staticNotesStore.createNote(payload)
      : apiFetch<PlannerNote>('/api/notes', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),

  updateNote: async (id: string, patch: NoteUpdatePayload) =>
    isStaticMode()
      ? staticNotesStore.updateNote(id, patch)
      : apiFetch<PlannerNote>(`/api/notes/${id}`, {
          method: 'PUT',
          body: JSON.stringify(patch),
        }),

  deleteNote: async (id: string) =>
    isStaticMode()
      ? staticNotesStore.deleteNote(id)
      : apiFetch<void>(`/api/notes/${id}`, { method: 'DELETE' }),
};
