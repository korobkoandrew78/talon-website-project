import { ReactNode } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { SectionKey, SECTIONS, ClientSection, sectionMeta } from '@/lib/cabinet';

// Заголовок раздела с кнопкой создания.
export const SectionHeader = ({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>
      {subtitle && <div className="eyebrow mb-2">{subtitle}</div>}
      <h1 className="font-head text-2xl font-medium tracking-tight md:text-3xl">{title}</h1>
    </div>
    {action}
  </div>
);

export const AddButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-transform hover:-translate-y-0.5"
  >
    <Icon name="Plus" size={16} />
    {label}
  </button>
);

// Иконка-действие в строке таблицы.
export const RowAction = ({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) => (
  <button
    onClick={onClick}
    title={label}
    aria-label={label}
    className={cn(
      'flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-colors',
      danger
        ? 'text-accent hover:bg-accent hover:text-accent-foreground'
        : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
    )}
  >
    <Icon name={icon} size={15} />
  </button>
);

export const TableCard = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('overflow-hidden rounded-2xl border border-border bg-card', className)}>{children}</div>
);

export const Th = ({ children, right }: { children: ReactNode; right?: boolean }) => (
  <th className={cn('px-4 py-3 font-medium text-muted-foreground', right && 'text-right')}>
    {children}
  </th>
);

export const StatusPill = ({ active, on = 'Активен', off = 'Заблокирован' }: {
  active: boolean;
  on?: string;
  off?: string;
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
      active ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent',
    )}
  >
    <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-primary' : 'bg-accent')} />
    {active ? on : off}
  </span>
);

// Набор доступных разделов в виде иконок.
export const SectionIcons = ({ keys }: { keys: (SectionKey | ClientSection)[] }) => {
  if (!keys.length)
    return <span className="text-xs text-muted-foreground/60">—</span>;
  return (
    <div className="flex items-center gap-1.5">
      {keys.map((k) => {
        const meta = sectionMeta(k as SectionKey);
        return (
          <span
            key={k}
            title={meta.label}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-primary"
          >
            <Icon name={meta.icon} size={15} />
          </span>
        );
      })}
    </div>
  );
};

// Чекбоксы выбора разделов в форме.
export const SectionPicker = ({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string; icon: string }[];
  value: string[];
  onChange: (next: string[]) => void;
}) => (
  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
    {options.map((o) => {
      const checked = value.includes(o.key);
      return (
        <button
          type="button"
          key={o.key}
          onClick={() =>
            onChange(checked ? value.filter((v) => v !== o.key) : [...value, o.key])
          }
          className={cn(
            'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-colors',
            checked
              ? 'border-primary bg-primary/10 text-foreground'
              : 'border-border text-muted-foreground hover:bg-secondary',
          )}
        >
          <span
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded-md border',
              checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
            )}
          >
            {checked && <Icon name="Check" size={13} />}
          </span>
          <Icon name={o.icon} size={16} />
          {o.label}
        </button>
      );
    })}
  </div>
);

export const ALL_SECTION_OPTIONS = SECTIONS.map((s) => ({
  key: s.key,
  label: s.label,
  icon: s.icon,
}));