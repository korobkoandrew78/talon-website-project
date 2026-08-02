import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface Props {
  page: number;
  pageCount: number;
  onChange: (page: number) => void;
}

const NavBtn = ({
  onClick,
  disabled,
  icon,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  icon: string;
  label: string;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className={cn(
      'flex h-9 w-9 items-center justify-center rounded-lg border border-border transition-colors',
      disabled
        ? 'cursor-not-allowed text-muted-foreground/40'
        : 'text-foreground hover:bg-secondary',
    )}
  >
    <Icon name={icon} size={16} />
  </button>
);

const DataPagination = ({ page, pageCount, onChange }: Props) => {
  const total = Math.max(pageCount, 1);
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-sm">
      <span className="text-muted-foreground">
        Страница <span className="text-foreground">{page}</span> из {total}
      </span>
      <div className="flex items-center gap-1.5">
        <NavBtn
          onClick={() => onChange(1)}
          disabled={page <= 1}
          icon="ChevronsLeft"
          label="В начало"
        />
        <NavBtn
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          icon="ChevronLeft"
          label="Назад"
        />
        <NavBtn
          onClick={() => onChange(page + 1)}
          disabled={page >= total}
          icon="ChevronRight"
          label="Вперёд"
        />
        <NavBtn
          onClick={() => onChange(total)}
          disabled={page >= total}
          icon="ChevronsRight"
          label="В конец"
        />
      </div>
    </div>
  );
};

export default DataPagination;
