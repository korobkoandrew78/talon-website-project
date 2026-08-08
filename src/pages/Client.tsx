import { useMemo, useState } from 'react';
import CabinetShell from '@/components/cabinet/CabinetShell';
import Icon from '@/components/ui/icon';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { useStore } from '@/lib/store';
import { ClientSection } from '@/lib/cabinet';
import { printClientInstruction } from '@/components/cabinet/printClientInstruction';
import FuelCardsSection from '@/components/cabinet/sections/FuelCardsSection';
import DiscountCardsSection from '@/components/cabinet/sections/DiscountCardsSection';
import CouponsSection from '@/components/cabinet/sections/CouponsSection';
import OperationsSection from '@/components/cabinet/sections/OperationsSection';

const SECTION_META: Record<ClientSection, { label: string; icon: string }> = {
  fuelCards: { label: 'Топливные карты', icon: 'CreditCard' },
  discountCards: { label: 'Бонусные карты', icon: 'BadgePercent' },
  coupons: { label: 'Талоны', icon: 'Ticket' },
  operations: { label: 'Операции', icon: 'ListOrdered' },
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
  const { fuelCards, fuelTypes } = useStore();

  const available = useMemo(
    () => (client ? client.sections : []),
    [client],
  );
  const [active, setActive] = useState<ClientSection | null>(null);
  const readOnly = client?.readOnly ?? false;
  const currentActive = active ?? available[0] ?? 'fuelCards';

  if (loading || !client) return null;

  const printInstruction = () => {
    printClientInstruction(
      { id: client.id, inn: client.inn, name: client.name, phone: client.phone, email: client.email },
      [{ id: '', clientId: client.id, login: client.login, password: '', readOnly, sections: available }],
      fuelCards.filter((f) => f.clientId === client.id),
      fuelTypes,
    );
  };

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
      case 'operations':
        return <OperationsSection clientId={client.id} />;
      default:
        return null;
    }
  };

  const topbar = (
    <>
      <div className="mb-3 flex items-center gap-2">
        <span className="eyebrow">Раздел</span>
        <span className="text-muted-foreground">/</span>
        <h1 className="font-head text-xl font-medium tracking-tight">{SECTION_META[currentActive].label}</h1>
      </div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-2xl border border-border bg-card px-6 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <h2 className="font-head text-lg font-medium tracking-tight">{client.name}</h2>
          {info.map((i) => (
            <div key={i.label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Icon name={i.icon} size={14} className="text-primary" />
              <span>{i.value}</span>
            </div>
          ))}
        </div>
        {readOnly && (
          <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
            Режим «только просмотр»
          </span>
        )}
      </div>
    </>
  );

  return (
    <CabinetShell
      role="Личный кабинет клиента"
      nav={available.map((k) => ({ key: k, label: SECTION_META[k].label, icon: SECTION_META[k].icon }))}
      active={currentActive}
      onNavigate={(k) => setActive(k as ClientSection)}
      topbar={topbar}
      showGuide
      guidePath="/client-guide"
      headerExtra={
        <button
          onClick={printInstruction}
          className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary"
        >
          <Icon name="IdCard" size={16} />
          <span className="hidden sm:inline">Регистрационные данные</span>
        </button>
      }
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