import { X } from 'lucide-react';
import { Z_MODAL } from '../../constants/zIndex';
import { useToastStore, type ToastTone } from '../../stores/useToastStore';

const TONE_BORDER: Record<ToastTone, string> = {
  info: 'border-[var(--primary)]',
  success: 'border-[var(--success)]',
  warning: 'border-[var(--warning)]',
  danger: 'border-[var(--danger)]',
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      style={{ zIndex: Z_MODAL }}
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed right-4 top-4 flex w-full max-w-xs flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`glass-panel animate-fade-in pointer-events-auto flex items-center justify-between gap-3 border-l-4 px-4 py-3 text-sm text-[var(--text)] ${TONE_BORDER[t.tone]}`}
        >
          <span>{t.message}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => dismiss(t.id)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] cursor-pointer"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
      ))}
    </div>
  );
}
