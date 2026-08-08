import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import { useStore } from '@/lib/store';
import { ApiError } from '@/lib/api';
import { Station } from '@/lib/cabinet';
import { usePagination } from '@/hooks/use-pagination';
import DataPagination from '@/components/cabinet/DataPagination';
import { Field, inputCls } from '@/components/cabinet/Field';
import { useConfirm } from '@/components/cabinet/ConfirmDialog';
import {
  SectionHeader,
  AddButton,
  RowAction,
  TableCard,
  Th,
} from '@/components/cabinet/ui';

const empty = (): Station => ({ id: '', name: '', code1c: '', address: '' });

const StationsSection = ({ readOnly = false }: { readOnly?: boolean }) => {
  const { stations, loadingStations, createStation, updateStation, deleteStation } = useStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Station>(empty());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const { confirm, ConfirmDialog } = useConfirm();
  const { page, setPage, pageCount, pageItems } = usePagination(stations);

  const edit = (s: Station) => {
    setDraft({ ...s });
    setFormError('');
    setOpen(true);
  };
  const create = () => {
    setDraft(empty());
    setFormError('');
    setOpen(true);
  };
  const save = async () => {
    if (!draft.name.trim()) return;
    setSaving(true);
    setFormError('');
    try {
      const { id, ...data } = draft;
      if (id) await updateStation(id, data);
      else await createStation(data);
      setOpen(false);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Не удалось сохранить АЗС');
    } finally {
      setSaving(false);
    }
  };
  const remove = async (s: Station) => {
    if (!(await confirm({ description: `Удалить АЗС «${s.name}»?` }))) return;
    try {
      await deleteStation(s.id);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось удалить АЗС');
    }
  };

  return (
    <>
      <SectionHeader
        subtitle="Раздел"
        title="АЗС"
        action={!readOnly && <AddButton label="Новая АЗС" onClick={create} />}
      />
      <TableCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <Th>Наименование</Th>
                <Th>Код 1С</Th>
                <Th>Адрес</Th>
                {!readOnly && <Th right>Действия</Th>}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((s) => (
                <tr key={s.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.code1c}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.address}</td>
                  {!readOnly && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <RowAction icon="Pencil" label="Изменить" onClick={() => edit(s)} />
                        <RowAction icon="Trash2" label="Удалить" danger onClick={() => remove(s)} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                    {loadingStations ? 'Загрузка…' : 'Нет записей'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <DataPagination page={page} pageCount={pageCount} onChange={setPage} />
      </TableCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.id ? 'Изменить АЗС' : 'Новая АЗС'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Наименование">
              <input
                className={inputCls}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="АЗС №1 Центральная"
              />
            </Field>
            <Field label="Код 1С">
              <input
                className={inputCls}
                value={draft.code1c}
                onChange={(e) => setDraft({ ...draft, code1c: e.target.value })}
                placeholder="10-0001"
              />
            </Field>
            <Field label="Адрес">
              <input
                className={inputCls}
                value={draft.address}
                onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                placeholder="г. Санкт-Петербург, Московский пр-т, 15"
              />
            </Field>
            {formError && (
              <p className="flex items-center gap-2 text-sm text-accent">
                <Icon name="TriangleAlert" size={15} /> {formError}
              </p>
            )}
          </div>
          <DialogFooter>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary"
            >
              Отмена
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {ConfirmDialog}
    </>
  );
};

export default StationsSection;