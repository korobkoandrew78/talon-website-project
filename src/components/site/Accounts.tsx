import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';

const tabs = [
  {
    id: 'client',
    label: 'Кабинет клиента',
    icon: 'Building2',
    heading: 'Личный кабинет клиента',
    text: 'Полный контроль над топливными расходами автопарка. Управляйте картами, лимитами и балансом без звонков менеджеру.',
    features: [
      { icon: 'Wallet', title: 'Баланс и пополнение', text: 'Онлайн-оплата счёта и мгновенное зачисление на карты.' },
      { icon: 'SlidersHorizontal', title: 'Гибкие лимиты', text: 'Настройка суточных и месячных лимитов по каждой карте.' },
      { icon: 'FileText', title: 'Отчёты и закрывающие', text: 'Выгрузка транзакций и бухгалтерских документов.' },
      { icon: 'Lock', title: 'Блокировка карт', text: 'Мгновенная блокировка при потере — в один клик.' },
    ],
  },
  {
    id: 'manager',
    label: 'Кабинет менеджера',
    icon: 'UserCog',
    heading: 'Личный кабинет менеджера',
    text: 'Рабочее место сотрудника «Талан»: обслуживание клиентов, выпуск карт и талонов, контроль договоров и заявок.',
    features: [
      { icon: 'Users', title: 'База клиентов', text: 'Карточки автопарков, договоры и история операций.' },
      { icon: 'CreditCard', title: 'Выпуск карт и талонов', text: 'Оформление топливных и бонусных карт, печать талонов.' },
      { icon: 'BellRing', title: 'Заявки и обращения', text: 'Обработка запросов клиентов в едином окне.' },
      { icon: 'ChartColumn', title: 'Аналитика продаж', text: 'Показатели по клиентам, АЗС и видам топлива.' },
    ],
  },
] as const;

const Accounts = () => {
  const [active, setActive] = useState<'client' | 'manager'>('client');
  const current = tabs.find((t) => t.id === active)!;

  return (
    <section id="accounts" className="scroll-mt-20 border-y border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-5 py-24 md:px-10">
        <div className="max-w-2xl">
          <div className="eyebrow mb-5">Личные кабинеты</div>
          <h2 className="font-head text-4xl font-medium tracking-tight md:text-5xl">
            Два кабинета — <span className="text-muted-foreground">одна экосистема</span>
          </h2>
        </div>

        <div className="mt-10 inline-flex rounded-full border border-border bg-card p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={cn(
                'flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors',
                active === t.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon name={t.icon} size={17} />
              {t.label}
            </button>
          ))}
        </div>

        <div key={current.id} className="mt-12 grid animate-fade-in gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <h3 className="font-head text-3xl font-medium">{current.heading}</h3>
            <p className="mt-4 text-muted-foreground">{current.text}</p>
            <a
              href="#login"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-transform hover:-translate-y-0.5"
            >
              Войти в кабинет
              <Icon name="ArrowRight" size={16} />
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {current.features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/50"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Icon name={f.icon} size={20} />
                </span>
                <h4 className="mt-4 font-head text-lg font-medium">{f.title}</h4>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Accounts;
