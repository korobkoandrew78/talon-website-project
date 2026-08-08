import { useCallback, useState, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import Icon from '@/components/ui/icon';

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

// Хук для показа красивого модального подтверждения (по центру, да/нет)
// перед опасными действиями (удаление и т.п.).
// Использование: const { confirm, ConfirmDialog } = useConfirm();
// await confirm({ description: 'Удалить клиента «ООО Ромашка»?' }) → true/false
export const useConfirm = () => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({});
  const resolver = useRef<(v: boolean) => void>();

  const confirm = useCallback((opts: ConfirmOptions = {}) => {
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const handle = (value: boolean) => {
    setOpen(false);
    resolver.current?.(value);
  };

  const ConfirmDialogEl = (
    <AlertDialog open={open} onOpenChange={(o) => !o && handle(false)}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Icon name="TriangleAlert" size={22} />
          </div>
          <AlertDialogTitle className="text-center">
            {options.title ?? 'Подтвердите действие'}
          </AlertDialogTitle>
          {options.description && (
            <AlertDialogDescription className="text-center">
              {options.description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center">
          <button
            onClick={() => handle(false)}
            className="rounded-full border border-border px-5 py-2 text-sm hover:bg-secondary"
          >
            {options.cancelLabel ?? 'Нет'}
          </button>
          <button
            onClick={() => handle(true)}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition-transform hover:-translate-y-0.5"
          >
            {options.confirmLabel ?? 'Да'}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, ConfirmDialog: ConfirmDialogEl };
};
