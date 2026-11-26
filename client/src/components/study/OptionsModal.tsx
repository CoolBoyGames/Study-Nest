import { useRef, useState } from 'react';
import {
  Check,
  Download,
  Globe,
  RotateCcw,
  Upload,
} from 'lucide-react';
import type { LocaleId } from '@studyspace/shared';
import { notesApi } from '../../api/notes';
import { plannerApi } from '../../api/planner';
import { tasksApi } from '../../api/tasks';
import { toolsApi } from '../../api/tools';
import { vocabApi } from '../../api/vocab';
import { useT } from '../../i18n';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useToastStore } from '../../stores/useToastStore';
import { Button, Modal, Tabs, Toggle } from '../ui';
import { AmbientSoundsWidget } from '../widgets/AmbientSoundsWidget';
import { BackgroundSection, ThemesSection } from '../widgets/AppearanceWidget';
import { ShortcutsSection } from './ShortcutsSection';

export type OptionsTab = 'general' | 'appearance' | 'background' | 'sound' | 'shortcuts' | 'data';

export interface OptionsModalProps {
  open: boolean;
  onClose: () => void;
  initialTab?: OptionsTab;
}

export function OptionsModal({ open, onClose, initialTab = 'general' }: OptionsModalProps) {
  const { t } = useT();
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);
  const focusMode = useSettingsStore((s) => s.focusMode);
  const setFocusMode = useSettingsStore((s) => s.setFocusMode);
  const resetLayout = useSettingsStore((s) => s.resetLayout);
  const pomodoro = useSettingsStore((s) => s.pomodoro);
  const updatePomodoro = useSettingsStore((s) => s.updatePomodoro);
  const getPersistedSnapshot = useSettingsStore((s) => s.getPersistedSnapshot);
  const importPersistedSettings = useSettingsStore((s) => s.importPersistedSettings);
  const resetAllSettings = useSettingsStore((s) => s.resetAllSettings);
  const pushToast = useToastStore((s) => s.push);

  const [tab, setTab] = useState<OptionsTab>(initialTab);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busyData, setBusyData] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const optionTabs: { id: OptionsTab; label: string }[] = [
    { id: 'general', label: t('options.tab.general') },
    { id: 'appearance', label: t('options.tab.appearance') },
    { id: 'background', label: t('options.tab.background') },
    { id: 'sound', label: t('options.tab.sound') },
    { id: 'shortcuts', label: t('options.tab.shortcuts') },
    { id: 'data', label: t('options.tab.data') },
  ];

  const handleExportBackup = async () => {
    setBusyData(true);
    try {
      const [decks, courses, events, tasks, notes, notebooks, analytics] = await Promise.all([
        vocabApi.listDecks(),
        plannerApi.listCourses(),
        plannerApi.listEvents(),
        tasksApi.listTasks(),
        notesApi.listNotes(),
        notesApi.listNotebooks(),
        toolsApi.getAnalyticsSummary(365),
      ]);
      const deckCards = await Promise.all(decks.map((d) => vocabApi.listCards(d.id)));
      const payload = {
        exportedAt: new Date().toISOString(),
        app: 'StudyNest',
        backupVersion: 1,
        settings: getPersistedSnapshot(),
        data: {
          decks,
          cards: deckCards.flat(),
          courses,
          events,
          tasks,
          notes,
          notebooks,
          analytics,
        },
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `studynest-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      pushToast(t('options.data.exportSuccess'), 'success');
    } catch {
      pushToast(t('options.data.importError'), 'warning');
    } finally {
      setBusyData(false);
    }
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    setBusyData(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as {
        settings?: unknown;
        version?: number;
      };
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON');
      }
      if (parsed.settings && typeof parsed.settings === 'object') {
        importPersistedSettings(parsed.settings);
      } else if (typeof parsed.version === 'number') {
        importPersistedSettings(parsed);
      } else {
        throw new Error('Missing settings payload');
      }
      pushToast(t('options.data.importSuccess'), 'success');
    } catch {
      pushToast(t('options.data.importError'), 'warning');
    } finally {
      setBusyData(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const languageOptions: Array<{ id: LocaleId; label: string; nativeHint: string }> = [
    { id: 'en', label: t('options.language.en'), nativeHint: 'en-US' },
    { id: 'vi', label: t('options.language.vi'), nativeHint: 'vi-VN' },
  ];

  return (
    <Modal open={open} onClose={onClose} title={t('options.title')} maxWidthClass="max-w-2xl">
      <div className="flex flex-col gap-4">
        <div className="overflow-x-auto pb-1">
          <Tabs
            items={optionTabs}
            value={tab}
            onChange={(next) => {
              setTab(next);
              setConfirmReset(false);
            }}
            ariaLabel={t('options.tabsAria')}
          />
        </div>

        {tab === 'general' && (
          <div className="flex flex-col gap-5">
            <section className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Globe size={16} strokeWidth={1.5} className="text-[var(--primary)]" />
                <h3 className="text-sm font-semibold text-[var(--text)]">
                  {t('options.language.heading')}
                </h3>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                {t('options.language.description')}
              </p>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('options.language.heading')}>
                {languageOptions.map((opt) => {
                  const selected = locale === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setLocale(opt.id)}
                      className={`flex min-h-12 cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-sm)] border px-3 py-2 text-left transition-colors ${
                        selected
                          ? 'border-[var(--primary)] bg-[var(--surface-hover)] text-[var(--text)]'
                          : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-[var(--text)]">{opt.label}</span>
                        <span className="text-xs text-[var(--text-muted)]">{opt.nativeHint}</span>
                      </div>
                      {selected && <Check size={16} strokeWidth={2} className="text-[var(--primary)]" />}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="flex flex-col gap-3 border-t border-[var(--border)] pt-4">
              <h3 className="text-sm font-semibold text-[var(--text)]">
                {t('options.workspace.heading')}
              </h3>
              <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
                <Toggle
                  label={t('options.workspace.focusMode')}
                  checked={focusMode}
                  onChange={setFocusMode}
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {t('options.workspace.focusModeDesc')}
                </p>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetLayout();
                    pushToast(t('options.workspace.resetLayout'), 'info');
                  }}
                >
                  <RotateCcw size={14} strokeWidth={1.5} />
                  {t('options.workspace.resetLayout')}
                </Button>
              </div>
            </section>
          </div>
        )}

        {tab === 'appearance' && <ThemesSection />}

        {tab === 'background' && <BackgroundSection />}

        {tab === 'sound' && (
          <div className="flex flex-col gap-4">
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-[var(--text)]">
                {t('options.sound.ambientHeading')}
              </h3>
              <AmbientSoundsWidget />
            </section>

            <section className="flex flex-col gap-2 border-t border-[var(--border)] pt-3">
              <h3 className="text-sm font-semibold text-[var(--text)]">
                {t('options.sound.timerHeading')}
              </h3>
              <div className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
                <Toggle
                  label={t('options.sound.chime')}
                  checked={pomodoro.soundEnabled}
                  onChange={(soundEnabled) => updatePomodoro({ soundEnabled })}
                />
                <Toggle
                  label={t('options.sound.notifications')}
                  checked={pomodoro.notificationsEnabled}
                  onChange={(notificationsEnabled) => updatePomodoro({ notificationsEnabled })}
                />
              </div>
            </section>
          </div>
        )}

        {tab === 'shortcuts' && <ShortcutsSection />}

        {tab === 'data' && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[var(--text)]">
                  {t('options.data.exportTitle')}
                </h3>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {t('options.data.exportDesc')}
                </p>
              </div>
              <Button size="sm" disabled={busyData} onClick={() => void handleExportBackup()}>
                <Download size={14} strokeWidth={1.5} />
                {t('options.data.exportBtn')}
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[var(--text)]">
                  {t('options.data.importTitle')}
                </h3>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {t('options.data.importDesc')}
                </p>
              </div>
              <input
                ref={importInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => void handleImportFile(e.target.files?.[0])}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={busyData}
                onClick={() => importInputRef.current?.click()}
              >
                <Upload size={14} strokeWidth={1.5} />
                {t('options.data.importBtn')}
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[var(--text)]">
                  {t('options.data.resetTitle')}
                </h3>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {t('options.data.resetDesc')}
                </p>
              </div>
              {confirmReset ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmReset(false)}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      resetAllSettings();
                      setConfirmReset(false);
                      pushToast(t('options.data.resetSuccess'), 'success');
                    }}
                  >
                    {t('options.data.resetConfirm')}
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)}>
                  <RotateCcw size={14} strokeWidth={1.5} />
                  {t('options.data.resetBtn')}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
