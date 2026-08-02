import CabinetShell from '@/components/cabinet/CabinetShell';
import ManagersSection from '@/components/cabinet/sections/ManagersSection';
import { useAuthGuard } from '@/hooks/use-auth-guard';

const Admin = () => {
  const { loading } = useAuthGuard('admin');

  if (loading) return null;

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
