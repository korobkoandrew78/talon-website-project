import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import {
  Manager,
  FuelType,
  Client,
  FuelCard,
  DiscountCard,
  Coupon,
} from './cabinet';
import { api, Paginated, getToken, getRole, clearAuth } from './api';

// ——— Помощники ———

const LIST_QUERY = { limit: 1000 };

const handleAuthError = (e: unknown) => {
  if (e && typeof e === 'object' && 'status' in e && (e as { status: number }).status === 401) {
    clearAuth();
    window.location.href = '/';
  }
};

interface Store {
  managers: Manager[];
  loadingManagers: boolean;
  clients: Client[];
  loadingClients: boolean;
  fuelTypes: FuelType[];
  loadingFuelTypes: boolean;
  fuelCards: FuelCard[];
  loadingFuelCards: boolean;
  discountCards: DiscountCard[];
  loadingDiscountCards: boolean;
  coupons: Coupon[];
  loadingCoupons: boolean;

  refreshAll: () => Promise<void>;

  createManager: (data: Omit<Manager, 'id'>) => Promise<Manager>;
  updateManager: (id: string, data: Omit<Manager, 'id'>) => Promise<Manager>;
  deleteManager: (id: string) => Promise<void>;

  createClient: (data: Omit<Client, 'id'>) => Promise<Client>;
  updateClient: (id: string, data: Omit<Client, 'id'>) => Promise<Client>;
  deleteClient: (id: string) => Promise<void>;

  createFuelType: (data: Omit<FuelType, 'id'>) => Promise<FuelType>;
  updateFuelType: (id: string, data: Omit<FuelType, 'id'>) => Promise<FuelType>;
  deleteFuelType: (id: string) => Promise<void>;

  createFuelCard: (payload: {
    code: string;
    idx: number;
    fuel_type_id: string;
    client_id: string;
    daily_limit: number;
  }) => Promise<FuelCard[]>;
  updateFuelCard: (
    id: string,
    payload: {
      fuel_type_id: string;
      client_id: string;
      daily_limit: number;
      balance: number;
      code: string;
      idx: number;
    },
  ) => Promise<FuelCard>;
  deleteFuelCard: (id: string) => Promise<void>;
  blockFuelCard: (id: string, reason: string) => Promise<FuelCard>;
  unblockFuelCard: (id: string) => Promise<FuelCard>;
  topupFuelCard: (id: string, amount: number) => Promise<FuelCard>;
  moveFuelCard: (fromId: string, toId: string, amount: number, toAmount?: number) => Promise<FuelCard[]>;

  createDiscountCard: (data: Omit<DiscountCard, 'id'>) => Promise<DiscountCard>;
  updateDiscountCard: (id: string, data: Omit<DiscountCard, 'id'>) => Promise<DiscountCard>;
  deleteDiscountCard: (id: string) => Promise<void>;

  createCoupon: (data: Omit<Coupon, 'id'>) => Promise<Coupon>;
  updateCoupon: (id: string, data: Omit<Coupon, 'id'>) => Promise<Coupon>;
  deleteCoupon: (id: string) => Promise<void>;
}

const StoreCtx = createContext<Store | null>(null);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [loadingFuelTypes, setLoadingFuelTypes] = useState(false);
  const [fuelCards, setFuelCards] = useState<FuelCard[]>([]);
  const [loadingFuelCards, setLoadingFuelCards] = useState(false);
  const [discountCards, setDiscountCards] = useState<DiscountCard[]>([]);
  const [loadingDiscountCards, setLoadingDiscountCards] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);

  // ——— Загрузка списков ———

  const refreshManagers = useCallback(async () => {
    setLoadingManagers(true);
    try {
      const res = await api<Paginated<Manager>>('managers', { query: LIST_QUERY });
      setManagers(res.items);
    } catch (e) {
      handleAuthError(e);
      throw e;
    } finally {
      setLoadingManagers(false);
    }
  }, []);

  const refreshClients = useCallback(async () => {
    setLoadingClients(true);
    try {
      const res = await api<Paginated<Client>>('clients', { query: LIST_QUERY });
      setClients(res.items);
    } catch (e) {
      handleAuthError(e);
      throw e;
    } finally {
      setLoadingClients(false);
    }
  }, []);

  const refreshFuelTypes = useCallback(async () => {
    setLoadingFuelTypes(true);
    try {
      const res = await api<Paginated<FuelType>>('fuel-types', { query: LIST_QUERY });
      setFuelTypes(res.items);
    } catch (e) {
      handleAuthError(e);
      throw e;
    } finally {
      setLoadingFuelTypes(false);
    }
  }, []);

  const refreshFuelCards = useCallback(async () => {
    setLoadingFuelCards(true);
    try {
      const role = getRole();
      const query = role === 'client' ? { ...LIST_QUERY, client_self: 1 } : LIST_QUERY;
      const res = await api<Paginated<FuelCard>>('fuel-cards', { query });
      setFuelCards(res.items);
    } catch (e) {
      handleAuthError(e);
      throw e;
    } finally {
      setLoadingFuelCards(false);
    }
  }, []);

  const refreshDiscountCards = useCallback(async () => {
    setLoadingDiscountCards(true);
    try {
      const role = getRole();
      const query = role === 'client' ? { ...LIST_QUERY, client_self: 1 } : LIST_QUERY;
      const res = await api<Paginated<DiscountCard>>('discount-cards', { query });
      setDiscountCards(res.items);
    } catch (e) {
      handleAuthError(e);
      throw e;
    } finally {
      setLoadingDiscountCards(false);
    }
  }, []);

  const refreshCoupons = useCallback(async () => {
    setLoadingCoupons(true);
    try {
      const role = getRole();
      const query = role === 'client' ? { ...LIST_QUERY, client_self: 1 } : LIST_QUERY;
      const res = await api<Paginated<Coupon>>('coupons', { query });
      setCoupons(res.items);
    } catch (e) {
      handleAuthError(e);
      throw e;
    } finally {
      setLoadingCoupons(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    const role = getRole();
    if (!role) return;
    if (role === 'admin') {
      await refreshManagers();
    } else if (role === 'manager') {
      await Promise.all([
        refreshFuelTypes(),
        refreshClients(),
        refreshFuelCards(),
        refreshDiscountCards(),
        refreshCoupons(),
      ]);
    } else if (role === 'client') {
      await Promise.all([
        refreshFuelTypes(),
        refreshFuelCards(),
        refreshDiscountCards(),
        refreshCoupons(),
      ]);
    }
  }, [refreshManagers, refreshFuelTypes, refreshClients, refreshFuelCards, refreshDiscountCards, refreshCoupons]);

  useEffect(() => {
    if (getToken()) {
      refreshAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ——— Менеджеры ———

  const createManager = useCallback(async (data: Omit<Manager, 'id'>) => {
    const m = await api<Manager>('managers', { method: 'POST', body: data });
    await refreshManagers();
    return m;
  }, [refreshManagers]);

  const updateManager = useCallback(async (id: string, data: Omit<Manager, 'id'>) => {
    const m = await api<Manager>('managers', { method: 'PUT', body: { id, ...data } });
    await refreshManagers();
    return m;
  }, [refreshManagers]);

  const deleteManager = useCallback(async (id: string) => {
    await api('managers', { method: 'DELETE', query: { id } });
    await refreshManagers();
  }, [refreshManagers]);

  // ——— Клиенты ———

  const createClient = useCallback(async (data: Omit<Client, 'id'>) => {
    const c = await api<Client>('clients', { method: 'POST', body: data });
    await refreshClients();
    return c;
  }, [refreshClients]);

  const updateClient = useCallback(async (id: string, data: Omit<Client, 'id'>) => {
    const c = await api<Client>('clients', { method: 'PUT', body: { id, ...data } });
    await refreshClients();
    return c;
  }, [refreshClients]);

  const deleteClient = useCallback(async (id: string) => {
    await api('clients', { method: 'DELETE', query: { id } });
    await refreshClients();
  }, [refreshClients]);

  // ——— Виды топлива ———

  const createFuelType = useCallback(async (data: Omit<FuelType, 'id'>) => {
    const f = await api<FuelType>('fuel-types', { method: 'POST', body: data });
    await refreshFuelTypes();
    return f;
  }, [refreshFuelTypes]);

  const updateFuelType = useCallback(async (id: string, data: Omit<FuelType, 'id'>) => {
    const f = await api<FuelType>('fuel-types', { method: 'PUT', body: { id, ...data } });
    await refreshFuelTypes();
    return f;
  }, [refreshFuelTypes]);

  const deleteFuelType = useCallback(async (id: string) => {
    await api('fuel-types', { method: 'DELETE', query: { id } });
    await refreshFuelTypes();
  }, [refreshFuelTypes]);

  // ——— Топливные карты ———

  const createFuelCard = useCallback(async (payload: {
    code: string;
    idx: number;
    fuel_type_id: string;
    client_id: string;
    daily_limit: number;
  }) => {
    const res = await api<{ items: FuelCard[] }>('fuel-cards', { method: 'POST', body: payload });
    await refreshFuelCards();
    return res.items;
  }, [refreshFuelCards]);

  const updateFuelCard = useCallback(async (
    id: string,
    payload: {
      fuel_type_id: string;
      client_id: string;
      daily_limit: number;
      balance: number;
      code: string;
      idx: number;
    },
  ) => {
    const c = await api<FuelCard>('fuel-cards', { method: 'PUT', body: { id, ...payload } });
    await refreshFuelCards();
    return c;
  }, [refreshFuelCards]);

  const deleteFuelCard = useCallback(async (id: string) => {
    await api('fuel-cards', { method: 'DELETE', query: { id } });
    await refreshFuelCards();
  }, [refreshFuelCards]);

  const blockFuelCard = useCallback(async (id: string, reason: string) => {
    const c = await api<FuelCard>('fuel-cards', {
      method: 'POST',
      query: { action: 'block' },
      body: { id, reason },
    });
    await refreshFuelCards();
    return c;
  }, [refreshFuelCards]);

  const unblockFuelCard = useCallback(async (id: string) => {
    const c = await api<FuelCard>('fuel-cards', {
      method: 'POST',
      query: { action: 'unblock' },
      body: { id },
    });
    await refreshFuelCards();
    return c;
  }, [refreshFuelCards]);

  const topupFuelCard = useCallback(async (id: string, amount: number) => {
    const c = await api<FuelCard>('fuel-cards', {
      method: 'POST',
      query: { action: 'topup' },
      body: { id, amount },
    });
    await refreshFuelCards();
    return c;
  }, [refreshFuelCards]);

  const moveFuelCard = useCallback(async (fromId: string, toId: string, amount: number, toAmount?: number) => {
    const res = await api<{ items: FuelCard[] }>('fuel-cards', {
      method: 'POST',
      query: { action: 'move' },
      body: { from_id: fromId, to_id: toId, amount, to_amount: toAmount },
    });
    await refreshFuelCards();
    return res.items;
  }, [refreshFuelCards]);

  // ——— Дисконтные карты ———

  const createDiscountCard = useCallback(async (data: Omit<DiscountCard, 'id'>) => {
    const d = await api<DiscountCard>('discount-cards', { method: 'POST', body: data });
    await refreshDiscountCards();
    return d;
  }, [refreshDiscountCards]);

  const updateDiscountCard = useCallback(async (id: string, data: Omit<DiscountCard, 'id'>) => {
    const d = await api<DiscountCard>('discount-cards', { method: 'PUT', body: { id, ...data } });
    await refreshDiscountCards();
    return d;
  }, [refreshDiscountCards]);

  const deleteDiscountCard = useCallback(async (id: string) => {
    await api('discount-cards', { method: 'DELETE', query: { id } });
    await refreshDiscountCards();
  }, [refreshDiscountCards]);

  // ——— Талоны ———

  const createCoupon = useCallback(async (data: Omit<Coupon, 'id'>) => {
    const t = await api<Coupon>('coupons', { method: 'POST', body: data });
    await refreshCoupons();
    return t;
  }, [refreshCoupons]);

  const updateCoupon = useCallback(async (id: string, data: Omit<Coupon, 'id'>) => {
    const t = await api<Coupon>('coupons', { method: 'PUT', body: { id, ...data } });
    await refreshCoupons();
    return t;
  }, [refreshCoupons]);

  const deleteCoupon = useCallback(async (id: string) => {
    await api('coupons', { method: 'DELETE', query: { id } });
    await refreshCoupons();
  }, [refreshCoupons]);

  return (
    <StoreCtx.Provider
      value={{
        managers,
        loadingManagers,
        clients,
        loadingClients,
        fuelTypes,
        loadingFuelTypes,
        fuelCards,
        loadingFuelCards,
        discountCards,
        loadingDiscountCards,
        coupons,
        loadingCoupons,

        refreshAll,

        createManager,
        updateManager,
        deleteManager,

        createClient,
        updateClient,
        deleteClient,

        createFuelType,
        updateFuelType,
        deleteFuelType,

        createFuelCard,
        updateFuelCard,
        deleteFuelCard,
        blockFuelCard,
        unblockFuelCard,
        topupFuelCard,
        moveFuelCard,

        createDiscountCard,
        updateDiscountCard,
        deleteDiscountCard,

        createCoupon,
        updateCoupon,
        deleteCoupon,
      }}
    >
      {children}
    </StoreCtx.Provider>
  );
};

export const useStore = () => {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};