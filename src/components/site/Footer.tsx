import Icon from '@/components/ui/icon';

const LOGO =
  'https://cdn.poehali.dev/projects/cc75541e-6a4b-4243-9045-839da83c8672/bucket/288ee4f1-d06e-472f-b7f8-c10a8b03ae64.png';

const columns = [
  {
    title: 'Продукты',
    links: [
      { label: 'Топливные карты', href: '#fuel-cards' },
      { label: 'Бонусные карты', href: '#bonus' },
      { label: 'Топливные талоны', href: '#coupons' },
    ],
  },
  {
    title: 'Кабинеты',
    links: [
      { label: 'Кабинет клиента', href: '#accounts' },
      { label: 'Кабинет менеджера', href: '#accounts' },
      { label: 'Вход', href: '#login' },
    ],
  },
];

const Footer = () => {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-10">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <img src={LOGO} alt="Талан" className="h-8 rounded-lg bg-white px-2 py-1" />
              <span className="eyebrow">Сеть&nbsp;АЗС</span>
            </div>
            <p className="mt-5 max-w-xs text-sm text-muted-foreground">
              ООО «Талан» — сеть автозаправочных станций. Топливные и бонусные карты,
              талоны и личные кабинеты для автопарков.
            </p>
          </div>

          {columns.map((c) => (
            <div key={c.title}>
              <h4 className="font-head text-sm font-medium uppercase tracking-wider text-muted-foreground">
                {c.title}
              </h4>
              <ul className="mt-4 space-y-3">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-border pt-8 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} ООО «Талан». Все права защищены.</p>
          <div className="flex items-center gap-2">
            <Icon name="ShieldCheck" size={15} />
            Защищённое соединение · Талан ID
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
