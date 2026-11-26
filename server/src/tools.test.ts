import { describe, expect, it } from 'vitest';
import {
  addDaysIso,
  getTodayIsoDate,
  type AnalyticsSummary,
  type ScratchpadNote,
  type TodoItem,
  type TodosDayResponse,
} from '@studyspace/shared';
import { createDatabase } from './db/connection.js';
import { createApp } from './app.js';

async function withServer(fn: (baseUrl: string) => Promise<void>): Promise<void> {
  const db = createDatabase(':memory:', { seed: false });
  const app = createApp(db);
  const server = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  try {
    const addr = server.address();
    if (!addr || typeof addr === 'string') throw new Error('Invalid port');
    await fn(`http://127.0.0.1:${addr.port}`);
  } finally {
    server.close();
    db.close();
  }
}

describe('supporting tools API (todos, goals, notes, analytics)', () => {
  it('creates, updates, and deletes daily todos and daily goals', async () => {
    await withServer(async (baseUrl) => {
      const today = getTodayIsoDate();

      const createRes = await fetch(`${baseUrl}/api/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Read Linear Algebra Ch. 4', dueDate: today }),
      });
      expect(createRes.status).toBe(201);
      const todo = (await createRes.json()) as TodoItem;
      expect(todo.completed).toBe(false);

      const patchRes = await fetch(`${baseUrl}/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      });
      const updated = (await patchRes.json()) as TodoItem;
      expect(updated.completed).toBe(true);

      const goalRes = await fetch(`${baseUrl}/api/goals/${today}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetMinutes: 90, targetTasks: 3 }),
      });
      expect(goalRes.status).toBe(200);

      const dayRes = await fetch(`${baseUrl}/api/todos?date=${today}`);
      const dayData = (await dayRes.json()) as TodosDayResponse;
      expect(dayData.todos.length).toBe(1);
      expect(dayData.goal.targetMinutes).toBe(90);
      expect(dayData.goal.targetTasks).toBe(3);

      const delRes = await fetch(`${baseUrl}/api/todos/${todo.id}`, { method: 'DELETE' });
      expect(delRes.status).toBe(204);
    });
  });

  it('provides starter scratchpad note and supports autosave updates', async () => {
    await withServer(async (baseUrl) => {
      const listRes = await fetch(`${baseUrl}/api/notes`);
      const notes = (await listRes.json()) as ScratchpadNote[];
      expect(notes.length).toBe(1);

      const note = notes[0]!;
      const saveRes = await fetch(`${baseUrl}/api/notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Physics Notes', content: '# Kinematics\n\n$v = at$' }),
      });
      expect(saveRes.status).toBe(200);
      const saved = (await saveRes.json()) as ScratchpadNote;
      expect(saved.title).toBe('Physics Notes');
    });
  });

  it('aggregates study sessions into daily minutes and streaks', async () => {
    await withServer(async (baseUrl) => {
      const today = getTodayIsoDate();
      const yesterday = addDaysIso(today, -1);

      await fetch(`${baseUrl}/api/analytics/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMinutes: 25, source: 'pomodoro', date: yesterday }),
      });
      await fetch(`${baseUrl}/api/analytics/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationMinutes: 50, source: 'pomodoro', date: today }),
      });

      const sumRes = await fetch(`${baseUrl}/api/analytics/summary?days=14`);
      expect(sumRes.status).toBe(200);
      const summary = (await sumRes.json()) as AnalyticsSummary;
      expect(summary.todayMinutes).toBe(50);
      expect(summary.totalMinutes).toBe(75);
      expect(summary.totalSessions).toBe(2);
      expect(summary.currentStreak).toBe(2);
      expect(summary.longestStreak).toBe(2);
      expect(summary.days.length).toBe(14);
    });
  });
});
