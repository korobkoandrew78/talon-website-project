import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';

const LOGO =
  'https://cdn.poehali.dev/projects/cc75541e-6a4b-4243-9045-839da83c8672/bucket/288ee4f1-d06e-472f-b7f8-c10a8b03ae64.png';

const links = [
  { label: 'Топливные карты', href: '#fuel-cards' },
  { label: 'Бонусы', href: '#bonus' },
  { label: 'Талоны', href: '#coupons' },
  { label: 'Кабинеты', href: '#accounts' },
  { label: 'Поддержка', href: '#support' },
];

const Header = () => {
  const [open, setOpen] = useState(false);

  const scrollTo = (href: string) => {
    setOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 md:px-10">
        <button
          onClick={() => scrollTo('#top')}
          className="flex items-center gap-3"
          aria-label="ООО Талан — на главную"
        >
          <img
            src={LOGO}
            alt="Талан"
            className="h-8 rounded-lg bg-white px-2 py-1"
          />
          <span className="eyebrow hidden sm:block">Сеть&nbsp;АЗС</span>
        </button>

        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => scrollTo('#login')}
            className="hidden rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground transition-transform hover:-translate-y-0.5 sm:block"
          >
            Войти
          </button>
          <button
            className="text-foreground lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Меню"
          >
            <Icon name={open ? 'X' : 'Menu'} size={26} />
          </button>
        </div>
      </div>

      <div
        className={cn(
          'overflow-hidden border-t border-border/60 bg-background/95 lg:hidden',
          open ? 'max-h-96' : 'max-h-0',
          'transition-all duration-300',
        )}
      >
        <div className="flex flex-col gap-1 px-5 py-4">
          {links.map((l) => (
            <button
              key={l.href}
              onClick={() => scrollTo(l.href)}
              className="rounded-lg px-3 py-3 text-left text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {l.label}
            </button>
          ))}
          <button
            onClick={() => scrollTo('#login')}
            className="mt-2 rounded-full bg-accent px-5 py-3 text-center font-semibold text-accent-foreground"
          >
            Войти в кабинет
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
