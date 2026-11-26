import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Z_MODAL } from '../../constants/zIndex';
import { IconButton } from './IconButton';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidthClass?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  maxWidthClass = 'max-w-lg',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{ zIndex: Z_MODAL }}
      className="fixed inset-0 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`glass-panel animate-fade-in flex max-h-[86vh] w-full flex-col p-6 text-[var(--text)] ${maxWidthClass}`}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
          <h2 className="font-heading text-xl font-semibold">{title}</h2>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={20} strokeWidth={1.5} />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">{children}</div>
      </div>
    </div>
  );
}
