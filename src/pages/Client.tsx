import { useMemo, useState } from 'react';
import CabinetShell from '@/components/cabinet/CabinetShell';
import Icon from '@/components/ui/icon';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { ClientSection } from '@/lib/cabinet';
import FuelCardsSection from '@/components/cabinet/sections/FuelCardsSection';
import DiscountCardsSection from '@/components/cabinet/sections/DiscountCardsSection';
import CouponsSection from '@/components/cabinet/sections/CouponsSection';

const SECTION_META: Record<ClientSection, { label: string; icon: string }> = {
  fuelCards: { label: 'Топливные карты', icon: 'CreditCard' },
  discountCards: { label: 'Бонусные карты', icon: 'BadgePercent' },
  coupons: { label: 'Талоны', icon: 'Ticket' },
};

interface ClientUser {
  id: string;
  inn: string;
  name: string;
  phone: string;
  email: string;
  login: string;
  readOnly: boolean;
  sections: ClientSection[];
}

const Client = () => {
  const { user: client, loading } = useAuthGuard<ClientUser>('client');

  const available = useMemo(
    () => (client ? client.sections : []),
    [client],
  );
  const [active, setActive] = useState<ClientSection | null>(null);
  const readOnly = client?.readOnly ?? false;
  const currentActive = active ?? available[0] ?? 'fuelCards';

  if (loading || !client) return null;

  const info = [
    { icon: 'Hash', label: 'ИНН', value: client.inn },
    { icon: 'Phone', label: 'Телефон', value: client.phone },
    { icon: 'Mail', label: 'Почта', value: client.email },
    { icon: 'User', label: 'Логин', value: client.login },
  ];

  const render = () => {
    switch (currentActive) {
      case 'fuelCards':
        return <FuelCardsSection readOnly={readOnly} clientId={client.id} />;
      case 'discountCards':
        return <DiscountCardsSection readOnly={readOnly} clientId={client.id} />;
      case 'coupons':
        return <CouponsSection readOnly={readOnly} clientId={client.id} />;
      default:
        return null;
    }
  };

  const topbar = (
    <div className="mb-6 rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="eyebrow mb-1">Клиент</div>
          <h1 className="font-head text-2xl font-medium tracking-tight md:text-3xl">{client.name}</h1>
        </div>
        {readOnly && (
          <span className="rounded-full bg-secondary px-3 py-1.5 text-xs text-muted-foreground">
            Режим «только просмотр»
          </span>
        )}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {info.map((i) => (
          <div key={i.label} className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <Icon name={i.icon} size={18} />
            </span>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">{i.label}</div>
              <div className="truncate text-sm font-medium">{i.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <CabinetShell
      role="Личный кабинет клиента"
      nav={available.map((k) => ({ key: k, label: SECTION_META[k].label, icon: SECTION_META[k].icon }))}
      active={currentActive}
      onNavigate={(k) => setActive(k as ClientSection)}
      topbar={topbar}
    >
      {available.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">Нет доступных разделов</p>
      ) : (
        render()
      )}
    </CabinetShell>
  );
};

export default Client;
