import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { BarChart3, Flame, Plus } from 'lucide-react';
import type { AnalyticsSummary } from '@studyspace/shared';
import { toolsApi } from '../../api/tools';
import { useT } from '../../i18n';
import { useToastStore } from '../../stores/useToastStore';
import { Button, Input, Skeleton } from '../ui';

function heatLevel(minutes: number): number {
  if (minutes <= 0) return 0;
  if (minutes < 25) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

const HEAT_STYLE: Record<number, string> = {
  0: 'bg-[var(--surface)] border border-[var(--border)]',
  1: 'bg-[var(--primary)]/25',
  2: 'bg-[var(--primary)]/50',
  3: 'bg-[var(--primary)]/75',
  4: 'bg-[var(--primary)]',
};

export function AnalyticsWidget() {
  const { t } = useT();
  const pushToast = useToastStore((s) => s.push);

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [manualMins, setManualMins] = useState('25');

  const fetchSummary = useCallback(async () => {
    try {
      const data = await toolsApi.getAnalyticsSummary(84);
      setSummary(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load analytics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await toolsApi.getAnalyticsSummary(84);
        if (!cancelled) setSummary(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load analytics.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const onSession = () => {
      void fetchSummary();
    };
    window.addEventListener('studynest:session-logged', onSession);
    return () => {
      cancelled = true;
      window.removeEventListener('studynest:session-logged', onSession);
    };
  }, [fetchSummary]);

  const handleLogManual = async (e: FormEvent) => {
    e.preventDefault();
    const mins = Math.min(480, Math.max(1, Math.round(Number(manualMins) || 0)));
    if (!mins) return;
    try {
      await toolsApi.logSession(mins, 'manual');
      pushToast(`Logged ${mins} focus minutes.`, 'success');
      window.dispatchEvent(new CustomEvent('studynest:session-logged'));
    } catch (err) {
      pushToast(err instanceof Error ? err.message : 'Failed to log session.', 'warning');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
        <p className="text-sm text-[var(--text)]">{error || 'No analytics data.'}</p>
        <Button variant="outline" size="sm" onClick={() => void fetchSummary()}>
          Retry
        </Button>
      </div>
    );
  }

  const last14 = summary.days.slice(-14);
  const maxBar = Math.max(30, ...last14.map((d) => d.minutes));
  const totalHours = (summary.totalMinutes / 60).toFixed(1);

  return (
    <div className="flex flex-col gap-4">
      {/* Top metric cards */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <div className="tabular-nums text-lg font-semibold text-[var(--primary)]">
            {summary.todayMinutes}m
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">{t('analytics.today')}</div>
        </div>
        <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <div className="tabular-nums text-lg font-semibold text-[var(--text)]">
            {totalHours}h
          </div>
          <div className="truncate text-[11px] text-[var(--text-muted)]">
            {t('analytics.totalHours')} ({summary.totalSessions})
          </div>
        </div>
        <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-2.5">
          <div className="flex items-center justify-center gap-1 tabular-nums text-lg font-semibold text-[var(--text)]">
            <Flame size={16} strokeWidth={1.5} className="text-[var(--warning)]" />
            {summary.currentStreak}d
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            {t('analytics.streak')} {summary.longestStreak}d
          </div>
        </div>
      </div>

      {/* 14-day focus minutes bar chart */}
      <div className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5 font-medium">
            <BarChart3 size={14} strokeWidth={1.5} />
            {t('analytics.last14')}
          </span>
          <span className="tabular-nums">{summary.dailyGoalMinutes}m</span>
        </div>

        <div
          className="flex h-24 items-end gap-1.5 pt-2"
          role="img"
          aria-label="Focus minutes bar chart for the last 14 days"
        >
          {last14.map((day) => {
            const pct = day.minutes > 0 ? Math.max(8, (day.minutes / maxBar) * 100) : 4;
            return (
              <div
                key={day.date}
                title={`${day.date}: ${day.minutes} min (${day.sessions} sessions)`}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1"
              >
                <div
                  style={{ height: `${pct}%` }}
                  className={`w-full rounded-t-[3px] transition-all duration-200 ${
                    day.minutes > 0 ? 'bg-[var(--primary)]' : 'bg-[var(--surface-hover)]'
                  }`}
                />
                <span className="tabular-nums text-[9px] text-[var(--text-muted)]">
                  {day.date.slice(8)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 12-week (84-day) streak heatmap */}
      <div className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span className="font-medium">{t('analytics.heatmap')}</span>
          <div className="flex items-center gap-1 text-[10px]">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((lvl) => (
              <span key={lvl} className={`inline-block h-2.5 w-2.5 rounded-[2px] ${HEAT_STYLE[lvl]}`} />
            ))}
            <span>More</span>
          </div>
        </div>

        <div
          className="grid grid-flow-col grid-rows-7 gap-1"
          role="img"
          aria-label="84-day study streak heatmap"
        >
          {summary.days.map((day) => {
            const lvl = heatLevel(day.minutes);
            return (
              <div
                key={day.date}
                title={`${day.date}: ${day.minutes} min`}
                className={`h-3.5 w-full rounded-[3px] ${HEAT_STYLE[lvl]}`}
              />
            );
          })}
        </div>
      </div>

      {/* Log manual session */}
      <form onSubmit={(e) => void handleLogManual(e)} className="flex items-end gap-2">
        <div className="flex-1">
          <Input
            label={t('analytics.logManual')}
            type="number"
            min={1}
            max={480}
            value={manualMins}
            onChange={(e) => setManualMins(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline">
          <Plus size={15} strokeWidth={1.5} />
          {t('analytics.logBtn')}
        </Button>
      </form>
    </div>
  );
}

export default AnalyticsWidget;
