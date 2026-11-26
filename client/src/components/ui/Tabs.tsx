export interface TabItem<T extends string> {
  id: T;
  label: string;
}

export interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel = 'Tabs',
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-1"
    >
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.id)}
            className={`min-h-9 flex-1 rounded-[calc(var(--radius-sm)-2px)] px-3 text-xs font-medium transition-colors duration-150 cursor-pointer ${
              selected
                ? 'bg-[var(--primary)] text-[var(--on-primary)] shadow-[var(--shadow-sm)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
