export interface SeedVocabItem {
  word: string;
  meaning: string;
  partOfSpeech: string;
  example: string;
  notes: string;
  tags: string[];
}

export const SAMPLE_DECK_NAME = 'Academic & GRE Core';
export const SAMPLE_DECK_DESCRIPTION =
  'High-utility university vocabulary ready for spaced-repetition review.';

export const SAMPLE_DECK_CARDS: SeedVocabItem[] = [
  {
    word: 'Ephemeral',
    meaning: 'Lasting for a very short time; transitory.',
    partOfSpeech: 'adjective',
    example: 'Morning mist over the campus quad is ephemeral, fading before nine.',
    notes: 'Greek ephemeros ("lasting only a day").',
    tags: ['academic', 'literature'],
  },
  {
    word: 'Ubiquitous',
    meaning: 'Present, appearing, or found everywhere.',
    partOfSpeech: 'adjective',
    example: 'Portable laptops have become ubiquitous in university lecture halls.',
    notes: 'Latin ubique ("everywhere").',
    tags: ['academic', 'gre'],
  },
  {
    word: 'Pragmatic',
    meaning: 'Dealing with things sensibly and realistically in a practical way.',
    partOfSpeech: 'adjective',
    example: 'She took a pragmatic approach to balancing lab work and thesis writing.',
    notes: 'Contrast with idealistic or dogmatic.',
    tags: ['academic', 'philosophy'],
  },
  {
    word: 'Lucid',
    meaning: 'Expressed clearly; easy to understand.',
    partOfSpeech: 'adjective',
    example: 'His lucid explanation of eigenvalues clarified the entire chapter.',
    notes: 'Latin lucidus ("bright, clear").',
    tags: ['writing', 'gre'],
  },
  {
    word: 'Corroborate',
    meaning: 'Confirm or give support to a statement, theory, or finding.',
    partOfSpeech: 'verb',
    example: 'Two independent trials corroborated the initial hypothesis.',
    notes: 'Common in research methodology sections.',
    tags: ['research', 'science'],
  },
  {
    word: 'Mitigate',
    meaning: 'Make less severe, serious, or painful.',
    partOfSpeech: 'verb',
    example: 'Spaced repetition helps mitigate the steep forgetting curve before finals.',
    notes: 'Do not confuse with "militate" (to work against).',
    tags: ['academic', 'gre'],
  },
  {
    word: 'Nuance',
    meaning: 'A subtle difference in or shade of meaning, expression, or sound.',
    partOfSpeech: 'noun',
    example: 'Close reading reveals historical nuances missed in a quick summary.',
    notes: 'French nuer ("to shade").',
    tags: ['humanities', 'writing'],
  },
  {
    word: 'Synthesize',
    meaning: 'Combine a number of things into a coherent whole.',
    partOfSpeech: 'verb',
    example: 'A strong literature review synthesizes competing frameworks.',
    notes: 'Greek synthesis ("putting together").',
    tags: ['research', 'writing'],
  },
  {
    word: 'Disparate',
    meaning: 'Essentially different in kind; not allowing comparison.',
    partOfSpeech: 'adjective',
    example: 'The seminar brought together disparate viewpoints from law and economics.',
    notes: 'Distinct from "desperate".',
    tags: ['academic', 'gre'],
  },
  {
    word: 'Tenacious',
    meaning: 'Tending to keep a firm hold of something; persistent and determined.',
    partOfSpeech: 'adjective',
    example: 'Her tenacious revision routine paid off during qualifying exams.',
    notes: 'Latin tenax ("holding fast").',
    tags: ['gre', 'mindset'],
  },
];

export interface SeedCourseItem {
  key: string;
  name: string;
  code: string;
  color: string;
  instructor: string;
  room: string;
}

export interface SeedEventItem {
  courseKey: string;
  title: string;
  type: 'class' | 'exam' | 'deadline' | 'personal';
  dayOfWeek: number;
  start: string;
  end: string;
  location: string;
  notes: string;
}

export const SAMPLE_COURSES: SeedCourseItem[] = [
  {
    key: 'cs',
    name: 'Data Structures & Algorithms',
    code: 'CS 201',
    color: '#3A6BB5',
    instructor: 'Prof. Elena Vance',
    room: 'Gates 104',
  },
  {
    key: 'math',
    name: 'Linear Algebra',
    code: 'MATH 240',
    color: '#3F7358',
    instructor: 'Dr. Marcus Chen',
    room: 'Euler 210',
  },
  {
    key: 'eng',
    name: 'Academic Writing Seminar',
    code: 'ENG 115',
    color: '#A36818',
    instructor: 'Dr. Clara Hughes',
    room: 'Humanities 302',
  },
  {
    key: 'bio',
    name: 'Cell & Molecular Biology',
    code: 'BIO 105',
    color: '#6E5AA8',
    instructor: 'Prof. Samuel Patel',
    room: 'BioSci 118',
  },
];

export const SAMPLE_WEEKLY_EVENTS: SeedEventItem[] = [
  { courseKey: 'cs', title: 'CS 201 Lecture', type: 'class', dayOfWeek: 1, start: '09:00', end: '10:30', location: 'Gates 104', notes: 'Trees & graphs' },
  { courseKey: 'math', title: 'MATH 240 Lecture', type: 'class', dayOfWeek: 1, start: '13:00', end: '14:30', location: 'Euler 210', notes: 'Eigenvalues' },
  { courseKey: 'eng', title: 'Writing Workshop', type: 'class', dayOfWeek: 2, start: '10:00', end: '11:30', location: 'Humanities 302', notes: 'Peer review' },
  { courseKey: 'bio', title: 'BIO 105 Lecture', type: 'class', dayOfWeek: 2, start: '14:00', end: '15:30', location: 'BioSci 118', notes: 'Membrane transport' },
  { courseKey: 'cs', title: 'CS 201 Lecture', type: 'class', dayOfWeek: 3, start: '09:00', end: '10:30', location: 'Gates 104', notes: 'Shortest paths' },
  { courseKey: 'math', title: 'MATH 240 Recitation', type: 'class', dayOfWeek: 3, start: '15:00', end: '16:00', location: 'Euler 108', notes: 'Problem set Q&A' },
  { courseKey: 'bio', title: 'BIO 105 Lab', type: 'class', dayOfWeek: 4, start: '10:00', end: '12:30', location: 'BioSci Lab B', notes: 'Bring lab notebook' },
  { courseKey: 'eng', title: 'Writing Seminar', type: 'class', dayOfWeek: 4, start: '14:00', end: '15:30', location: 'Humanities 302', notes: 'Thesis drafts' },
  { courseKey: 'cs', title: 'CS 201 Lab', type: 'class', dayOfWeek: 5, start: '11:00', end: '12:30', location: 'Gates Lab 2', notes: 'Heap implementation' },
  { courseKey: 'math', title: 'MATH 240 Lecture', type: 'class', dayOfWeek: 5, start: '13:30', end: '15:00', location: 'Euler 210', notes: 'Orthogonality' },
];

export interface SeedTaskItem {
  title: string;
  notes: string;
  dueOffsetDays: number | null;
  priority: 'low' | 'med' | 'high';
  courseKey: string | null;
  status: 'todo' | 'doing' | 'done';
  repeat: 'none' | 'daily' | 'weekly';
  subtasks: string[];
}

export const SAMPLE_TASKS: SeedTaskItem[] = [
  {
    title: 'Implement Dijkstra priority queue',
    notes: 'Verify O((V + E) log V) edge relaxation',
    dueOffsetDays: 0,
    priority: 'high',
    courseKey: 'cs',
    status: 'doing',
    repeat: 'none',
    subtasks: ['Write min-heap tests', 'Benchmark sparse graph'],
  },
  {
    title: 'Solve Eigenvalues Problem Set 6',
    notes: 'Problems 1–8 from Ch. 5',
    dueOffsetDays: 0,
    priority: 'high',
    courseKey: 'math',
    status: 'todo',
    repeat: 'none',
    subtasks: ['Diagonalize 3x3 matrix', 'Check orthogonal basis'],
  },
  {
    title: 'Revise thesis introduction draft',
    notes: 'Tighten opening claim and cite two primary sources',
    dueOffsetDays: 1,
    priority: 'med',
    courseKey: 'eng',
    status: 'todo',
    repeat: 'none',
    subtasks: [],
  },
  {
    title: 'Prepare BIO 105 lab pre-read',
    notes: 'Review osmosis protocol before Thursday lab',
    dueOffsetDays: 2,
    priority: 'med',
    courseKey: 'bio',
    status: 'todo',
    repeat: 'none',
    subtasks: ['Print worksheet'],
  },
  {
    title: 'Daily 20-card spaced repetition review',
    notes: 'Keep retention streak alive',
    dueOffsetDays: 0,
    priority: 'low',
    courseKey: null,
    status: 'todo',
    repeat: 'daily',
    subtasks: [],
  },
  {
    title: 'Weekly seminar reflection summary',
    notes: '250-word response on Friday',
    dueOffsetDays: 3,
    priority: 'med',
    courseKey: 'eng',
    status: 'todo',
    repeat: 'weekly',
    subtasks: [],
  },
  {
    title: 'Submit late worksheet corrections',
    notes: 'Upload PDF to course portal',
    dueOffsetDays: -1,
    priority: 'high',
    courseKey: 'math',
    status: 'todo',
    repeat: 'none',
    subtasks: [],
  },
  {
    title: 'Review lecture slides on ATP synthase',
    notes: 'Completed earlier this week',
    dueOffsetDays: 0,
    priority: 'low',
    courseKey: 'bio',
    status: 'done',
    repeat: 'none',
    subtasks: [],
  },
];

export interface SeedNoteItem {
  title: string;
  body: string;
  notebookName: string;
  courseKey: string | null;
  pinned: boolean;
  tags: string[];
}

export const NOTE_TEMPLATES: Record<'blank' | 'lecture' | 'cornell' | 'meeting', { label: string; title: string; body: string }> = {
  blank: {
    label: 'Blank',
    title: 'Untitled note',
    body: '',
  },
  lecture: {
    label: 'Lecture',
    title: 'Lecture Notes',
    body: '# Topic\n\n## Key Concepts\n- \n\n## Examples\n\n## Questions to Review\n- [ ] ',
  },
  cornell: {
    label: 'Cornell',
    title: 'Cornell Note',
    body: '# Title\n\n## Cues & Questions\n- \n\n## Detailed Notes\n- \n\n## Summary\n> ',
  },
  meeting: {
    label: 'Meeting',
    title: 'Study Group / Office Hours',
    body: '# Agenda\n- \n\n## Discussion\n\n## Action Items\n- [ ] ',
  },
};

export const SAMPLE_NOTES: SeedNoteItem[] = [
  {
    title: 'Graph Traversal & Dijkstra Notes',
    body: '# Dijkstra Shortest Path\n\n- Greedy relaxation using a **min-priority queue**\n- Requires non-negative edge weights (`w >= 0`)\n\n> Time complexity: `O((V + E) log V)` with binary heap.\n\n- [ ] Review Bellman-Ford for negative edges',
    notebookName: 'Course Lectures',
    courseKey: 'cs',
    pinned: true,
    tags: ['algorithms', 'graphs'],
  },
  {
    title: 'Eigenvalues & Spectral Theorem',
    body: '# Eigenvalues\n\nA vector `v != 0` satisfies `Av = lambda v`.\n\n## Steps\n- Solve `det(A - lambda I) = 0`\n- Find nullspace of `(A - lambda I)`\n\n**Symmetric matrices** always have orthogonal eigenvectors.',
    notebookName: 'Course Lectures',
    courseKey: 'math',
    pinned: false,
    tags: ['linear-algebra', 'exam'],
  },
  {
    title: 'Essay Thesis Checklist',
    body: '# Academic Writing Checklist\n\n- [x] Narrow research question\n- [ ] Corroborate claim with 2 peer-reviewed sources\n- [ ] Check transition clarity between paragraphs',
    notebookName: 'Study Guides',
    courseKey: 'eng',
    pinned: false,
    tags: ['writing'],
  },
];
