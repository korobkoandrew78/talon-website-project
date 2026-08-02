import Icon from '@/components/ui/icon';

const products = [
  {
    id: 'fuel-cards',
    icon: 'CreditCard',
    tag: '01',
    title: 'Топливные карты',
    text: 'Безналичная заправка автопарка на всей сети АЗС «Талан». Единый счёт, детализация каждой транзакции и гибкие лимиты по литрам, суммам и видам топлива.',
    points: ['Лимиты по водителю и авто', 'Онлайн-баланс и отчёты', 'Блокировка карты в один клик'],
  },
  {
    id: 'bonus',
    icon: 'Gift',
    tag: '02',
    title: 'Бонусные карты',
    text: 'Копите баллы за каждый литр и оплачивайте ими топливо и товары на АЗС. Персональные акции для постоянных клиентов и корпоративных партнёров.',
    points: ['Кэшбэк баллами за литры', 'Персональные акции', 'Оплата баллами на кассе'],
  },
  {
    id: 'coupons',
    icon: 'Ticket',
    tag: '03',
    title: 'Топливные талоны',
    text: 'Фиксированный объём топлива по заранее согласованной цене. Удобно для разовых поездок, тендеров и подрядчиков — без привязки к карте.',
    points: ['Фиксированная цена литра', 'Номинал в литрах', 'Приём на всех АЗС сети'],
  },
];

const Products = () => {
  return (
    <section className="relative mx-auto max-w-7xl px-5 py-24 md:px-10">
      <div className="max-w-2xl">
        <div className="eyebrow mb-5">Продукты и сервисы</div>
        <h2 className="font-head text-4xl font-medium tracking-tight md:text-5xl">
          Всё топливо автопарка — <span className="text-muted-foreground">в одном инструменте</span>
        </h2>
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {products.map((p) => (
          <article
            key={p.id}
            id={p.id}
            className="group flex scroll-mt-24 flex-col rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary/60"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                <Icon name={p.icon} size={22} />
              </span>
              <span className="font-head text-sm text-muted-foreground/50">{p.tag}</span>
            </div>

            <h3 className="mt-6 font-head text-2xl font-medium">{p.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.text}</p>

            <ul className="mt-6 space-y-2.5 border-t border-border pt-5">
              {p.points.map((pt) => (
                <li key={pt} className="flex items-center gap-2.5 text-sm">
                  <Icon name="Check" size={15} className="text-primary" />
                  {pt}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Products;
