import { Client, ClientAccount, FuelCard, FuelType, cardNumber, unitShort, isBalanceCard } from '@/lib/cabinet';

const SECTION_LABELS: Record<string, string> = {
  fuelCards: 'Топливные карты',
  discountCards: 'Бонусные карты',
  coupons: 'Талоны',
  operations: 'Операции',
};

const esc = (s: string) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const fmtDate = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ru-RU');
};

const ICON_CARD =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>';
const ICON_WALLET =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>';

export const printClientInstruction = (
  client: Client,
  accounts: ClientAccount[],
  cards: FuelCard[],
  fuelTypes: FuelType[],
) => {
  const fuelName = (id: string) => fuelTypes.find((f) => f.id === id)?.name ?? '—';
  const fuelUnit = (id: string) => unitShort(fuelTypes.find((f) => f.id === id)?.unit ?? 'литр');

  const cardsRows = cards
    .map((c) => {
      const balanceCard = isBalanceCard(c);
      const icon = balanceCard ? ICON_WALLET : ICON_CARD;
      const label = balanceCard ? `${esc(cardNumber(c))} (балансная карта)` : esc(cardNumber(c));
      return `
      <tr>
        <td><span class="card-cell">${icon}${label}</span></td>
        <td>${esc(fuelName(c.fuelTypeId))}</td>
        <td>${c.dailyLimit ? `${c.dailyLimit} ${esc(fuelUnit(c.fuelTypeId))}/сутки` : '—'}</td>
        <td>${c.status === 'active' ? 'Активна' : 'Заблокирована'}</td>
        <td>${fmtDate(c.activatedAt)}</td>
      </tr>`;
    })
    .join('');

  const accountsRows = accounts
    .map(
      (a) => `
      <tr>
        <td><span class="cred-box">${esc(a.login)}</span></td>
        <td><span class="cred-box">${esc(a.password)}</span></td>
        <td>${a.readOnly ? 'Только просмотр' : 'Полный доступ'}</td>
        <td>${a.sections.map((s) => esc(SECTION_LABELS[s] ?? s)).join(', ') || '—'}</td>
      </tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<title>Инструкция пользователя — ${esc(client.name)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #16241b; margin: 0; padding: 32px 40px; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 28px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #17402c; }
  .subtitle { color: #5b6b60; font-size: 13px; margin-bottom: 24px; }
  .site-box { display: inline-block; margin: 6px 0 4px; padding: 10px 18px; border: 2px solid #17402c; border-radius: 10px; font-size: 18px; font-weight: 700; letter-spacing: 0.02em; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 4px; }
  th, td { border: 1px solid #cfd8d2; padding: 8px 10px; text-align: left; }
  th { background: #eef3ef; font-weight: 600; }
  .req-table td:first-child { width: 220px; color: #5b6b60; }
  .card-cell { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
  .card-cell svg { flex-shrink: 0; color: #17402c; }
  .cred-box { display: inline-block; padding: 5px 12px; border: 2px solid #17402c; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; letter-spacing: 0.03em; }
  .footer-note { margin-top: 28px; padding: 14px 16px; border-radius: 10px; background: #eef3ef; font-size: 13px; }
  .footer-note b { color: #17402c; }
  @media print {
    body { padding: 12mm 14mm; }
  }
</style>
</head>
<body>
  <h1>Инструкция пользователя</h1>
  <div class="subtitle">${esc(client.name)} · сформировано ${fmtDate(new Date().toISOString())}</div>

  <h2>1. Как попасть на сайт</h2>
  <p>Откройте в браузере адрес:</p>
  <div class="site-box">https://ooo-talan.ru</div>
  <p>На главной странице нажмите «Вход в кабинет» и введите логин и пароль из раздела 3 этой инструкции.</p>

  <h2>2. Регистрационные данные клиента</h2>
  <table class="req-table">
    <tr><td>ИНН</td><td>${esc(client.inn)}</td></tr>
    <tr><td>Наименование организации</td><td>${esc(client.name)}</td></tr>
    <tr><td>Телефон</td><td>${esc(client.phone) || '—'}</td></tr>
    <tr><td>Электронная почта</td><td>${esc(client.email) || '—'}</td></tr>
  </table>

  <h2>3. Топливные карты</h2>
  <table>
    <thead>
      <tr><th>Номер карты</th><th>Вид топлива</th><th>Дневной лимит</th><th>Статус</th><th>Активирована</th></tr>
    </thead>
    <tbody>
      ${cardsRows || '<tr><td colspan="5" style="text-align:center;color:#5b6b60;">Топливные карты не выпущены</td></tr>'}
    </tbody>
  </table>

  <h2>4. Логины и пароли для входа</h2>
  <table>
    <thead>
      <tr><th>Логин</th><th>Пароль</th><th>Режим доступа</th><th>Доступные разделы</th></tr>
    </thead>
    <tbody>
      ${accountsRows || '<tr><td colspan="4" style="text-align:center;color:#5b6b60;">Учётные записи не созданы</td></tr>'}
    </tbody>
  </table>

  <div class="footer-note">
    <b>Подсказка:</b> после входа в личный кабинет нажмите кнопку «Инструкция» — там есть подробное
    описание работы со всеми разделами кабинета.
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
};