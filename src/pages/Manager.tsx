import { useMemo, useState } from 'react';
import CabinetShell from '@/components/cabinet/CabinetShell';
import { useStore } from '@/lib/store';
import { SECTIONS, SectionKey } from '@/lib/cabinet';
import FuelTypesSection from '@/components/cabinet/sections/FuelTypesSection';
import ClientsSection from '@/components/cabinet/sections/ClientsSection';
import FuelCardsSection from '@/components/cabinet/sections/FuelCardsSection';
import DiscountCardsSection from '@/components/cabinet/sections/DiscountCardsSection';
import CouponsSection from '@/components/cabinet/sections/CouponsSection';

const Manager = () => {
  const { managers } = useStore();

  // Демонстрационный кабинет: берём первого активного менеджера.
  const manager = useMemo(
    () => managers.find((m) => m.status === 'active') ?? managers[0],
    [managers],
  );

  const available = SECTIONS.filter((s) => manager?.sections.includes(s.key));
  const [active, setActive] = useState<SectionKey>(available[0]?.key ?? 'fuel');
  const readOnly = manager?.readOnly ?? false;

  const render = () => {
    switch (active) {
      case 'fuel':
        return <FuelTypesSection readOnly={readOnly} />;
      case 'clients':
        return <ClientsSection readOnly={readOnly} />;
      case 'fuelCards':
        return <FuelCardsSection readOnly={readOnly} />;
      case 'discountCards':
        return <DiscountCardsSection readOnly={readOnly} />;
      case 'coupons':
        return <CouponsSection readOnly={readOnly} />;
      default:
        return null;
    }
  };

  return (
    <CabinetShell
      role={`Кабинет менеджера${readOnly ? ' · только просмотр' : ''}`}
      nav={available.map((s) => ({ key: s.key, label: s.label, icon: s.icon }))}
      active={active}
      onNavigate={(k) => setActive(k as SectionKey)}
    >
      {available.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">Нет доступных разделов</p>
      ) : (
        render()
      )}
    </CabinetShell>
  );
};

export default Manager;
