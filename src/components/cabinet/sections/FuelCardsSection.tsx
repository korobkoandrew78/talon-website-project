import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import { useStore } from '@/lib/store';
import { ApiError } from '@/lib/api';
import {
  FuelCard,
  cardNumber,
  isBalanceCard,
  today,
} from '@/lib/cabinet';
import { usePagination } from '@/hooks/use-pagination';
import DataPagination from '@/components/cabinet/DataPagination';
import { Field, inputCls } from '@/components/cabinet/Field';
import {
  SectionHeader,
  AddButton,
  RowAction,
  TableCard,
  Th,
  StatusPill,
} from '@/components/cabinet/ui';

const INDEXES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

type Mode = 'create' | 'edit' | 'topup' | 'move' | 'block' | null;

const emptyCard = (): FuelCard => ({
  id: '',
  code: '',
  index: 1,
  fuelTypeId: '',
  clientId: '',
  balance: 0,
  status: 'active',
  blockReason: '',
  dailyLimit: 0,
  activatedAt: today(),
  blockedAt: '',
});

interface Props {
  readOnly?: boolean;
  clientId?: string; // если задан — карты только этого клиента (кабинет клиента)
}

const FuelCardsSection = ({ readOnly = false, clientId }: Props) => {
  const {
    fuelCards,
    loadingFuelCards,
    fuelTypes,
    clients,
    createFuelCard,
    updateFuelCard,
    blockFuelCard,
    unblockFuelCard,
    topupFuelCard,
    moveFuelCard,
  } = useStore();

  const [mode, setMode] = useState<Mode>(null);
  const [draft, setDraft] = useState<FuelCard>(emptyCard());
  const [amount, setAmount] = useState(0);
  const [targetId, setTargetId] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [fNumber, setFNumber] = useState('');
  const [fClient, setFClient] = useState('');
  const [fFuel, setFFuel] = useState('');

  const fuelName = (id: string) => fuelTypes.find((f) => f.id === id)?.name ?? '—';
  const fuelUnit = (id: string) => fuelTypes.find((f) => f.id === id)?.unit ?? 'руб';
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? '—';

  const scoped = useMemo(
    () => (clientId ? fuelCards.filter((c) => c.clientId === clientId) : fuelCards),
    [fuelCards, clientId],
  );

  const filtered = useMemo(
    () =>
      scoped.filter(
        (c) =>
          cardNumber(c).includes(fNumber.trim()) &&
          (fClient ? c.clientId === fClient : true) &&
          (fFuel ? c.fuelTypeId === fFuel : true),
      ),
    [scoped, fNumber, fClient, fFuel],
  );
  const { page, setPage, pageCount, pageItems } = usePagination(filtered);

  const openCreate = () => {
    setFormError('');
    setDraft({
      ...emptyCard(),
      clientId: clientId ?? clients[0]?.id ?? '',
      fuelTypeId: fuelTypes[0]?.id ?? '',
    });
    setMode('create');
  };
  const openEdit = (c: FuelCard) => {
    setFormError('');
    setDraft({ ...c });
    setMode('edit');
  };
  const openTopup = (c: FuelCard) => {
    setDraft({ ...c });
    setAmount(0);
    setFormError('');
    setMode('topup');
  };
  const openMove = (c: FuelCard) => {
    setDraft({ ...c });
    setAmount(0);
    setTargetId('');
    setFormError('');
    setMode('move');
  };
  const openBlock = (c: FuelCard) => {
    setDraft({ ...c, blockReason: '' });
    setFormError('');
    setMode('block');
  };

  const duplicate = (code: string, index: number, ignoreId?: string) =>
    scoped.some(
      (c) => c.code === code && c.index === index && c.id !== ignoreId,
    );

  const saveCard = async () => {
    const code = draft.code.padStart(4, '0');
    if (!/^\d{4}$/.test(code)) {
      setFormError('Код карты — четыре цифры (например 0033)');
      return;
    }
    if (duplicate(code, draft.index, draft.id || undefined)) {
      setFormError(`Карта ${code}/${draft.index} уже существует`);
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (mode === 'edit') {
        await updateFuelCard(draft.id, {
          fuel_type_id: draft.fuelTypeId,
          client_id: draft.clientId,
          daily_limit: draft.dailyLimit,
          balance: draft.balance,
          code,
          idx: draft.index,
        });
      } else {
        await createFuelCard({
          code,
          idx: draft.index,
          fuel_type_id: draft.fuelTypeId,
          client_id: draft.clientId,
          daily_limit: draft.dailyLimit,
        });
      }
      setMode(null);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Не удалось сохранить карту');
    } finally {
      setSaving(false);
    }
  };

  const doTopup = async () => {
    setSaving(true);
    setFormError('');
    try {
      await topupFuelCard(draft.id, amount);
      setMode(null);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Не удалось пополнить баланс');
    } finally {
      setSaving(false);
    }
  };

  const doMove = async () => {
    if (!targetId || amount <= 0) return;
    setSaving(true);
    setFormError('');
    try {
      await moveFuelCard(draft.id, targetId, amount);
      setMode(null);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Не удалось переместить топливо');
    } finally {
      setSaving(false);
    }
  };

  const doBlock = async () => {
    setSaving(true);
    setFormError('');
    try {
      await blockFuelCard(draft.id, draft.blockReason);
      setMode(null);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Не удалось заблокировать карту');
    } finally {
      setSaving(false);
    }
  };

  const unblock = async (c: FuelCard) => {
    try {
      await unblockFuelCard(c.id);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось разблокировать карту');
    }
  };

  const moveTargets = scoped.filter(
    (c) => c.id !== draft.id && c.clientId === draft.clientId,
  );

  return (
    <>
      <SectionHeader
        subtitle="Раздел"
        title="Топливные карты"
        action={!readOnly && <AddButton label="Новая карта" onClick={openCreate} />}
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="relative">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className={inputCls + ' pl-9'} placeholder="Номер карты" value={fNumber} onChange={(e) => setFNumber(e.target.value)} />
        </div>
        {!clientId && (
          <select className={inputCls} value={fClient} onChange={(e) => setFClient(e.target.value)}>
            <option value="">Все клиенты</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
        <select className={inputCls} value={fFuel} onChange={(e) => setFFuel(e.target.value)}>
          <option value="">Все виды топлива</option>
          {fuelTypes.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </div>

      <TableCard>
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <Th>Номер</Th>
                {!clientId && <Th>Клиент</Th>}
                <Th>Топливо</Th>
                <Th>Баланс</Th>
                <Th>Лимит/день</Th>
                <Th>Статус</Th>
                <Th>Активация</Th>
                {!readOnly && <Th right>Действия</Th>}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                  <td className="px-4 py-3 font-medium">
                    <span className="flex items-center gap-2">
                      {isBalanceCard(c) && (
                        <span title="Балансная карта" className="text-primary">
                          <Icon name="Wallet" size={16} />
                        </span>
                      )}
                      {cardNumber(c)}
                    </span>
                  </td>
                  {!clientId && <td className="px-4 py-3 text-muted-foreground">{clientName(c.clientId)}</td>}
                  <td className="px-4 py-3 text-muted-foreground">{fuelName(c.fuelTypeId)}</td>
                  <td className="px-4 py-3">{c.balance.toLocaleString('ru-RU')} {fuelUnit(c.fuelTypeId)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.dailyLimit ? `${c.dailyLimit.toLocaleString('ru-RU')} ${fuelUnit(c.fuelTypeId)}` : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusPill active={c.status === 'active'} on="Активна" off="Заблокирована" /></td>
                  <td className="px-4 py-3 text-muted-foreground">{c.activatedAt}</td>
                  {!readOnly && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        {c.status === 'active' ? (
                          <RowAction icon="Lock" label="Заблокировать" onClick={() => openBlock(c)} />
                        ) : (
                          <RowAction icon="LockOpen" label="Разблокировать" onClick={() => unblock(c)} />
                        )}
                        <RowAction icon="Pencil" label="Изменить" onClick={() => openEdit(c)} />
                        <RowAction icon="Plus" label="Пополнить баланс" onClick={() => openTopup(c)} />
                        <RowAction icon="ArrowLeftRight" label="Переместить топливо" onClick={() => openMove(c)} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    {loadingFuelCards ? 'Загрузка…' : 'Нет карт'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <DataPagination page={page} pageCount={pageCount} onChange={setPage} />
      </TableCard>

      {/* Создание / изменение */}
      <Dialog open={mode === 'create' || mode === 'edit'} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{mode === 'edit' ? 'Изменить карту' : 'Новая топливная карта'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Код (4 цифры)">
                <input
                  className={inputCls}
                  maxLength={4}
                  value={draft.code}
                  placeholder="0033"
                  onChange={(e) => setDraft({ ...draft, code: e.target.value.replace(/\D/g, '') })}
                />
              </Field>
              <Field label="Индекс">
                <select
                  className={inputCls}
                  value={draft.index}
                  onChange={(e) => setDraft({ ...draft, index: Number(e.target.value) })}
                >
                  {INDEXES.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              Номер карты: <span className="text-foreground">{(draft.code || '____').padStart(4, '0')}/{draft.index}</span>
              . При создании автоматически появится балансная карта 0000 для клиента (если её ещё нет для этого вида топлива).
            </p>
            {!clientId && (
              <Field label="Клиент">
                <select className={inputCls} value={draft.clientId} onChange={(e) => setDraft({ ...draft, clientId: e.target.value })}>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Вид топлива">
              <select className={inputCls} value={draft.fuelTypeId} onChange={(e) => setDraft({ ...draft, fuelTypeId: e.target.value })}>
                {fuelTypes.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={`Баланс, ${fuelUnit(draft.fuelTypeId)}`}>
                <input type="number" className={inputCls} value={draft.balance} onChange={(e) => setDraft({ ...draft, balance: Number(e.target.value) })} />
              </Field>
              <Field label={`Дневной лимит, ${fuelUnit(draft.fuelTypeId)}`}>
                <input type="number" className={inputCls} value={draft.dailyLimit} onChange={(e) => setDraft({ ...draft, dailyLimit: Number(e.target.value) })} />
              </Field>
            </div>
            {formError && (
              <p className="flex items-center gap-2 text-sm text-accent">
                <Icon name="TriangleAlert" size={15} /> {formError}
              </p>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setMode(null)} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">Отмена</button>
            <button
              onClick={saveCard}
              disabled={saving}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Пополнение */}
      <Dialog open={mode === 'topup'} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Пополнить баланс · {cardNumber(draft)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label={`Сумма пополнения, ${fuelUnit(draft.fuelTypeId)}`}>
              <input type="number" className={inputCls} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </Field>
            {formError && mode === 'topup' && (
              <p className="flex items-center gap-2 text-sm text-accent">
                <Icon name="TriangleAlert" size={15} /> {formError}
              </p>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setMode(null)} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">Отмена</button>
            <button
              onClick={doTopup}
              disabled={saving}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Пополнение…' : 'Пополнить'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Перемещение топлива */}
      <Dialog open={mode === 'move'} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переместить топливо · {cardNumber(draft)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="На карту клиента">
              <select className={inputCls} value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                <option value="">Выберите карту</option>
                {moveTargets.map((c) => (
                  <option key={c.id} value={c.id}>{cardNumber(c)} · {fuelName(c.fuelTypeId)}</option>
                ))}
              </select>
            </Field>
            <Field label={`Сумма, ${fuelUnit(draft.fuelTypeId)}`}>
              <input type="number" className={inputCls} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </Field>
            {formError && mode === 'move' && (
              <p className="flex items-center gap-2 text-sm text-accent">
                <Icon name="TriangleAlert" size={15} /> {formError}
              </p>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setMode(null)} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">Отмена</button>
            <button
              onClick={doMove}
              disabled={saving}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Перемещение…' : 'Переместить'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Блокировка */}
      <Dialog open={mode === 'block'} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Заблокировать карту · {cardNumber(draft)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="Причина блокировки">
              <input className={inputCls} value={draft.blockReason} onChange={(e) => setDraft({ ...draft, blockReason: e.target.value })} placeholder="Укажите причину" />
            </Field>
            {formError && mode === 'block' && (
              <p className="flex items-center gap-2 text-sm text-accent">
                <Icon name="TriangleAlert" size={15} /> {formError}
              </p>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setMode(null)} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">Отмена</button>
            <button
              onClick={doBlock}
              disabled={saving}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Блокировка…' : 'Заблокировать'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FuelCardsSection;