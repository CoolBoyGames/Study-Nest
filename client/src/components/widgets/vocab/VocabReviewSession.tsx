import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, RotateCw } from 'lucide-react';
import type { ReviewRating, SrsStats, VocabCardWithPreviews } from '@studyspace/shared';
import { Button, EmptyState, ProgressBar } from '../../ui';

export interface VocabReviewSessionProps {
  queue: VocabCardWithPreviews[];
  stats: SrsStats | null;
  onRate: (cardId: string, rating: ReviewRating) => Promise<void>;
  onRefresh: () => void;
  onAddCard: () => void;
}

interface SessionSummary {
  reviewed: number;
  passed: number;
}

const RATING_OPTIONS: Array<{ rating: ReviewRating; label: string; keyHint: string }> = [
  { rating: 1, label: 'Again', keyHint: '1' },
  { rating: 2, label: 'Hard', keyHint: '2' },
  { rating: 3, label: 'Good', keyHint: '3' },
  { rating: 4, label: 'Easy', keyHint: '4' },
];

function formatInterval(days: number): string {
  if (days <= 1) return '1d';
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  return `${months}mo`;
}

export function VocabReviewSession({
  queue,
  stats,
  onRate,
  onRefresh,
  onAddCard,
}: VocabReviewSessionProps) {
  const [flippedCardId, setFlippedCardId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<SessionSummary>({ reviewed: 0, passed: 0 });

  const currentCard = queue[0];
  const flipped = Boolean(currentCard && flippedCardId === currentCard.id);

  const toggleFlip = useCallback(() => {
    if (!currentCard) return;
    setFlippedCardId((prev) => (prev === currentCard.id ? null : currentCard.id));
  }, [currentCard]);

  const handleRate = useCallback(
    async (rating: ReviewRating) => {
      if (!currentCard || submitting) return;
      setSubmitting(true);
      try {
        await onRate(currentCard.id, rating);
        setSummary((s) => ({
          reviewed: s.reviewed + 1,
          passed: s.passed + (rating >= 2 ? 1 : 0),
        }));
        setFlippedCardId(null);
      } finally {
        setSubmitting(false);
      }
    },
    [currentCard, onRate, submitting]
  );

  // Keyboard shortcuts: Space to flip, 1-4 to rate
  useEffect(() => {
    if (!currentCard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (document.querySelector('[role="dialog"]')) return;

      if (e.code === 'Space') {
        e.preventDefault();
        toggleFlip();
      } else if (flipped && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        const rating = Number(e.key) as ReviewRating;
        void handleRate(rating);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCard, flipped, handleRate, toggleFlip]);

  if (!currentCard && summary.reviewed > 0) {
    const accuracy = Math.round((summary.passed / summary.reviewed) * 100);
    return (
      <div className="animate-fade-in flex flex-col items-center gap-4 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-5 text-center">
        <CheckCircle2 size={28} strokeWidth={1.5} className="text-[var(--success)]" />
        <div>
          <h3 className="font-heading text-lg font-semibold text-[var(--text)]">
            Session complete
          </h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            All due cards in this view are scheduled for later.
          </p>
        </div>

        <div className="grid w-full grid-cols-3 gap-2 text-center">
          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] p-2">
            <div className="tabular-nums text-lg font-semibold text-[var(--text)]">
              {summary.reviewed}
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">Reviewed</div>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] p-2">
            <div className="tabular-nums text-lg font-semibold text-[var(--text)]">
              {accuracy}%
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">Accuracy</div>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] p-2">
            <div className="tabular-nums text-lg font-semibold text-[var(--text)]">
              {stats?.reviewStreak ?? 1}d
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">Streak</div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSummary({ reviewed: 0, passed: 0 });
              onRefresh();
            }}
          >
            <RotateCw size={14} strokeWidth={1.5} />
            Check queue
          </Button>
          <Button size="sm" onClick={onAddCard}>
            Add new cards
          </Button>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <EmptyState
        icon={<CheckCircle2 size={24} strokeWidth={1.5} />}
        message="You are all caught up for today."
        actionLabel="Add a card"
        onAction={onAddCard}
      />
    );
  }

  const done = summary.reviewed;
  const total = queue.length + done;
  const pct = total > 0 ? (done / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span className="tabular-nums">{queue.length} due left</span>
        <span className="tabular-nums">
          {done} / {total} reviewed
        </span>
      </div>
      <ProgressBar value={pct} label="Review session progress" />

      <button
        type="button"
        onClick={toggleFlip}
        aria-label={flipped ? 'Hide card answer' : 'Reveal card answer'}
        className="flex min-h-48 w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-5 text-center transition-transform duration-150 hover:border-[var(--primary)]"
      >
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {currentCard.partOfSpeech && (
            <span className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-muted)]">
              {currentCard.partOfSpeech}
            </span>
          )}
          {currentCard.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[var(--surface-hover)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]"
            >
              #{tag}
            </span>
          ))}
        </div>

        <div className="font-heading text-[28px] font-semibold leading-tight text-[var(--text)]">
          {currentCard.word}
        </div>

        {flipped ? (
          <div className="animate-fade-in flex w-full flex-col gap-2 border-t border-[var(--border)] pt-3">
            <p className="text-base font-medium text-[var(--text)]">{currentCard.meaning}</p>
            {currentCard.example && (
              <p className="text-sm italic text-[var(--text-muted)]">“{currentCard.example}”</p>
            )}
            {currentCard.notes && (
              <p className="text-xs text-[var(--text-muted)]">Note: {currentCard.notes}</p>
            )}
          </div>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">
            Press <kbd className="rounded border border-[var(--border-control)] px-1.5 py-0.5 font-mono text-[11px]">Space</kbd> or click to reveal
          </span>
        )}
      </button>

      {flipped ? (
        <div className="grid grid-cols-4 gap-2" role="group" aria-label="Review rating">
          {RATING_OPTIONS.map((opt) => {
            const days = currentCard.previews[opt.rating];
            const isAgain = opt.rating === 1;
            const isGood = opt.rating === 3;
            return (
              <button
                key={opt.rating}
                type="button"
                disabled={submitting}
                onClick={() => void handleRate(opt.rating)}
                className={`flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-[var(--radius-sm)] border px-2 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                  isAgain
                    ? 'border-[var(--warning)] bg-[var(--surface)] text-[var(--warning)] hover:bg-[var(--surface-hover)]'
                    : isGood
                      ? 'border-transparent bg-[var(--primary)] text-[var(--on-primary)] hover:bg-[var(--primary-hover)]'
                      : 'border-[var(--border-control)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <span>
                  {opt.keyHint} · {opt.label}
                </span>
                <span className="tabular-nums text-[11px] opacity-85">
                  {formatInterval(days)}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <Button onClick={toggleFlip} className="w-full">
          Show answer (Space)
        </Button>
      )}
    </div>
  );
}
