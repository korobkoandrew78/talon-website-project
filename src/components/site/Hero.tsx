import LoginPanel from './LoginPanel';

const PHOTO =
  'https://cdn.poehali.dev/projects/cc75541e-6a4b-4243-9045-839da83c8672/files/39d73a1e-3fd0-4166-ba41-36b57e2a5fb0.jpg';

const Hero = () => {
  return (
    <section
      id="top"
      className="relative isolate overflow-hidden pt-16"
    >
      {/* атмосфера АЗС — тихий фон справа */}
      <div className="glow-scene absolute inset-0 -z-20" />
      <div
        className="absolute inset-y-0 right-0 -z-10 w-1/2 opacity-50 saturate-[0.85]"
        style={{
          backgroundImage: `url('${PHOTO}')`,
          backgroundSize: 'cover',
          backgroundPosition: '40% center',
          WebkitMaskImage:
            'linear-gradient(90deg, transparent, #000 42%, #000 100%)',
          maskImage:
            'linear-gradient(90deg, transparent, #000 42%, #000 100%)',
        }}
      />
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(90deg, hsl(var(--background)) 30%, transparent 82%)',
        }}
      />

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-5 py-16 md:px-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="max-w-xl animate-rise">
          <div className="eyebrow mb-6 flex items-center gap-3.5">
            <span className="inline-block h-px w-8 bg-accent" />
            Сеть автозаправочных станций
          </div>

          <h1 className="font-head text-5xl font-medium leading-[1.02] tracking-tight md:text-6xl lg:text-7xl">
            ООО&nbsp;«Талан».
            <br />
            <span className="font-light text-muted-foreground">
              Топливо под&nbsp;контролем.
            </span>
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
            Топливные и&nbsp;бонусные карты, талоны и&nbsp;лимиты автопарка —
            в&nbsp;одном личном кабинете, без бумажных ведомостей.
          </p>
        </div>

        <div id="login" className="animate-scale-in justify-self-stretch lg:justify-self-end">
          <LoginPanel />
        </div>
      </div>
    </section>
  );
};

export default Hero;
