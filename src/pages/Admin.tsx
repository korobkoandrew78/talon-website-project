import CabinetShell from '@/components/cabinet/CabinetShell';
import ManagersSection from '@/components/cabinet/sections/ManagersSection';

const Admin = () => {
  return (
    <CabinetShell
      role="Панель администратора"
      nav={[{ key: 'managers', label: 'Менеджеры', icon: 'UserCog' }]}
      active="managers"
      onNavigate={() => {}}
    >
      <ManagersSection />
    </CabinetShell>
  );
};

export default Admin;
