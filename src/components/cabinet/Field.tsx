import { ReactNode } from 'react';
import { Switch } from '@/components/ui/switch';

export const Field = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <label className="block">
    <span className="mb-1.5 block text-[0.72rem] uppercase tracking-[0.12em] text-muted-foreground">
      {label}
    </span>
    {children}
  </label>
);

export const inputCls =
  'w-full rounded-xl border border-transparent bg-secondary px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary';

export const SwitchRow = ({
  label,
  checked,
  onChange,
  bare,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  bare?: boolean;
}) => (
  <div
    className={
      bare
        ? 'flex flex-1 items-center justify-between gap-2'
        : 'flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5'
    }
  >
    <span className="text-sm">{label}</span>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);