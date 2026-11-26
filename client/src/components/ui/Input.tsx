import { useId, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id, className = '', ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-[var(--text-muted)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`min-h-10 w-full rounded-[var(--radius-sm)] border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] transition-colors ${
          error ? 'border-[var(--danger)]' : 'border-[var(--border-control)]'
        } ${className}`}
        {...rest}
      />
      {error && (
        <span role="alert" className="text-xs text-[var(--danger)]">
          {error}
        </span>
      )}
    </div>
  );
}
