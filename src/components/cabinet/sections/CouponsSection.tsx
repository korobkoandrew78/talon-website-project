import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import { useStore } from '@/lib/store';
import { ApiError } from '@/lib/api';
import { Coupon, today } from '@/lib/cabinet';
import { usePagination } from '@/hooks/use-pagination';
import DataPagination from '@/components/cabinet/DataPagination';
import { Field, inputCls } from '@/components/cabinet/Field';
import { useConfirm } from '@/components/cabinet/ConfirmDialog';
import { SectionHeader, AddButton, RowAction, TableCard, Th } from '@/components/cabinet/ui';
import { cn } from '@/lib/utils';

const empty = (): Coupon => ({
  id: '',
  number: '',
  fuelTypeId: '',
  clientId: '',
  volume: 0,
  status: 'active',
  issuedAt: today(),
});

const statusLabel = { active: 'Активен', used: 'Использован', blocked: 'Заблокирован' } as const;
const statusCls = {
  active: 'bg-primary/20 text-primary',
  used: 'bg-muted text-muted-foreground',
  blocked: 'bg-accent/20 text-accent',
} as const;

interface Props {
  readOnly?: boolean;
  clientId?: string;
}

const CouponsSection = ({ readOnly = false, clientId }: Props) => {
  const { coupons, loadingCoupons, clients, fuelTypes, createCoupon, updateCoupon, deleteCoupon } = useStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Coupon>(empty());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const { confirm, ConfirmDialog } = useConfirm();

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? '—';
  const fuelName = (id: string) => fuelTypes.find((f) => f.id === id)?.name ?? '—';

  const scoped = useMemo(
    () => (clientId ? coupons.filter((t) => t.clientId === clientId) : coupons),
    [coupons, clientId],
  );
  const { page, setPage, pageCount, pageItems } = usePagination(scoped);

  const create = () => {
    setDraft({
      ...empty(),
      clientId: clientId ?? clients[0]?.id ?? '',
      fuelTypeId: fuelTypes[0]?.id ?? '',
    });
    setFormError('');
    setOpen(true);
  };
  const edit = (t: Coupon) => {
    setDraft({ ...t });
    setFormError('');
    setOpen(true);
  };
  const save = async () => {
    if (!draft.number.trim()) return;
    setSaving(true);
    setFormError('');
    try {
      const { id, ...data } = draft;
      if (id) await updateCoupon(id, data);
      else await createCoupon(data);
      setOpen(false);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Не удалось сохранить талон');
    } finally {
      setSaving(false);
    }
  };
  const remove = async (t: Coupon) => {
    if (!(await confirm({ description: `Удалить талон «${t.number}»?` }))) return;
    try {
      await deleteCoupon(t.id);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось удалить талон');
    }
  };

  return (
    <>
      <SectionHeader
        subtitle="Раздел"
        title="Талоны"
        hideTitle={!!clientId}
        action={!readOnly && <AddButton label="Новый талон" onClick={create} />}
      />
      <TableCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <Th>Номер</Th>
                {!clientId && <Th>Клиент</Th>}
                <Th>Топливо</Th>
                <Th>Объём</Th>
                <Th>Статус</Th>
                <Th>Выдан</Th>
                {!readOnly && <Th right>Действия</Th>}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((t) => (
                <tr key={t.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                  <td className="px-4 py-3 font-medium">{t.number}</td>
                  {!clientId && <td className="px-4 py-3 text-muted-foreground">{clientName(t.clientId)}</td>}
                  <td className="px-4 py-3 text-muted-foreground">{fuelName(t.fuelTypeId)}</td>
                  <td className="px-4 py-3">{t.volume.toLocaleString('ru-RU')}</td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', statusCls[t.status])}>
                      {statusLabel[t.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{t.issuedAt}</td>
                  {!readOnly && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <RowAction icon="Pencil" label="Изменить" onClick={() => edit(t)} />
                        <RowAction icon="Trash2" label="Удалить" danger onClick={() => remove(t)} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    {loadingCoupons ? 'Загрузка…' : 'Нет талонов'}
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
            <DialogTitle>{draft.id ? 'Изменить талон' : 'Новый талон'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Номер талона">
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
              <Field label="Вид топлива">
                <select className={inputCls} value={draft.fuelTypeId} onChange={(e) => setDraft({ ...draft, fuelTypeId: e.target.value })}>
                  {fuelTypes.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Объём">
                <input type="number" className={inputCls} value={draft.volume} onChange={(e) => setDraft({ ...draft, volume: Number(e.target.value) })} />
              </Field>
            </div>
            <Field label="Статус">
              <div className="flex gap-2">
                {(['active', 'used', 'blocked'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setDraft({ ...draft, status: s })}
                    className={cn(
                      'flex-1 rounded-xl border px-3 py-2 text-sm transition-colors',
                      draft.status === s ? 'border-primary bg-primary/10' : 'border-border text-muted-foreground hover:bg-secondary',
                    )}
                  >
                    {statusLabel[s]}
                  </button>
                ))}
              </div>
            </Field>
            {formError && (
              <p className="flex items-center gap-2 text-sm text-accent">
                <Icon name="TriangleAlert" size={15} /> {formError}
              </p>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">Отмена</button>
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

export default CouponsSection;