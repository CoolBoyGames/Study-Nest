export interface ProgressBarProps {
  value: number; // 0 to 100
  label?: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label ?? 'Progress'}
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface)] border border-[var(--border)]"
    >
      <div
        className="h-full rounded-full bg-[var(--primary)] transition-transform duration-200 origin-left"
        style={{ transform: `scaleX(${clamped / 100})` }}
      />
    </div>
  );
}
