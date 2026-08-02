import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useStore } from '@/lib/store';
import { DiscountCard, uid } from '@/lib/cabinet';
import { usePagination } from '@/hooks/use-pagination';
import DataPagination from '@/components/cabinet/DataPagination';
import { Field, inputCls } from '@/components/cabinet/Field';
import { SectionHeader, AddButton, RowAction, TableCard, Th, StatusPill } from '@/components/cabinet/ui';

const empty = (): DiscountCard => ({
  id: '',
  number: '',
  clientId: '',
  discount: 0,
  bonus: 0,
  status: 'active',
});

interface Props {
  readOnly?: boolean;
  clientId?: string;
}

const DiscountCardsSection = ({ readOnly = false, clientId }: Props) => {
  const { discountCards, setDiscountCards, clients } = useStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DiscountCard>(empty());

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? '—';
  const scoped = useMemo(
    () => (clientId ? discountCards.filter((d) => d.clientId === clientId) : discountCards),
    [discountCards, clientId],
  );
  const { page, setPage, pageCount, pageItems } = usePagination(scoped);

  const create = () => {
    setDraft({ ...empty(), clientId: clientId ?? clients[0]?.id ?? '' });
    setOpen(true);
  };
  const edit = (d: DiscountCard) => {
    setDraft({ ...d });
    setOpen(true);
  };
  const save = () => {
    if (!draft.number.trim()) return;
    if (draft.id) setDiscountCards((p) => p.map((d) => (d.id === draft.id ? draft : d)));
    else setDiscountCards((p) => [...p, { ...draft, id: uid('d') }]);
    setOpen(false);
  };
  const remove = (id: string) => setDiscountCards((p) => p.filter((d) => d.id !== id));

  return (
    <>
      <SectionHeader
        subtitle="Раздел"
        title="Дисконтные карты"
        action={!readOnly && <AddButton label="Новая карта" onClick={create} />}
      />
      <TableCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <Th>Номер</Th>
                {!clientId && <Th>Клиент</Th>}
                <Th>Скидка</Th>
                <Th>Бонусы</Th>
                <Th>Статус</Th>
                {!readOnly && <Th right>Действия</Th>}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((d) => (
                <tr key={d.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                  <td className="px-4 py-3 font-medium">{d.number}</td>
                  {!clientId && <td className="px-4 py-3 text-muted-foreground">{clientName(d.clientId)}</td>}
                  <td className="px-4 py-3">{d.discount}%</td>
                  <td className="px-4 py-3">{d.bonus.toLocaleString('ru-RU')}</td>
                  <td className="px-4 py-3"><StatusPill active={d.status === 'active'} on="Активна" off="Заблокирована" /></td>
                  {!readOnly && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <RowAction icon="Pencil" label="Изменить" onClick={() => edit(d)} />
                        <RowAction icon="Trash2" label="Удалить" danger onClick={() => remove(d.id)} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Нет карт</td>
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
            <DialogTitle>{draft.id ? 'Изменить карту' : 'Новая дисконтная карта'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Номер карты">
              <input className={inputCls} value={draft.number} onChange={(e) => setDraft({ ...draft, number: e.target.value })} />
            </Field>
            {!clientId && (
              <Field label="Клиент">
                <select className={inputCls} value={draft.clientId} onChange={(e) => setDraft({ ...draft, clientId: e.target.value })}>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Скидка, %">
                <input type="number" className={inputCls} value={draft.discount} onChange={(e) => setDraft({ ...draft, discount: Number(e.target.value) })} />
              </Field>
              <Field label="Бонусы">
                <input type="number" className={inputCls} value={draft.bonus} onChange={(e) => setDraft({ ...draft, bonus: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="Статус">
              <div className="flex gap-2">
                {(['active', 'blocked'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDraft({ ...draft, status: s })}
                    className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-colors ${
                      draft.status === s ? 'border-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    {s === 'active' ? 'Активна' : 'Заблокирована'}
                  </button>
                ))}
              </div>
            </Field>
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">Отмена</button>
            <button onClick={save} className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground">Сохранить</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DiscountCardsSection;
