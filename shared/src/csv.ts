export interface CsvCardRow {
  word: string;
  meaning: string;
  partOfSpeech: string;
  example: string;
  notes: string;
  tags: string[];
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

export function parseCardsCsv(csvText: string): CsvCardRow[] {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return [];

  const firstCols = parseCsvLine(lines[0] ?? '').map((c) => c.toLowerCase());
  const hasHeader = firstCols.includes('word') && firstCols.includes('meaning');
  const startIdx = hasHeader ? 1 : 0;

  const colIndex = (names: string[], fallback: number): number => {
    if (!hasHeader) return fallback;
    for (const name of names) {
      const idx = firstCols.indexOf(name);
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const wordIdx = colIndex(['word'], 0);
  const meaningIdx = colIndex(['meaning', 'definition'], 1);
  const posIdx = colIndex(['partofspeech', 'part_of_speech', 'pos'], 2);
  const exampleIdx = colIndex(['example', 'sentence'], 3);
  const notesIdx = colIndex(['notes', 'note'], 4);
  const tagsIdx = colIndex(['tags', 'tag'], 5);

  const rows: CsvCardRow[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i] ?? '');
    const word = (wordIdx >= 0 ? cols[wordIdx] : '')?.trim() ?? '';
    const meaning = (meaningIdx >= 0 ? cols[meaningIdx] : '')?.trim() ?? '';
    if (!word || !meaning) continue;

    const tagsRaw = (tagsIdx >= 0 ? cols[tagsIdx] : '') ?? '';
    const tags = tagsRaw
      .split(/[;|]/)
      .map((t) => t.trim())
      .filter(Boolean);

    rows.push({
      word,
      meaning,
      partOfSpeech: (posIdx >= 0 ? cols[posIdx] : '')?.trim() ?? '',
      example: (exampleIdx >= 0 ? cols[exampleIdx] : '')?.trim() ?? '',
      notes: (notesIdx >= 0 ? cols[notesIdx] : '')?.trim() ?? '',
      tags,
    });
  }

  return rows;
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function serializeCardsCsv(cards: CsvCardRow[]): string {
  const header = 'word,meaning,partOfSpeech,example,notes,tags';
  const body = cards.map((c) =>
    [
      escapeCsvCell(c.word),
      escapeCsvCell(c.meaning),
      escapeCsvCell(c.partOfSpeech),
      escapeCsvCell(c.example),
      escapeCsvCell(c.notes),
      escapeCsvCell(c.tags.join('; ')),
    ].join(',')
  );
  return [header, ...body].join('\n');
}
