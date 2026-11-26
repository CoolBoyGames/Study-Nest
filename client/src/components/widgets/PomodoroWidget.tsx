import { useCallback, useEffect, useState } from 'react';
import { Pause, Play, RotateCcw, Settings2, SkipForward, X } from 'lucide-react';
import type { PomodoroPhase } from '@studyspace/shared';
import { toolsApi } from '../../api/tools';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useToastStore } from '../../stores/useToastStore';
import { playSoftChime } from '../../utils/chime';
import { Button, IconButton, Input, ProgressBar, Tabs, Toggle } from '../ui';

const PHASE_TABS: { id: PomodoroPhase; label: string }[] = [
  { id: 'focus', label: 'Focus' },
  { id: 'short-break', label: 'Short' },
  { id: 'long-break', label: 'Long' },
];

export function PomodoroWidget() {
  const settings = useSettingsStore((s) => s.pomodoro);
  const updatePomodoro = useSettingsStore((s) => s.updatePomodoro);
  const activeTask = useSettingsStore((s) => s.activeTask);
  const setActiveTask = useSettingsStore((s) => s.setActiveTask);
  const pushToast = useToastStore((s) => s.push);

  const [phase, setPhase] = useState<PomodoroPhase>('focus');
  const [completedFocusCount, setCompletedFocusCount] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(settings.focusMinutes * 60);
  const [running, setRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');

  const phaseDurationSeconds = useCallback(
    (targetPhase: PomodoroPhase): number => {
      if (targetPhase === 'focus') return settings.focusMinutes * 60;
      if (targetPhase === 'short-break') return settings.shortBreakMinutes * 60;
      return settings.longBreakMinutes * 60;
    },
    [settings.focusMinutes, settings.longBreakMinutes, settings.shortBreakMinutes]
  );

  const switchPhase = useCallback(
    (nextPhase: PomodoroPhase, autoStart: boolean) => {
      setPhase(nextPhase);
      setSecondsLeft(phaseDurationSeconds(nextPhase));
      setRunning(autoStart);
    },
    [phaseDurationSeconds]
  );

  const handlePhaseComplete = useCallback(
    (isSkip = false) => {
      if (!isSkip && settings.soundEnabled) {
        playSoftChime();
      }

      const finishedLabel =
        phase === 'focus'
          ? isSkip
            ? 'Skipped to break.'
            : 'Focus session complete. Time for a break.'
          : isSkip
            ? 'Skipped to focus.'
            : 'Break complete. Ready to focus.';

      setLiveMessage(finishedLabel);
      pushToast(finishedLabel, isSkip ? 'info' : 'success');

      if (
        !isSkip &&
        settings.notificationsEnabled &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        new Notification('StudyNest Timer', { body: finishedLabel });
      }

      if (phase === 'focus') {
        if (!isSkip) {
          void toolsApi
            .logSession(settings.focusMinutes, 'pomodoro', undefined, activeTask?.id ?? null)
            .then(() => {
              window.dispatchEvent(new CustomEvent('studynest:session-logged'));
            })
            .catch(() => {});
        }
        const nextCount = completedFocusCount + 1;
        setCompletedFocusCount(nextCount);
        const nextPhase: PomodoroPhase =
          nextCount % settings.cyclesBeforeLongBreak === 0 ? 'long-break' : 'short-break';
        switchPhase(nextPhase, !isSkip && settings.autoCycle);
      } else {
        switchPhase('focus', !isSkip && settings.autoCycle);
      }
    },
    [
      activeTask?.id,
      completedFocusCount,
      phase,
      pushToast,
      settings.autoCycle,
      settings.cyclesBeforeLongBreak,
      settings.focusMinutes,
      settings.notificationsEnabled,
      settings.soundEnabled,
      switchPhase,
    ]
  );

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          handlePhaseComplete(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [handlePhaseComplete, running]);

  const totalSeconds = Math.max(1, phaseDurationSeconds(phase));
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const handleDurationChange = (
    key: 'focusMinutes' | 'shortBreakMinutes' | 'longBreakMinutes',
    raw: string
  ) => {
    const val = Math.min(120, Math.max(1, Math.round(Number(raw) || 1)));
    updatePomodoro({ [key]: val });
    if (!running) {
      if (
        (key === 'focusMinutes' && phase === 'focus') ||
        (key === 'shortBreakMinutes' && phase === 'short-break') ||
        (key === 'longBreakMinutes' && phase === 'long-break')
      ) {
        setSecondsLeft(val * 60);
      }
    }
  };

  const handleNotificationsToggle = async (checked: boolean) => {
    if (!checked) {
      updatePomodoro({ notificationsEnabled: false });
      return;
    }
    if (typeof Notification === 'undefined') {
      pushToast('Browser notifications are not supported here.', 'warning');
      return;
    }
    if (Notification.permission === 'granted') {
      updatePomodoro({ notificationsEnabled: true });
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      updatePomodoro({ notificationsEnabled: true });
      pushToast('Desktop timer notifications enabled.', 'success');
    } else {
      updatePomodoro({ notificationsEnabled: false });
      pushToast('Notification permission was not granted.', 'warning');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="sr-only" aria-live="polite">
        {liveMessage}
      </div>

      <Tabs
        items={PHASE_TABS}
        value={phase}
        onChange={(next) => switchPhase(next, false)}
        ariaLabel="Timer mode"
      />

      {activeTask && (
        <div className="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs">
          <span className="truncate text-[var(--text)]">
            <strong className="font-medium text-[var(--primary)]">Focus:</strong>{' '}
            {activeTask.title}
          </span>
          <button
            type="button"
            aria-label="Clear focused task"
            onClick={() => setActiveTask(null)}
            className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
          >
            <X size={13} strokeWidth={1.5} />
          </button>
        </div>
      )}

      <div className="flex flex-col items-center gap-2 py-1">
        <div className="tabular-nums font-heading text-[40px] font-semibold leading-none text-[var(--text)]">
          {formatted}
        </div>
        <span className="text-xs text-[var(--text-muted)]">
          Cycle {completedFocusCount % settings.cyclesBeforeLongBreak + (phase === 'focus' ? 1 : 0)}{' '}
          of {settings.cyclesBeforeLongBreak}
        </span>
      </div>

      <ProgressBar value={progress} label="Timer progress" />

      <div className="flex items-center justify-center gap-2">
        <Button onClick={() => setRunning((r) => !r)} className="flex-1">
          {running ? <Pause size={16} strokeWidth={1.5} /> : <Play size={16} strokeWidth={1.5} />}
          {running ? 'Pause' : 'Start'}
        </Button>

        <IconButton
          label="Reset timer"
          onClick={() => {
            setRunning(false);
            setSecondsLeft(phaseDurationSeconds(phase));
          }}
        >
          <RotateCcw size={18} strokeWidth={1.5} />
        </IconButton>

        <IconButton label="Skip to next phase" onClick={() => handlePhaseComplete(true)}>
          <SkipForward size={18} strokeWidth={1.5} />
        </IconButton>

        <IconButton
          label="Timer settings"
          active={showSettings}
          onClick={() => setShowSettings((s) => !s)}
        >
          <Settings2 size={18} strokeWidth={1.5} />
        </IconButton>
      </div>

      {showSettings && (
        <div className="animate-fade-in flex flex-col gap-3 border-t border-[var(--border)] pt-3">
          <div className="grid grid-cols-3 gap-2">
            <Input
              label="Focus (m)"
              type="number"
              min={1}
              max={120}
              value={settings.focusMinutes}
              onChange={(e) => handleDurationChange('focusMinutes', e.target.value)}
            />
            <Input
              label="Short (m)"
              type="number"
              min={1}
              max={60}
              value={settings.shortBreakMinutes}
              onChange={(e) => handleDurationChange('shortBreakMinutes', e.target.value)}
            />
            <Input
              label="Long (m)"
              type="number"
              min={1}
              max={90}
              value={settings.longBreakMinutes}
              onChange={(e) => handleDurationChange('longBreakMinutes', e.target.value)}
            />
          </div>

          <Toggle
            label="Auto-cycle"
            description="Start next break or focus automatically"
            checked={settings.autoCycle}
            onChange={(autoCycle) => updatePomodoro({ autoCycle })}
          />
          <Toggle
            label="Soft chime"
            checked={settings.soundEnabled}
            onChange={(soundEnabled) => updatePomodoro({ soundEnabled })}
          />
          <Toggle
            label="Desktop notification"
            checked={settings.notificationsEnabled}
            onChange={(checked) => void handleNotificationsToggle(checked)}
          />
        </div>
      )}
    </div>
  );
}
