import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';

const LOGO =
  'https://cdn.poehali.dev/projects/cc75541e-6a4b-4243-9045-839da83c8672/bucket/288ee4f1-d06e-472f-b7f8-c10a8b03ae64.png';

const stats = [
  { icon: 'Users', label: 'Активные клиенты', value: '128' },
  { icon: 'CreditCard', label: 'Выпущено карт', value: '1 240' },
  { icon: 'Ticket', label: 'Талоны в обороте', value: '356' },
  { icon: 'Wallet', label: 'Баланс за месяц', value: '4,8 млн ₽' },
];

const clients = [
  { name: 'АвтоТранс-Логистик', cards: 42, status: 'Активен', spent: '820 000 ₽' },
  { name: 'СтройПарк', cards: 18, status: 'Активен', spent: '310 500 ₽' },
  { name: 'ГрузСервис 24', cards: 27, status: 'Проверка', spent: '512 300 ₽' },
  { name: 'ТаксиПарк «Восток»', cards: 63, status: 'Активен', spent: '1 205 000 ₽' },
  { name: 'АгроХолдинг Нива', cards: 11, status: 'Заблокирован', spent: '96 400 ₽' },
];

const nav = [
  { icon: 'LayoutDashboard', label: 'Обзор' },
  { icon: 'Users', label: 'Клиенты' },
  { icon: 'CreditCard', label: 'Карты' },
  { icon: 'Ticket', label: 'Талоны' },
  { icon: 'ChartColumn', label: 'Аналитика' },
];

const statusColor = (s: string) =>
  s === 'Активен'
    ? 'bg-primary/20 text-primary'
    : s === 'Проверка'
      ? 'bg-yellow-500/15 text-yellow-400'
      : 'bg-accent/20 text-accent';

const Admin = () => {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState('Обзор');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="glow-scene fixed inset-0 -z-10 opacity-60" />

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-5 backdrop-blur-md md:px-8">
        <div className="flex items-center gap-3">
          <img src={LOGO} alt="Талан" className="h-8 rounded-lg bg-white px-2 py-1" />
          <span className="eyebrow hidden sm:block">Панель менеджера</span>
        </div>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary"
        >
          <Icon name="LogOut" size={16} />
          Выйти
        </button>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-5 py-8 md:px-8">
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-1">
            {nav.map((n) => (
              <button
                key={n.label}
                onClick={() => setActiveNav(n.label)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors',
                  activeNav === n.label
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <Icon name={n.icon} size={18} />
                {n.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-8">
            <div className="eyebrow mb-2">Личный кабинет менеджера</div>
            <h1 className="font-head text-3xl font-medium tracking-tight md:text-4xl">
              Добро пожаловать в панель «Талан»
            </h1>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-card p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Icon name={s.icon} size={20} />
                </span>
                <div className="mt-4 font-head text-2xl font-medium">{s.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <h2 className="font-head text-lg font-medium">Клиенты автопарков</h2>
              <button className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-transform hover:-translate-y-0.5">
                <Icon name="Plus" size={16} />
                Новый клиент
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-6 py-3 font-medium">Клиент</th>
                    <th className="px-6 py-3 font-medium">Карт</th>
                    <th className="px-6 py-3 font-medium">Статус</th>
                    <th className="px-6 py-3 text-right font-medium">Оборот</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr
                      key={c.name}
                      className="border-b border-border/60 last:border-0 transition-colors hover:bg-secondary/40"
                    >
                      <td className="px-6 py-4 font-medium">{c.name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{c.cards}</td>
                      <td className="px-6 py-4">
                        <span className={cn('rounded-full px-3 py-1 text-xs font-medium', statusColor(c.status))}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-muted-foreground">{c.spent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Admin;
