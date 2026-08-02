import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useStore } from '@/lib/store';
import { FuelType, Unit, uid } from '@/lib/cabinet';
import { usePagination } from '@/hooks/use-pagination';
import DataPagination from '@/components/cabinet/DataPagination';
import { Field, inputCls } from '@/components/cabinet/Field';
import {
  SectionHeader,
  AddButton,
  RowAction,
  TableCard,
  Th,
} from '@/components/cabinet/ui';

const UNITS: Unit[] = ['литр', 'шт', 'руб'];
const empty = (): FuelType => ({ id: '', name: '', code1c: '', price: 0, unit: 'литр' });

const FuelTypesSection = ({ readOnly = false }: { readOnly?: boolean }) => {
  const { fuelTypes, setFuelTypes } = useStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FuelType>(empty());
  const { page, setPage, pageCount, pageItems } = usePagination(fuelTypes);

  const edit = (f: FuelType) => {
    setDraft({ ...f });
    setOpen(true);
  };
  const create = () => {
    setDraft(empty());
    setOpen(true);
  };
  const save = () => {
    if (!draft.name.trim()) return;
    if (draft.id) {
      setFuelTypes((p) => p.map((f) => (f.id === draft.id ? draft : f)));
    } else {
      setFuelTypes((p) => [...p, { ...draft, id: uid('f') }]);
    }
    setOpen(false);
  };
  const remove = (id: string) => setFuelTypes((p) => p.filter((f) => f.id !== id));

  return (
    <>
      <SectionHeader
        subtitle="Раздел"
        title="Виды топлива"
        action={!readOnly && <AddButton label="Новый вид" onClick={create} />}
      />
      <TableCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <Th>Наименование</Th>
                <Th>Код 1С</Th>
                <Th>Текущая цена</Th>
                <Th>Ед. изм.</Th>
                {!readOnly && <Th right>Действия</Th>}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((f) => (
                <tr key={f.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                  <td className="px-4 py-3 font-medium">{f.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{f.code1c}</td>
                  <td className="px-4 py-3">{f.price.toLocaleString('ru-RU')} ₽</td>
                  <td className="px-4 py-3 text-muted-foreground">{f.unit}</td>
                  {!readOnly && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <RowAction icon="Pencil" label="Изменить" onClick={() => edit(f)} />
                        <RowAction icon="Trash2" label="Удалить" danger onClick={() => remove(f.id)} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    Нет записей
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
            <DialogTitle>{draft.id ? 'Изменить вид топлива' : 'Новый вид топлива'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Наименование">
              <input
                className={inputCls}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="АИ-95"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Код 1С">
                <input
                  className={inputCls}
                  value={draft.code1c}
                  onChange={(e) => setDraft({ ...draft, code1c: e.target.value })}
                  placeholder="00-0001"
                />
              </Field>
              <Field label="Текущая цена">
                <input
                  type="number"
                  className={inputCls}
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
                />
              </Field>
            </div>
            <Field label="Единица измерения">
              <div className="flex gap-2">
                {UNITS.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setDraft({ ...draft, unit: u })}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-colors ${
                      draft.unit === u
                        ? 'border-primary bg-primary/10'
                        : 'border-border text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </Field>
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
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground"
            >
              Сохранить
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FuelTypesSection;
