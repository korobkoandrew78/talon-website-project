import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import Icon from '@/components/ui/icon';
import { useStore } from '@/lib/store';
import { unitShort } from '@/lib/cabinet';
import { Field, inputCls } from '@/components/cabinet/Field';
import { SectionHeader, TableCard, Th } from '@/components/cabinet/ui';

type ReportMode = 'sales' | 'turnover' | null;

interface FuelRow {
  fuelTypeId: string;
  fuelName: string;
  unit: string;
  openQty: number;
  inQty: number;
  outQty: number;
  closeQty: number;
  openSum: number;
  inSum: number;
  outSum: number;
  closeSum: number;
}

const formatNum = (n: number, digits = 3) =>
  n.toLocaleString('ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const ReportsSection = () => {
  const { clients, fuelTypes, fetchOperations } = useStore();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [fClient, setFClient] = useState('');

  const [mode, setMode] = useState<ReportMode>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<FuelRow[]>([]);
  const [reportError, setReportError] = useState('');

  const clientName = useMemo(
    () => clients.find((c) => c.id === fClient)?.name ?? '',
    [clients, fClient],
  );

  const fuelUnit = (id: string) => unitShort(fuelTypes.find((f) => f.id === id)?.unit ?? 'литр');
  const fuelName = (id: string) => fuelTypes.find((f) => f.id === id)?.name ?? '—';

  const buildSales = async () => {
    if (!fClient) {
      setReportError('Выберите контрагента');
      return;
    }
    setReportError('');
    setLoading(true);
    setMode('sales');
    try {
      const ops = await fetchOperations({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        clientId: fClient,
        operation: 'refuel',
      });

      const map = new Map<string, FuelRow>();
      ops.forEach((o) => {
        const key = o.fuelTypeId;
        const row = map.get(key) ?? {
          fuelTypeId: key,
          fuelName: o.fuelName || fuelName(key),
          unit: fuelUnit(key),
          openQty: 0,
          inQty: 0,
          outQty: 0,
          closeQty: 0,
          openSum: 0,
          inSum: 0,
          outSum: 0,
          closeSum: 0,
        };
        row.outQty += o.quantity;
        row.outSum += o.amount;
        map.set(key, row);
      });
      setRows(Array.from(map.values()).sort((a, b) => a.fuelName.localeCompare(b.fuelName, 'ru')));
    } catch {
      setReportError('Не удалось сформировать отчёт');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const buildTurnover = async () => {
    if (!fClient) {
      setReportError('Выберите контрагента');
      return;
    }
    setReportError('');
    setLoading(true);
    setMode('turnover');
    try {
      // Остаток на начало периода — все операции строго до даты начала.
      const beforeOps = dateFrom
        ? await fetchOperations({ dateTo: shiftDay(dateFrom, -1), clientId: fClient })
        : [];
      const periodOps = await fetchOperations({
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        clientId: fClient,
      });

      const map = new Map<string, FuelRow>();
      const ensure = (fuelTypeId: string, name: string) => {
        let row = map.get(fuelTypeId);
        if (!row) {
          row = {
            fuelTypeId,
            fuelName: name || fuelName(fuelTypeId),
            unit: fuelUnit(fuelTypeId),
            openQty: 0, inQty: 0, outQty: 0, closeQty: 0,
            openSum: 0, inSum: 0, outSum: 0, closeSum: 0,
          };
          map.set(fuelTypeId, row);
        }
        return row;
      };

      const applySigned = (row: FuelRow, operation: string, qty: number, sum: number, target: 'open' | 'flow') => {
        const isIncoming = operation === 'topup' || operation === 'move_in';
        const isOutgoing = operation === 'refuel' || operation === 'move_out';
        const signedQty = isIncoming ? qty : isOutgoing ? -qty : 0;
        const signedSum = isIncoming ? sum : isOutgoing ? -sum : 0;
        if (target === 'open') {
          row.openQty += signedQty;
          row.openSum += signedSum;
        } else {
          if (isIncoming) {
            row.inQty += qty;
            row.inSum += sum;
          } else if (isOutgoing) {
            row.outQty += qty;
            row.outSum += sum;
          }
        }
      };

      beforeOps.forEach((o) => {
        const row = ensure(o.fuelTypeId, o.fuelName);
        applySigned(row, o.operation, o.quantity, o.amount, 'open');
      });
      periodOps.forEach((o) => {
        const row = ensure(o.fuelTypeId, o.fuelName);
        applySigned(row, o.operation, o.quantity, o.amount, 'flow');
      });

      map.forEach((row) => {
        row.closeQty = row.openQty + row.inQty - row.outQty;
        row.closeSum = row.openSum + row.inSum - row.outSum;
      });

      setRows(Array.from(map.values()).sort((a, b) => a.fuelName.localeCompare(b.fuelName, 'ru')));
    } catch {
      setReportError('Не удалось сформировать отчёт');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          openQty: acc.openQty + r.openQty,
          inQty: acc.inQty + r.inQty,
          outQty: acc.outQty + r.outQty,
          closeQty: acc.closeQty + r.closeQty,
          openSum: acc.openSum + r.openSum,
          inSum: acc.inSum + r.inSum,
          outSum: acc.outSum + r.outSum,
          closeSum: acc.closeSum + r.closeSum,
        }),
        { openQty: 0, inQty: 0, outQty: 0, closeQty: 0, openSum: 0, inSum: 0, outSum: 0, closeSum: 0 },
      ),
    [rows],
  );

  const periodLabel = `${dateFrom || '…'} — ${dateTo || '…'}`;

  const printReport = () => window.print();

  const exportToExcel = () => {
    if (mode === 'sales') {
      const data = rows.map((r) => ({
        'Вид топлива': r.fuelName,
        'Количество': r.outQty,
        'Ед. изм.': r.unit,
        'Сумма, ₽': r.outSum,
      }));
      data.push({ 'Вид топлива': 'ИТОГО', 'Количество': totals.outQty, 'Ед. изм.': '', 'Сумма, ₽': totals.outSum });
      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 20 }, { wch: 14 }, { wch: 10 }, { wch: 14 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Продажи');
      XLSX.writeFile(wb, `report_sales_${today()}.xlsx`);
    } else if (mode === 'turnover') {
      const data = rows.map((r) => ({
        'Вид топлива': r.fuelName,
        'Остаток на начало, кол-во': r.openQty,
        'Остаток на начало, ₽': r.openSum,
        'Приход, кол-во': r.inQty,
        'Приход, ₽': r.inSum,
        'Расход, кол-во': r.outQty,
        'Расход, ₽': r.outSum,
        'Остаток на конец, кол-во': r.closeQty,
        'Остаток на конец, ₽': r.closeSum,
      }));
      data.push({
        'Вид топлива': 'ИТОГО',
        'Остаток на начало, кол-во': totals.openQty,
        'Остаток на начало, ₽': totals.openSum,
        'Приход, кол-во': totals.inQty,
        'Приход, ₽': totals.inSum,
        'Расход, кол-во': totals.outQty,
        'Расход, ₽': totals.outSum,
        'Остаток на конец, кол-во': totals.closeQty,
        'Остаток на конец, ₽': totals.closeSum,
      });
      const ws = XLSX.utils.json_to_sheet(data);
      ws['!cols'] = [{ wch: 20 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 14 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Обороты');
      XLSX.writeFile(wb, `report_turnover_${today()}.xlsx`);
    }
  };

  return (
    <>
      <div className="print:hidden">
        <SectionHeader subtitle="Раздел" title="Отчёты" />

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Дата с">
            <input type="date" className={inputCls} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </Field>
          <Field label="Дата по">
            <input type="date" className={inputCls} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </Field>
          <Field label="Контрагент">
            <select className={inputCls} value={fClient} onChange={(e) => setFClient(e.target.value)}>
              <option value="">Выберите клиента</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <div className="flex items-end gap-2">
            <button
              onClick={buildSales}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="ShoppingCart" size={15} />
              Продажи
            </button>
            <button
              onClick={buildTurnover}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="ArrowRightLeft" size={15} />
              Обороты
            </button>
          </div>
        </div>

        {reportError && (
          <p className="mb-4 flex items-center gap-2 text-sm text-accent">
            <Icon name="TriangleAlert" size={15} /> {reportError}
          </p>
        )}

        {mode && !reportError && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <div className="text-sm text-muted-foreground">
              {mode === 'sales' ? 'Отчёт по продажам' : 'Отчёт по оборотам'} · {clientName} · {periodLabel}
            </div>
            <div className="flex gap-2">
              <button
                onClick={printReport}
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
          </div>
        )}
      </div>

      {mode && (
        <div id="print-journal">
          <h2 className="mb-1 hidden font-head text-xl font-medium print:block">
            {mode === 'sales' ? 'Отчёт по продажам' : 'Отчёт по оборотам'}
          </h2>
          <p className="mb-4 hidden text-sm text-muted-foreground print:block">
            {clientName} · {periodLabel}
          </p>

          {mode === 'sales' && (
            <TableCard className="print:border-0 print:rounded-none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <Th>Вид топлива</Th>
                      <Th>Количество</Th>
                      <Th>Сумма, ₽</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.fuelTypeId} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                        <td className="px-4 py-3 font-medium">{r.fuelName}</td>
                        <td className="px-4 py-3">{formatNum(r.outQty)} {r.unit}</td>
                        <td className="px-4 py-3">{formatNum(r.outSum, 2)} ₽</td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">
                          {loading ? 'Формирование…' : 'Нет заправок за выбранный период'}
                        </td>
                      </tr>
                    )}
                    {rows.length > 0 && (
                      <tr className="border-t-2 border-border font-semibold">
                        <td className="px-4 py-3">ИТОГО</td>
                        <td className="px-4 py-3">{formatNum(totals.outQty)}</td>
                        <td className="px-4 py-3">{formatNum(totals.outSum, 2)} ₽</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TableCard>
          )}

          {mode === 'turnover' && (
            <TableCard className="print:border-0 print:rounded-none">
              <div className="overflow-x-auto">
                <table className="w-full whitespace-nowrap text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <Th>Вид топлива</Th>
                      <Th>Остаток на начало</Th>
                      <Th>Приход</Th>
                      <Th>Расход</Th>
                      <Th>Остаток на конец</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.fuelTypeId} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                        <td className="px-4 py-3 font-medium">{r.fuelName}</td>
                        <td className="px-4 py-3">
                          {formatNum(r.openQty)} {r.unit}
                          <span className="ml-1.5 text-xs text-muted-foreground">({formatNum(r.openSum, 2)} ₽)</span>
                        </td>
                        <td className="px-4 py-3 text-primary">
                          +{formatNum(r.inQty)} {r.unit}
                          <span className="ml-1.5 text-xs text-muted-foreground">({formatNum(r.inSum, 2)} ₽)</span>
                        </td>
                        <td className="px-4 py-3 text-accent">
                          −{formatNum(r.outQty)} {r.unit}
                          <span className="ml-1.5 text-xs text-muted-foreground">({formatNum(r.outSum, 2)} ₽)</span>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {formatNum(r.closeQty)} {r.unit}
                          <span className="ml-1.5 text-xs text-muted-foreground">({formatNum(r.closeSum, 2)} ₽)</span>
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                          {loading ? 'Формирование…' : 'Нет операций за выбранный период'}
                        </td>
                      </tr>
                    )}
                    {rows.length > 0 && (
                      <tr className="border-t-2 border-border font-semibold">
                        <td className="px-4 py-3">ИТОГО</td>
                        <td className="px-4 py-3">{formatNum(totals.openQty)} ({formatNum(totals.openSum, 2)} ₽)</td>
                        <td className="px-4 py-3 text-primary">+{formatNum(totals.inQty)} ({formatNum(totals.inSum, 2)} ₽)</td>
                        <td className="px-4 py-3 text-accent">−{formatNum(totals.outQty)} ({formatNum(totals.outSum, 2)} ₽)</td>
                        <td className="px-4 py-3">{formatNum(totals.closeQty)} ({formatNum(totals.closeSum, 2)} ₽)</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </TableCard>
          )}
        </div>
      )}
    </>
  );
};

const today = () => new Date().toISOString().slice(0, 10);

const shiftDay = (dateStr: string, days: number) => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export default ReportsSection;
