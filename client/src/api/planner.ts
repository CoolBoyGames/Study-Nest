import type {
  Course,
  SemesterSettings,
  TimetableEvent,
  TimetableEventType,
  TimetableRepeat,
} from '@studyspace/shared';
import { apiFetch } from './client';
import { isStaticMode, staticPlannerStore } from './staticStore';

export interface CoursePayload {
  name: string;
  code: string;
  color: string;
  instructor: string;
  room: string;
}

export interface EventPayload {
  courseId: string | null;
  title: string;
  type: TimetableEventType;
  dayOfWeek: number;
  start: string;
  end: string;
  location: string;
  repeat: TimetableRepeat;
  date: string | null;
  notes: string;
}

export const plannerApi = {
  listCourses: async () =>
    isStaticMode() ? staticPlannerStore.listCourses() : apiFetch<Course[]>('/api/courses'),

  createCourse: async (payload: CoursePayload) =>
    isStaticMode()
      ? staticPlannerStore.createCourse(payload)
      : apiFetch<Course>('/api/courses', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),

  updateCourse: async (id: string, patch: Partial<CoursePayload>) =>
    isStaticMode()
      ? staticPlannerStore.updateCourse(id, patch)
      : apiFetch<Course>(`/api/courses/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        }),

  deleteCourse: async (id: string) =>
    isStaticMode()
      ? staticPlannerStore.deleteCourse(id)
      : apiFetch<void>(`/api/courses/${id}`, { method: 'DELETE' }),

  listEvents: async () =>
    isStaticMode() ? staticPlannerStore.listEvents() : apiFetch<TimetableEvent[]>('/api/events'),

  createEvent: async (payload: EventPayload) =>
    isStaticMode()
      ? staticPlannerStore.createEvent(payload)
      : apiFetch<TimetableEvent>('/api/events', {
          method: 'POST',
          body: JSON.stringify(payload),
        }),

  updateEvent: async (id: string, patch: Partial<EventPayload>) =>
    isStaticMode()
      ? staticPlannerStore.updateEvent(id, patch)
      : apiFetch<TimetableEvent>(`/api/events/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        }),

  deleteEvent: async (id: string) =>
    isStaticMode()
      ? staticPlannerStore.deleteEvent(id)
      : apiFetch<void>(`/api/events/${id}`, { method: 'DELETE' }),

  importIcs: async (ics: string, courseId: string | null = null) =>
    isStaticMode()
      ? staticPlannerStore.importIcs(ics, courseId)
      : apiFetch<{ imported: number; events: TimetableEvent[] }>('/api/events/import-ics', {
          method: 'POST',
          body: JSON.stringify({ ics, courseId }),
        }),

  downloadIcs: async (semester: Pick<SemesterSettings, 'startDate' | 'endDate'>) => {
    let text: string;
    if (isStaticMode()) {
      text = staticPlannerStore.exportIcs(semester);
    } else {
      const qs = `?startDate=${encodeURIComponent(semester.startDate)}&endDate=${encodeURIComponent(semester.endDate)}`;
      const res = await fetch(`/api/events/export.ics${qs}`);
      if (!res.ok) throw new Error('ICS export failed');
      text = await res.text();
    }
    const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'studynest-timetable.ics';
    a.click();
    URL.revokeObjectURL(url);
  },
};
