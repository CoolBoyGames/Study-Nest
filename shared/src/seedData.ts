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
