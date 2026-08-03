import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import Icon from '@/components/ui/icon';
import { useStore } from '@/lib/store';
import { OPERATION_LABELS, OperationType, unitShort } from '@/lib/cabinet';
import { inputCls } from '@/components/cabinet/Field';
import { SectionHeader, TableCard, Th } from '@/components/cabinet/ui';

const OPERATIONS: OperationType[] = [
  'topup',
  'refuel',
  'move_out',
  'move_in',
];

const OPERATION_COLORS: Record<OperationType, string> = {
  topup: 'bg-primary/20 text-primary',
  refuel: 'bg-accent/20 text-accent',
  move_out: 'bg-orange-500/15 text-orange-500',
  move_in: 'bg-primary/20 text-primary',
};

// Короткие подписи операций для отображения в таблице (в фильтре и экспорте — полные названия).
const TABLE_OPERATION_LABELS: Partial<Record<OperationType, string>> = {
  move_out: 'Списание',
  move_in: 'Оприходование',
};

const formatDateTime = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface Props {
  clientId?: string; // если задан — журнал только этого клиента (кабинет клиента)
}

const OperationsSection = ({ clientId }: Props) => {
  const { operations, loadingOperations, fetchOperations, clients, fuelTypes, stations } = useStore();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [fClient, setFClient] = useState('');
  const [fFuel, setFFuel] = useState('');
  const [fStation, setFStation] = useState('');
  const [fOperation, setFOperation] = useState('');
  const [fCard, setFCard] = useState('');

  const load = () => {
    fetchOperations({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      clientId: fClient || undefined,
      fuelTypeId: fFuel || undefined,
      stationId: fStation || undefined,
      operation: fOperation || undefined,
      card: fCard.trim() || undefined,
    }).catch(() => {});
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => load();

  const resetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setFClient('');
    setFFuel('');
    setFStation('');
    setFOperation('');
    setFCard('');
    fetchOperations({}).catch(() => {});
  };

  const rows = useMemo(() => operations, [operations]);

  const exportToExcel = () => {
    const data = rows.map((o) => ({
      'Дата/время': formatDateTime(o.createdAt),
      '№ карты': o.cardNumber,
      'Клиент': o.clientName || '—',
      'Топливо': o.fuelName || '—',
      'АЗС': o.stationName || '—',
      'Операция': OPERATION_LABELS[o.operation] ?? o.operation,
      'Кол-во': o.quantity,
      'Цена': o.price,
      'Сумма': o.amount,
      'Комментарий': o.comment,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 18 }, { wch: 10 }, { wch: 24 }, { wch: 12 }, { wch: 20 },
      { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 60 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Операции');
    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `operations_${dateStr}.xlsx`);
  };

  const printJournal = () => {
    window.print();
  };

  return (
    <>
      <div className="print:hidden">
        <SectionHeader
          subtitle="Раздел"
          title="Операции"
          action={
            <div className="flex gap-2">
              <button
                onClick={printJournal}
                className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary"
              >
                <Icon name="Printer" size={16} />
                Печать
              </button>
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-transform hover:-translate-y-0.5"
              >
                <Icon name="FileSpreadsheet" size={16} />
                Экспорт в Excel
              </button>
            </div>
          }
        />

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="mb-1.5 block text-[0.72rem] uppercase tracking-[0.12em] text-muted-foreground">Дата с</span>
            <input type="date" className={inputCls} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <span className="mb-1.5 block text-[0.72rem] uppercase tracking-[0.12em] text-muted-foreground">Дата по</span>
            <input type="date" className={inputCls} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="relative">
            <span className="mb-1.5 block text-[0.72rem] uppercase tracking-[0.12em] text-muted-foreground">Номер карты</span>
            <input className={inputCls} placeholder="0001/1" value={fCard} onChange={(e) => setFCard(e.target.value)} />
          </div>
          {!clientId && (
            <div>
              <span className="mb-1.5 block text-[0.72rem] uppercase tracking-[0.12em] text-muted-foreground">Клиент</span>
              <select className={inputCls} value={fClient} onChange={(e) => setFClient(e.target.value)}>
                <option value="">Все клиенты</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <span className="mb-1.5 block text-[0.72rem] uppercase tracking-[0.12em] text-muted-foreground">Вид топлива</span>
            <select className={inputCls} value={fFuel} onChange={(e) => setFFuel(e.target.value)}>
              <option value="">Все виды топлива</option>
              {fuelTypes.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="mb-1.5 block text-[0.72rem] uppercase tracking-[0.12em] text-muted-foreground">АЗС</span>
            <select className={inputCls} value={fStation} onChange={(e) => setFStation(e.target.value)}>
              <option value="">Все АЗС</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="mb-1.5 block text-[0.72rem] uppercase tracking-[0.12em] text-muted-foreground">Тип операции</span>
            <select className={inputCls} value={fOperation} onChange={(e) => setFOperation(e.target.value)}>
              <option value="">Все операции</option>
              {OPERATIONS.map((o) => (
                <option key={o} value={o}>{OPERATION_LABELS[o]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={applyFilters}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Icon name="Filter" size={15} />
              Применить
            </button>
            <button
              onClick={resetFilters}
              className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-secondary"
            >
              <Icon name="X" size={15} />
            </button>
          </div>
        </div>
      </div>

      <div id="print-journal">
        <h2 className="mb-4 hidden font-head text-xl font-medium print:block">Журнал операций по топливным картам</h2>
        <TableCard className="print:border-0 print:rounded-none">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed whitespace-nowrap text-sm">
              <colgroup>
                <col className="w-[112px]" />
                <col className="w-[68px]" />
                {!clientId && <col className="w-[140px]" />}
                <col className="w-[76px]" />
                <col className="w-[140px]" />
                <col className="w-[108px]" />
                <col className="w-[90px]" />
                <col className="w-[76px]" />
                <col className="w-[90px]" />
                <col />
              </colgroup>
              <thead>
                <tr className="border-b border-border text-left">
                  <Th className="px-3 py-2">Дата/время</Th>
                  <Th className="px-3 py-2">№ карты</Th>
                  {!clientId && <Th className="px-3 py-2">Клиент</Th>}
                  <Th className="px-3 py-2">Топливо</Th>
                  <Th className="px-3 py-2">АЗС</Th>
                  <Th className="px-3 py-2">Операция</Th>
                  <Th className="px-3 py-2">Кол-во</Th>
                  <Th className="px-3 py-2">Цена</Th>
                  <Th className="px-3 py-2">Сумма</Th>
                  <Th className="px-3 py-2">Комментарий</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const unit = unitShort(fuelTypes.find((f) => f.id === o.fuelTypeId)?.unit ?? 'литр');
                  return (
                    <tr key={o.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                      <td className="px-3 py-2 text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</td>
                      <td className="px-3 py-2 font-medium">{o.cardNumber || '—'}</td>
                      {!clientId && <td className="truncate px-3 py-2 text-muted-foreground" title={o.clientName}>{o.clientName || '—'}</td>}
                      <td className="truncate px-3 py-2 text-muted-foreground">{o.fuelName || '—'}</td>
                      <td className="truncate px-3 py-2 text-muted-foreground" title={o.stationName}>{o.stationName || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${OPERATION_COLORS[o.operation] ?? 'bg-secondary'}`}>
                          {TABLE_OPERATION_LABELS[o.operation] ?? OPERATION_LABELS[o.operation] ?? o.operation}
                        </span>
                      </td>
                      <td className="px-3 py-2">{o.quantity ? `${o.quantity.toLocaleString('ru-RU', { minimumFractionDigits: 3 })} ${unit}` : '—'}</td>
                      <td className="px-3 py-2 text-muted-foreground">{o.price ? o.price.toLocaleString('ru-RU') : '—'}</td>
                      <td className="px-3 py-2">{o.amount ? `${o.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽` : '—'}</td>
                      <td className="truncate whitespace-nowrap px-3 py-2 text-muted-foreground" title={o.comment}>{o.comment}</td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={clientId ? 9 : 10} className="px-4 py-10 text-center text-muted-foreground">
                      {loadingOperations ? 'Загрузка…' : 'Нет операций'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TableCard>
      </div>
    </>
  );
};

export default OperationsSection;