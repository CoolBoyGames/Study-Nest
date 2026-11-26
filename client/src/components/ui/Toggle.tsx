import { useId } from 'react';

export interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}

export function Toggle({ label, checked, onChange, description }: ToggleProps) {
  const id = useId();

  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="flex flex-col">
        <label htmlFor={id} className="text-sm font-medium text-[var(--text)] cursor-pointer">
          {label}
        </label>
        {description && <span className="text-xs text-[var(--text-muted)]">{description}</span>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-[var(--border-control)] transition-colors duration-150 ${
          checked ? 'bg-[var(--primary)]' : 'bg-[var(--surface)]'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full transition-transform duration-150 ${
            checked
              ? 'translate-x-6 bg-[var(--on-primary)]'
              : 'translate-x-1 bg-[var(--text-muted)]'
          }`}
        />
      </button>
    </div>
  );
}
