import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { vocabApi } from '../../../api/vocab';
import { Button, Tabs } from '../../ui';

export interface VocabImportExportProps {
  deckId: string;
  deckName: string;
  onImport: (format: 'csv' | 'json', data: string) => Promise<void>;
}

const FORMAT_TABS: { id: 'csv' | 'json'; label: string }[] = [
  { id: 'csv', label: 'CSV' },
  { id: 'json', label: 'JSON' },
];

export function VocabImportExport({ deckId, deckName, onImport }: VocabImportExportProps) {
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [rawText, setRawText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImportClick = async () => {
    if (!rawText.trim()) {
      setError('Paste data or choose a file to import.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onImport(format, rawText);
      setRawText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setRawText(text);
    if (file.name.toLowerCase().endsWith('.json')) {
      setFormat('json');
    } else if (file.name.toLowerCase().endsWith('.csv')) {
      setFormat('csv');
    }
    setError('');
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3">
        <span className="text-xs font-medium text-[var(--text-muted)]">
          Export “{deckName}”
        </span>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={() => void vocabApi.downloadExport(deckId, 'csv')}
          >
            <Download size={15} strokeWidth={1.5} />
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => void vocabApi.downloadExport(deckId, 'json')}
          >
            <Download size={15} strokeWidth={1.5} />
            Export JSON
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-[var(--text-muted)]">
            Import into “{deckName}”
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            className="hidden"
            onChange={(e) => void handleFileChange(e.target.files?.[0])}
          />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload size={14} strokeWidth={1.5} />
            Choose file
          </Button>
        </div>

        <Tabs items={FORMAT_TABS} value={format} onChange={setFormat} ariaLabel="Import format" />

        <textarea
          aria-label="Import data"
          rows={5}
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value);
            if (error) setError('');
          }}
          placeholder={
            format === 'csv'
              ? 'word,meaning,partOfSpeech,example,notes,tags\nCogent,"Clear, logical, and convincing",adjective,"A cogent argument",,academic;gre'
              : '[{"word":"Cogent","meaning":"Clear and convincing","partOfSpeech":"adjective"}]'
          }
          className="w-full rounded-[var(--radius-sm)] border border-[var(--border-control)] bg-[var(--bg)] p-2.5 font-mono text-xs text-[var(--text)] placeholder:text-[var(--text-muted)]"
        />

        {error && (
          <span role="alert" className="text-xs text-[var(--danger)]">
            {error}
          </span>
        )}

        <Button disabled={busy} onClick={() => void handleImportClick()}>
          {busy ? 'Importing…' : `Import ${format.toUpperCase()}`}
        </Button>
      </div>
    </div>
  );
}
