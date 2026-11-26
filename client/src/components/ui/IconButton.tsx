import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
  children: ReactNode;
}

export function IconButton({
  label,
  active = false,
  className = '',
  type = 'button',
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        active
          ? 'bg-[var(--primary)] text-[var(--on-primary)] shadow-[var(--shadow-sm)]'
          : 'text-[var(--text)] hover:bg-[var(--surface-hover)]'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
