import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { api, clearAuth } from '@/lib/api';

const LOGO =
  'https://cdn.poehali.dev/projects/cc75541e-6a4b-4243-9045-839da83c8672/bucket/288ee4f1-d06e-472f-b7f8-c10a8b03ae64.png';

export interface NavItem {
  key: string;
  label: string;
  icon: string;
}

interface Props {
  role: string;
  nav: NavItem[];
  active: string;
  onNavigate: (key: string) => void;
  children: ReactNode;
  topbar?: ReactNode;
  showGuide?: boolean;
  guidePath?: string;
  headerExtra?: ReactNode;
}

const CabinetShell = ({ role, nav, active, onNavigate, children, topbar, showGuide, guidePath = '/guide', headerExtra }: Props) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="glow-scene fixed inset-0 -z-10 opacity-60" />

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-5 backdrop-blur-md md:px-8">
        <div className="flex items-center gap-3">
          <img src={LOGO} alt="Талан" className="h-8 rounded-lg bg-white px-2 py-1" />
          <span className="eyebrow hidden sm:block">{role}</span>
        </div>
        <div className="flex items-center gap-2">
          {headerExtra}
          {showGuide && (
            <button
              onClick={() => navigate(guidePath)}
              className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary"
            >
              <Icon name="BookOpen" size={16} />
              <span className="hidden sm:inline">Инструкция</span>
            </button>
          )}
          <button
            onClick={() => {
              api('auth', { method: 'DELETE' }).catch(() => {});
              clearAuth();
              navigate('/');
            }}
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary"
          >
            <Icon name="LogOut" size={16} />
            Выйти
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-6 md:px-8">
        {nav.length > 1 && (
          <aside className="hidden w-60 shrink-0 lg:block">
            <nav className="sticky top-24 space-y-1">
              {nav.map((n) => (
                <button
                  key={n.key}
                  onClick={() => onNavigate(n.key)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors',
                    active === n.key
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
        )}

        <main className="min-w-0 flex-1">
          {/* мобильная навигация */}
          {nav.length > 1 && (
            <div className="mb-5 flex gap-2 overflow-x-auto lg:hidden">
              {nav.map((n) => (
                <button
                  key={n.key}
                  onClick={() => onNavigate(n.key)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-full border border-border px-4 py-2 text-sm transition-colors',
                    active === n.key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground',
                  )}
                >
                  <Icon name={n.icon} size={16} />
                  {n.label}
                </button>
              ))}
            </div>
          )}
          {topbar}
          {children}
        </main>
      </div>
    </div>
  );
};

export default CabinetShell;