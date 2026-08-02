import { useMemo, useState } from 'react';
import CabinetShell from '@/components/cabinet/CabinetShell';
import { useAuthGuard } from '@/hooks/use-auth-guard';
import { SECTIONS, SectionKey } from '@/lib/cabinet';
import FuelTypesSection from '@/components/cabinet/sections/FuelTypesSection';
import StationsSection from '@/components/cabinet/sections/StationsSection';
import ClientsSection from '@/components/cabinet/sections/ClientsSection';
import FuelCardsSection from '@/components/cabinet/sections/FuelCardsSection';
import DiscountCardsSection from '@/components/cabinet/sections/DiscountCardsSection';
import CouponsSection from '@/components/cabinet/sections/CouponsSection';

interface ManagerUser {
  id: string;
  login: string;
  fullName: string;
  phone: string;
  status: 'active' | 'blocked';
  readOnly: boolean;
  sections: SectionKey[];
}

const Manager = () => {
  const { user: manager, loading } = useAuthGuard<ManagerUser>('manager');

  const available = useMemo(
    () => SECTIONS.filter((s) => manager?.sections.includes(s.key)),
    [manager],
  );
  const [active, setActive] = useState<SectionKey | null>(null);
  const readOnly = manager?.readOnly ?? false;
  const currentActive = active ?? available[0]?.key ?? 'fuel';

  if (loading || !manager) return null;

  const render = () => {
    switch (currentActive) {
      case 'fuel':
        return <FuelTypesSection readOnly={readOnly} />;
      case 'stations':
        return <StationsSection readOnly={readOnly} />;
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
      active={currentActive}
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