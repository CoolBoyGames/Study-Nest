import type {
  AnalyticsSummary,
  DailyGoal,
  ScratchpadNote,
  StudySession,
  TodoItem,
  TodosDayResponse,
} from '@studyspace/shared';
import { apiFetch } from './client';

export const toolsApi = {
  getTodosDay: (date?: string) => {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return apiFetch<TodosDayResponse>(`/api/todos${qs}`);
  },

  createTodo: (title: string, dueDate?: string) =>
    apiFetch<TodoItem>('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ title, dueDate }),
    }),

  updateTodo: (
    id: string,
    patch: { title?: string; completed?: boolean; dueDate?: string; position?: number }
  ) =>
    apiFetch<TodoItem>(`/api/todos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  deleteTodo: (id: string) =>
    apiFetch<void>(`/api/todos/${id}`, {
      method: 'DELETE',
    }),

  updateGoal: (date: string, targetMinutes: number, targetTasks: number) =>
    apiFetch<DailyGoal>(`/api/goals/${encodeURIComponent(date)}`, {
      method: 'PUT',
      body: JSON.stringify({ targetMinutes, targetTasks }),
    }),

  listNotes: () => apiFetch<ScratchpadNote[]>('/api/notes'),

  createNote: (title: string, content = '') =>
    apiFetch<ScratchpadNote>('/api/notes', {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    }),

  saveNote: (id: string, patch: { title?: string; content?: string }) =>
    apiFetch<ScratchpadNote>(`/api/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    }),

  deleteNote: (id: string) =>
    apiFetch<void>(`/api/notes/${id}`, {
      method: 'DELETE',
    }),

  logSession: (durationMinutes: number, source: 'pomodoro' | 'manual' = 'pomodoro', date?: string) =>
    apiFetch<StudySession>('/api/analytics/sessions', {
      method: 'POST',
      body: JSON.stringify({ durationMinutes, source, date }),
    }),

  getAnalyticsSummary: (days = 84) =>
    apiFetch<AnalyticsSummary>(`/api/analytics/summary?days=${days}`),
};
