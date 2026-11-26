import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline';
  size?: 'sm' | 'md';
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const sizeClasses = size === 'sm' ? 'min-h-9 px-3 text-sm' : 'min-h-10 px-4 text-sm';

  const variantStyle: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-[var(--primary)] text-[var(--on-primary)] hover:bg-[var(--primary-hover)] border border-transparent shadow-[var(--shadow-sm)]',
    ghost:
      'bg-transparent text-[var(--text)] hover:bg-[var(--surface-hover)] border border-transparent',
    outline:
      'bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-hover)] border border-[var(--border-control)]',
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${sizeClasses} ${variantStyle[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
