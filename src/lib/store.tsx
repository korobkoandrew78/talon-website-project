import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import {
  Manager,
  FuelType,
  Client,
  FuelCard,
  DiscountCard,
  Coupon,
  initialManagers,
  initialFuelTypes,
  initialClients,
  initialFuelCards,
  initialDiscountCards,
  initialCoupons,
  today,
  uid,
} from './cabinet';

interface Store {
  managers: Manager[];
  fuelTypes: FuelType[];
  clients: Client[];
  fuelCards: FuelCard[];
  discountCards: DiscountCard[];
  coupons: Coupon[];

  setManagers: React.Dispatch<React.SetStateAction<Manager[]>>;
  setFuelTypes: React.Dispatch<React.SetStateAction<FuelType[]>>;
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  setFuelCards: React.Dispatch<React.SetStateAction<FuelCard[]>>;
  setDiscountCards: React.Dispatch<React.SetStateAction<DiscountCard[]>>;
  setCoupons: React.Dispatch<React.SetStateAction<Coupon[]>>;

  // Создание карты + авто-создание балансной карты (код 0000).
  createFuelCard: (card: FuelCard) => void;
}

const StoreCtx = createContext<Store | null>(null);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [managers, setManagers] = useState<Manager[]>(initialManagers);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>(initialFuelTypes);
  const [clients, setClients] = useState<Client[]>(initialClients);
  const [fuelCards, setFuelCards] = useState<FuelCard[]>(initialFuelCards);
  const [discountCards, setDiscountCards] = useState<DiscountCard[]>(initialDiscountCards);
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);

  const createFuelCard = useCallback((card: FuelCard) => {
    setFuelCards((prev) => {
      const next = [...prev, card];

      // Балансную карту (0000) вручную не дублируем автосозданием.
      if (card.code === '0000') return next;

      // Проверяем: есть ли у клиента балансная карта с таким же видом топлива.
      const hasBalance = prev.some(
        (c) =>
          c.code === '0000' &&
          c.clientId === card.clientId &&
          c.fuelTypeId === card.fuelTypeId,
      );
      if (hasBalance) return next;

      // Первый свободный индекс 1..9 для балансных карт этого клиента.
      const usedIdx = new Set(
        prev
          .filter((c) => c.code === '0000' && c.clientId === card.clientId)
          .map((c) => c.index),
      );
      let freeIdx = 0;
      for (let i = 1; i <= 9; i += 1) {
        if (!usedIdx.has(i)) {
          freeIdx = i;
          break;
        }
      }
      if (freeIdx === 0) return next; // все индексы заняты

      next.push({
        id: uid('fc'),
        code: '0000',
        index: freeIdx,
        fuelTypeId: card.fuelTypeId,
        clientId: card.clientId,
        balance: 0,
        status: 'active',
        blockReason: '',
        dailyLimit: 0,
        activatedAt: today(),
        blockedAt: '',
      });
      return next;
    });
  }, []);

  return (
    <StoreCtx.Provider
      value={{
        managers,
        fuelTypes,
        clients,
        fuelCards,
        discountCards,
        coupons,
        setManagers,
        setFuelTypes,
        setClients,
        setFuelCards,
        setDiscountCards,
        setCoupons,
        createFuelCard,
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