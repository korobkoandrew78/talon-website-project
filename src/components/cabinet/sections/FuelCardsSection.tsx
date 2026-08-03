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
  unitShort,
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

type Mode = 'create' | 'edit' | 'topup' | 'move' | 'block' | 'limit' | null;

const emptyCard = (): FuelCard => ({
  id: '',
  code: '',
  index: 1,
  fuelTypeId: '',
  clientId: '',
  balance: 0,
  price: 0,
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
  const isClientMode = !!clientId;
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
    updateFuelCardLimit,
  } = useStore();

  const [mode, setMode] = useState<Mode>(null);
  const [draft, setDraft] = useState<FuelCard>(emptyCard());
  const [amount, setAmount] = useState(0);
  const [toAmount, setToAmount] = useState(0);
  const [targetId, setTargetId] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [moveConfirmOpen, setMoveConfirmOpen] = useState(false);

  const [fNumber, setFNumber] = useState('');
  const [fClient, setFClient] = useState('');
  const [fFuel, setFFuel] = useState('');

  const fuelName = (id: string) => fuelTypes.find((f) => f.id === id)?.name ?? '—';
  const fuelUnit = (id: string) => unitShort(fuelTypes.find((f) => f.id === id)?.unit ?? 'руб');
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
    setToAmount(0);
    setTargetId('');
    setFormError('');
    setMoveConfirmOpen(false);
    setMode('move');
  };
  const openBlock = (c: FuelCard) => {
    setDraft({ ...c, blockReason: '' });
    setFormError('');
    setMode('block');
  };
  const openLimit = (c: FuelCard) => {
    setDraft({ ...c });
    setFormError('');
    setMode('limit');
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
          price: draft.price,
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
          price: draft.price,
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

  const targetCard = scoped.find((c) => c.id === targetId);
  const isDifferentFuel = !!targetCard && targetCard.fuelTypeId !== draft.fuelTypeId;

  const requestMove = () => {
    setFormError('');
    if (!targetId) {
      setFormError('Выберите карту назначения');
      return;
    }
    if (amount <= 0) {
      setFormError('Укажите количество больше нуля');
      return;
    }
    if (amount > draft.balance) {
      setFormError(`Недостаточно средств на карте: остаток ${draft.balance.toLocaleString('ru-RU')} ${fuelUnit(draft.fuelTypeId)}`);
      return;
    }
    if (isDifferentFuel && toAmount <= 0) {
      setFormError('Укажите количество к получению');
      return;
    }
    setMoveConfirmOpen(true);
  };

  const doMove = async () => {
    setSaving(true);
    setFormError('');
    try {
      await moveFuelCard(draft.id, targetId, amount, isDifferentFuel ? toAmount : undefined);
      setMoveConfirmOpen(false);
      setMode(null);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Не удалось переместить топливо');
      setMoveConfirmOpen(false);
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

  const doLimit = async () => {
    setSaving(true);
    setFormError('');
    try {
      await updateFuelCardLimit(draft.id, draft.dailyLimit);
      setMode(null);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Не удалось изменить лимит');
    } finally {
      setSaving(false);
    }
  };

  const moveTargets = scoped.filter(
    (c) =>
      c.id !== draft.id &&
      c.clientId === draft.clientId &&
      (!isClientMode || c.fuelTypeId === draft.fuelTypeId),
  );

  return (
    <>
      <SectionHeader
        subtitle="Раздел"
        title="Топливные карты"
        action={!readOnly && !isClientMode && <AddButton label="Новая карта" onClick={openCreate} />}
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
                <Th>Цена</Th>
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
                  <td className={`px-4 py-3 ${c.price < 0 ? 'text-accent' : c.price > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {c.price.toLocaleString('ru-RU')} ₽
                  </td>
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
                        {isClientMode ? (
                          <RowAction icon="Gauge" label="Изменить дневной лимит" onClick={() => openLimit(c)} />
                        ) : (
                          <>
                            <RowAction icon="Pencil" label="Изменить" onClick={() => openEdit(c)} />
                            <RowAction icon="Plus" label="Пополнить баланс" onClick={() => openTopup(c)} />
                          </>
                        )}
                        <RowAction icon="ArrowLeftRight" label="Переместить топливо" onClick={() => openMove(c)} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">
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
            <Field label="Цена, ₽">
              <input type="number" className={inputCls} value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} />
            </Field>
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
            <DialogTitle className="flex items-center gap-2">
              <Icon name="ArrowLeftRight" size={18} className="text-accent" />
              Перемещение топлива между картами
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-accent/50 bg-accent/5 px-4 py-3">
              <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Карта-источник (списание)</div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-lg font-bold text-accent">{cardNumber(draft)}</span>
                <span className="text-sm text-muted-foreground">{clientName(draft.clientId)}</span>
                <span className="text-sm font-medium">{fuelName(draft.fuelTypeId)}</span>
                <span className="text-lg font-bold text-primary">
                  {draft.balance.toLocaleString('ru-RU', { minimumFractionDigits: 3 })} {fuelUnit(draft.fuelTypeId)}
                </span>
              </div>
            </div>
            <Field label="Карта-назначение (оприходование)">
              <select
                className={inputCls}
                value={targetId}
                onChange={(e) => {
                  setTargetId(e.target.value);
                  setToAmount(0);
                }}
              >
                <option value="">Выберите карту назначения</option>
                {moveTargets.map((c) => (
                  <option key={c.id} value={c.id}>{cardNumber(c)} · {clientName(c.clientId)} · {fuelName(c.fuelTypeId)}</option>
                ))}
              </select>
            </Field>
            {isClientMode ? (
              <Field label={`Количество (${fuelName(draft.fuelTypeId)}), ${fuelUnit(draft.fuelTypeId)}`}>
                <input type="number" className={inputCls} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
              </Field>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Field label={`Списать (${fuelName(draft.fuelTypeId)}), ${fuelUnit(draft.fuelTypeId)}`}>
                  <input type="number" className={inputCls} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
                </Field>
                <Field label={`Оприходовать ${targetCard ? `(${fuelName(targetCard.fuelTypeId)})` : ''}, ${targetCard ? fuelUnit(targetCard.fuelTypeId) : ''}`}>
                  <input
                    type="number"
                    className={inputCls}
                    value={isDifferentFuel ? toAmount : amount}
                    disabled={!isDifferentFuel}
                    onChange={(e) => setToAmount(Number(e.target.value))}
                  />
                </Field>
              </div>
            )}
            {formError && mode === 'move' && (
              <p className="flex items-center gap-2 text-sm text-accent">
                <Icon name="TriangleAlert" size={15} /> {formError}
              </p>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setMode(null)} className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">
              <Icon name="X" size={15} /> Отмена
            </button>
            <button
              onClick={requestMove}
              className="flex items-center gap-1.5 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground"
            >
              <Icon name="ArrowRight" size={15} /> Далее
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Подтверждение перемещения */}
      <Dialog open={moveConfirmOpen} onOpenChange={(o) => !o && setMoveConfirmOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="TriangleAlert" size={18} className="text-accent" />
              Подтвердите перемещение
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-xl border border-accent/50 bg-accent/5 px-4 py-3">
              <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Списание с карты</div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-lg font-bold text-accent">{cardNumber(draft)}</span>
                <span className="text-sm text-muted-foreground">{clientName(draft.clientId)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Вид топлива:</span>
                <span className="font-semibold">{fuelName(draft.fuelTypeId)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Объём списания:</span>
                <span className="font-bold text-destructive">
                  −{amount.toLocaleString('ru-RU', { minimumFractionDigits: 3 })} {fuelUnit(draft.fuelTypeId)}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Баланс после:</span>
                <span className="text-muted-foreground">
                  {(draft.balance - amount).toLocaleString('ru-RU', { minimumFractionDigits: 3 })} {fuelUnit(draft.fuelTypeId)}
                </span>
              </div>
            </div>

            <div className="flex justify-center">
              <Icon name="ArrowDown" size={20} className="text-accent" />
            </div>

            {targetCard && (
              <div className="rounded-xl border border-primary/50 bg-primary/5 px-4 py-3">
                <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Оприходование на карту</div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-lg font-bold text-primary">{cardNumber(targetCard)}</span>
                  <span className="text-sm text-muted-foreground">{clientName(targetCard.clientId)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Вид топлива:</span>
                  <span className="font-semibold">{fuelName(targetCard.fuelTypeId)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Объём оприходования:</span>
                  <span className="font-bold text-primary">
                    +{(isDifferentFuel ? toAmount : amount).toLocaleString('ru-RU', { minimumFractionDigits: 3 })} {fuelUnit(targetCard.fuelTypeId)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Баланс после:</span>
                  <span className="text-muted-foreground">
                    {(targetCard.balance + (isDifferentFuel ? toAmount : amount)).toLocaleString('ru-RU', { minimumFractionDigits: 3 })} {fuelUnit(targetCard.fuelTypeId)}
                  </span>
                </div>
              </div>
            )}

            {formError && (
              <p className="flex items-center gap-2 text-sm text-accent">
                <Icon name="TriangleAlert" size={15} /> {formError}
              </p>
            )}
          </div>
          <DialogFooter>
            <button
              onClick={() => setMoveConfirmOpen(false)}
              className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary"
            >
              <Icon name="ChevronLeft" size={15} /> Назад
            </button>
            <button
              onClick={doMove}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="CircleCheck" size={15} /> {saving ? 'Перемещение…' : 'Подтвердить'}
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

      {/* Изменение дневного лимита */}
      <Dialog open={mode === 'limit'} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Дневной лимит · {cardNumber(draft)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label={`Дневной лимит, ${fuelUnit(draft.fuelTypeId)}`}>
              <input
                type="number"
                className={inputCls}
                value={draft.dailyLimit}
                onChange={(e) => setDraft({ ...draft, dailyLimit: Number(e.target.value) })}
              />
            </Field>
            {formError && mode === 'limit' && (
              <p className="flex items-center gap-2 text-sm text-accent">
                <Icon name="TriangleAlert" size={15} /> {formError}
              </p>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setMode(null)} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">Отмена</button>
            <button
              onClick={doLimit}
              disabled={saving}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FuelCardsSection;