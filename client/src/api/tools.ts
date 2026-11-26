import type {
  AnalyticsSummary,
  DailyGoal,
  ScratchpadNote,
  StudySession,
  TodoItem,
  TodosDayResponse,
} from '@studyspace/shared';
import { apiFetch } from './client';
import { isStaticMode, staticToolsStore } from './staticStore';

export const toolsApi = {
  getTodosDay: async (date?: string) => {
    if (isStaticMode()) {
      return staticToolsStore.getTodosDay(date);
    }
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return apiFetch<TodosDayResponse>(`/api/todos${qs}`);
  },

  createTodo: async (title: string, dueDate?: string) =>
    isStaticMode()
      ? staticToolsStore.createTodo(title, dueDate)
      : apiFetch<TodoItem>('/api/todos', {
          method: 'POST',
          body: JSON.stringify({ title, dueDate }),
        }),

  updateTodo: async (
    id: string,
    patch: { title?: string; completed?: boolean; dueDate?: string; position?: number }
  ) =>
    isStaticMode()
      ? staticToolsStore.updateTodo(id, patch)
      : apiFetch<TodoItem>(`/api/todos/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        }),

  deleteTodo: async (id: string) =>
    isStaticMode()
      ? staticToolsStore.deleteTodo(id)
      : apiFetch<void>(`/api/todos/${id}`, {
          method: 'DELETE',
        }),

  updateGoal: async (date: string, targetMinutes: number, targetTasks: number) =>
    isStaticMode()
      ? staticToolsStore.updateGoal(date, targetMinutes, targetTasks)
      : apiFetch<DailyGoal>(`/api/goals/${encodeURIComponent(date)}`, {
          method: 'PUT',
          body: JSON.stringify({ targetMinutes, targetTasks }),
        }),

  listNotes: async () =>
    isStaticMode()
      ? staticToolsStore.listNotes()
      : apiFetch<ScratchpadNote[]>('/api/notes'),

  createNote: async (title: string, content = '') =>
    isStaticMode()
      ? staticToolsStore.createNote(title, content)
      : apiFetch<ScratchpadNote>('/api/notes', {
          method: 'POST',
          body: JSON.stringify({ title, content }),
        }),

  saveNote: async (id: string, patch: { title?: string; content?: string }) =>
    isStaticMode()
      ? staticToolsStore.saveNote(id, patch)
      : apiFetch<ScratchpadNote>(`/api/notes/${id}`, {
          method: 'PUT',
          body: JSON.stringify(patch),
        }),

  deleteNote: async (id: string) =>
    isStaticMode()
      ? staticToolsStore.deleteNote(id)
      : apiFetch<void>(`/api/notes/${id}`, {
          method: 'DELETE',
        }),

  logSession: async (
    durationMinutes: number,
    source: 'pomodoro' | 'manual' = 'pomodoro',
    date?: string
  ) =>
    isStaticMode()
      ? staticToolsStore.logSession(durationMinutes, source, date)
      : apiFetch<StudySession>('/api/analytics/sessions', {
          method: 'POST',
          body: JSON.stringify({ durationMinutes, source, date }),
        }),

  getAnalyticsSummary: async (days = 84) =>
    isStaticMode()
      ? staticToolsStore.getAnalyticsSummary(days)
      : apiFetch<AnalyticsSummary>(`/api/analytics/summary?days=${days}`),
};
