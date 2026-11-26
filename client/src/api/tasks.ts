import type {
  PlannerTask,
  Subtask,
  TaskPriority,
  TaskRepeat,
  TaskStatus,
  TaskUpdateResponse,
} from '@studyspace/shared';
import { apiFetch } from './client';
import { isStaticMode, staticTasksStore } from './staticStore';

export interface CreateTaskPayload {
  title: string;
  notes?: string;
  dueDate?: string | null;
  priority?: TaskPriority;
  courseId?: string | null;
  status?: TaskStatus;
  repeat?: TaskRepeat;
  subtasks?: string[];
}

export interface UpdateTaskPayload {
  title?: string;
  notes?: string;
  dueDate?: string | null;
  priority?: TaskPriority;
  courseId?: string | null;
  status?: TaskStatus;
  repeat?: TaskRepeat;
  sortOrder?: number;
}

export const tasksApi = {
  listTasks: async () =>
    isStaticMode() ? staticTasksStore.listTasks() : apiFetch<PlannerTask[]>('/api/tasks'),

  createTask: async (payload: CreateTaskPayload) =>
    isStaticMode()
      ? staticTasksStore.createTask(payload)
      : apiFetch<PlannerTask>('/api/tasks', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),

  updateTask: async (id: string, patch: UpdateTaskPayload) =>
    isStaticMode()
      ? staticTasksStore.updateTask(id, patch)
      : apiFetch<TaskUpdateResponse>(`/api/tasks/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        }),

  reorderTasks: async (orderedIds: string[]) =>
    isStaticMode()
      ? staticTasksStore.reorderTasks(orderedIds)
      : apiFetch<void>('/api/tasks/reorder', {
          method: 'POST',
          body: JSON.stringify({ orderedIds }),
        }),

  deleteTask: async (id: string) =>
    isStaticMode()
      ? staticTasksStore.deleteTask(id)
      : apiFetch<void>(`/api/tasks/${id}`, { method: 'DELETE' }),

  addSubtask: async (taskId: string, title: string) =>
    isStaticMode()
      ? staticTasksStore.addSubtask(taskId, title)
      : apiFetch<Subtask>(`/api/tasks/${taskId}/subtasks`, {
          method: 'POST',
          body: JSON.stringify({ title }),
        }),

  updateSubtask: async (id: string, patch: { title?: string; done?: boolean }) =>
    isStaticMode()
      ? staticTasksStore.updateSubtask(id, patch)
      : apiFetch<Subtask>(`/api/subtasks/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        }),

  deleteSubtask: async (id: string) =>
    isStaticMode()
      ? staticTasksStore.deleteSubtask(id)
      : apiFetch<void>(`/api/subtasks/${id}`, { method: 'DELETE' }),
};
