import Icon from '@/components/ui/icon';

const stats = [
  { value: 'Сеть АЗС', label: 'по региону' },
  { value: '24/7', label: 'приём карт' },
  { value: '1 счёт', label: 'на весь автопарк' },
];

const Support = () => {
  return (
    <section id="support" className="scroll-mt-20">
      <div className="mx-auto max-w-7xl px-5 py-24 md:px-10">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 md:p-16">
          <div className="glow-scene absolute inset-0 -z-10 opacity-70" />

          <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <div className="eyebrow mb-5">Поддержка и подключение</div>
              <h2 className="font-head text-4xl font-medium tracking-tight md:text-5xl">
                Подключим автопарк <span className="text-muted-foreground">за один день</span>
              </h2>
              <p className="mt-5 max-w-lg text-muted-foreground">
                Оставьте заявку — менеджер «Талан» подберёт тариф, оформит договор и выпустит карты.
                Уже клиент? Просто войдите в личный кабинет.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="#login"
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-accent-foreground transition-transform hover:-translate-y-0.5"
                >
                  Войти в личный кабинет
                  <Icon name="ArrowRight" size={16} />
                </a>
                <a
                  href="tel:+70000000000"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  <Icon name="Phone" size={16} />
                  Связаться с менеджером
                </a>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 lg:grid-cols-1">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl border border-border bg-secondary/60 px-5 py-6 text-center lg:text-left"
                >
                  <div className="font-head text-2xl font-medium md:text-3xl">{s.value}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Support;
