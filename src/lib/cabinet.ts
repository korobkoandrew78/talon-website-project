// Общие типы и демо-данные для кабинетов «Талан».
// Данные хранятся в состоянии React (первая версия, без бэкенда).

export type SectionKey =
  | 'fuel'
  | 'stations'
  | 'clients'
  | 'fuelCards'
  | 'operations'
  | 'discountCards'
  | 'coupons';

export interface SectionMeta {
  key: SectionKey;
  label: string;
  icon: string;
}

export const SECTIONS: SectionMeta[] = [
  { key: 'fuel', label: 'Виды топлива', icon: 'Fuel' },
  { key: 'stations', label: 'АЗС', icon: 'MapPin' },
  { key: 'clients', label: 'Клиенты', icon: 'Users' },
  { key: 'fuelCards', label: 'Топливные карты', icon: 'CreditCard' },
  { key: 'operations', label: 'Операции', icon: 'ListOrdered' },
  { key: 'discountCards', label: 'Бонусные карты', icon: 'BadgePercent' },
  { key: 'coupons', label: 'Талоны', icon: 'Ticket' },
];

export const sectionMeta = (key: SectionKey): SectionMeta =>
  SECTIONS.find((s) => s.key === key) as SectionMeta;

// ——— Менеджеры ———
export interface Manager {
  id: string;
  login: string;
  password: string;
  fullName: string;
  phone: string;
  status: 'active' | 'blocked';
  readOnly: boolean;
  sections: SectionKey[];
}

// ——— Виды топлива ———
export type Unit = 'литр' | 'шт' | 'руб';

export interface FuelType {
  id: string;
  name: string;
  code1c: string;
  price: number;
  unit: Unit;
}

// Короткое отображение единицы измерения (литр → л, шт → шт, руб → ₽).
export const unitShort = (unit: Unit | string): string => {
  switch (unit) {
    case 'литр':
      return 'л';
    case 'руб':
      return '₽';
    case 'шт':
    default:
      return 'шт';
  }
};

// ——— АЗС ———
export interface Station {
  id: string;
  name: string;
  code1c: string;
  address: string;
}

// ——— Клиенты ———
export type ClientSection = 'fuelCards' | 'discountCards' | 'coupons' | 'operations';

// Клиент — реквизиты компании. Логин/пароль/доступ хранятся отдельно
// в учётных записях (ClientAccount) — у одной компании их может быть несколько.
export interface Client {
  id: string;
  inn: string;
  name: string;
  phone: string;
  email: string;
}

export interface ClientAccount {
  id: string;
  clientId: string;
  login: string;
  password: string;
  readOnly: boolean;
  sections: ClientSection[];
}

// ——— Топливные карты ———
export type CardStatus = 'active' | 'blocked';

export interface FuelCard {
  id: string;
  code: string; // '0000'..'9999'
  index: number; // 1..9
  fuelTypeId: string;
  clientId: string;
  balance: number;
  price: number; // может быть отрицательной, нулевой или положительной
  status: CardStatus;
  blockReason: string;
  dailyLimit: number;
  activatedAt: string; // ISO date
  blockedAt: string; // ISO date | ''
}

export const cardNumber = (c: Pick<FuelCard, 'code' | 'index'>) =>
  `${c.code}/${c.index}`;

export const isBalanceCard = (c: Pick<FuelCard, 'code'>) => c.code === '0000';

// ——— Дисконтные карты ———
export interface DiscountCard {
  id: string;
  number: string;
  clientId: string;
  discount: number; // %
  bonus: number; // накопленные бонусы
  status: CardStatus;
}

// ——— Журнал операций по топливным картам ———
// Фиксируются только операции с движением топлива. Блокировка/разблокировка/
// создание/изменение/удаление карт в журнал не попадают.
export type OperationType =
  | 'topup'
  | 'refuel'
  | 'move_out'
  | 'move_in';

export const OPERATION_LABELS: Record<OperationType, string> = {
  topup: 'Пополнение',
  refuel: 'Заправка',
  move_out: 'Перемещение (списание)',
  move_in: 'Перемещение (оприходование)',
};

export interface FuelCardOperation {
  id: string;
  createdAt: string; // ISO datetime
  fuelCardId: string;
  cardNumber: string;
  clientId: string;
  clientName: string;
  fuelTypeId: string;
  fuelName: string;
  stationId: string;
  stationName: string;
  operation: OperationType;
  quantity: number;
  price: number;
  amount: number;
  comment: string;
}

// ——— Талоны ———
export interface Coupon {
  id: string;
  number: string;
  fuelTypeId: string;
  clientId: string;
  volume: number;
  status: 'active' | 'used' | 'blocked';
  issuedAt: string;
}

export const today = () => new Date().toISOString().slice(0, 10);

let counter = 1000;
export const uid = (prefix = 'id') => `${prefix}_${(counter += 1)}`;

// ——— Демо-данные ———
export const initialManagers: Manager[] = [
  {
    id: 'm_1',
    login: 'ivanov',
    password: 'Manager1!',
    fullName: 'Иванов Иван Иванович',
    phone: '+7 900 111-22-33',
    status: 'active',
    readOnly: false,
    sections: ['fuel', 'clients', 'fuelCards', 'discountCards', 'coupons'],
  },
  {
    id: 'm_2',
    login: 'petrova',
    password: 'Manager2!',
    fullName: 'Петрова Анна Сергеевна',
    phone: '+7 900 222-33-44',
    status: 'active',
    readOnly: true,
    sections: ['clients', 'fuelCards'],
  },
  {
    id: 'm_3',
    login: 'sidorov',
    password: 'Manager3!',
    fullName: 'Сидоров Пётр Николаевич',
    phone: '+7 900 333-44-55',
    status: 'blocked',
    readOnly: false,
    sections: ['coupons', 'discountCards'],
  },
];

export const initialFuelTypes: FuelType[] = [
  { id: 'f_1', name: 'АИ-92', code1c: '00-0001', price: 52.4, unit: 'литр' },
  { id: 'f_2', name: 'АИ-95', code1c: '00-0002', price: 56.9, unit: 'литр' },
  { id: 'f_3', name: 'АИ-98', code1c: '00-0003', price: 64.2, unit: 'литр' },
  { id: 'f_4', name: 'ДТ', code1c: '00-0004', price: 61.1, unit: 'литр' },
  { id: 'f_5', name: 'Газ (СУГ)', code1c: '00-0005', price: 28.7, unit: 'литр' },
];

export const initialClients: Client[] = [
  {
    id: 'c_1',
    inn: '7801234567',
    name: 'АвтоТранс-Логистик',
    phone: '+7 812 100-10-10',
    email: 'office@autotrans.ru',
  },
  {
    id: 'c_2',
    inn: '7809876543',
    name: 'СтройПарк',
    phone: '+7 812 200-20-20',
    email: 'info@stroypark.ru',
  },
  {
    id: 'c_3',
    inn: '7811122334',
    name: 'ГрузСервис 24',
    phone: '+7 812 300-30-30',
    email: 'mail@gruzservice24.ru',
  },
];

export const initialClientAccounts: ClientAccount[] = [
  {
    id: 'ca_1',
    clientId: 'c_1',
    login: 'autotrans',
    password: 'Client1!',
    readOnly: false,
    sections: ['fuelCards', 'discountCards', 'coupons', 'operations'],
  },
  {
    id: 'ca_2',
    clientId: 'c_1',
    login: 'auto2',
    password: 'Client1View!',
    readOnly: true,
    sections: ['fuelCards', 'coupons', 'operations'],
  },
  {
    id: 'ca_3',
    clientId: 'c_2',
    login: 'stroypark',
    password: 'Client2!',
    readOnly: true,
    sections: ['fuelCards', 'coupons', 'operations'],
  },
  {
    id: 'ca_4',
    clientId: 'c_3',
    login: 'gruz24',
    password: 'Client3!',
    readOnly: false,
    sections: ['fuelCards', 'discountCards', 'coupons', 'operations'],
  },
];

export const initialFuelCards: FuelCard[] = [
  {
    id: 'fc_1',
    code: '0001',
    index: 1,
    fuelTypeId: 'f_1',
    clientId: 'c_1',
    balance: 12400,
    price: 0,
    status: 'active',
    blockReason: '',
    dailyLimit: 5000,
    activatedAt: '2025-11-04',
    blockedAt: '',
  },
  {
    id: 'fc_2',
    code: '0000',
    index: 1,
    fuelTypeId: 'f_1',
    clientId: 'c_1',
    balance: 0,
    price: 0,
    status: 'active',
    blockReason: '',
    dailyLimit: 0,
    activatedAt: '2025-11-04',
    blockedAt: '',
  },
  {
    id: 'fc_3',
    code: '0002',
    index: 1,
    fuelTypeId: 'f_4',
    clientId: 'c_3',
    balance: 8300,
    price: 0,
    status: 'blocked',
    blockReason: 'Просрочена оплата',
    dailyLimit: 3000,
    activatedAt: '2025-10-18',
    blockedAt: '2026-01-12',
  },
];

export const initialDiscountCards: DiscountCard[] = [
  { id: 'd_1', number: 'DC-1001', clientId: 'c_1', discount: 5, bonus: 3400, status: 'active' },
  { id: 'd_2', number: 'DC-1002', clientId: 'c_3', discount: 3, bonus: 1200, status: 'active' },
  { id: 'd_3', number: 'DC-1003', clientId: 'c_2', discount: 7, bonus: 8900, status: 'blocked' },
];

export const initialCoupons: Coupon[] = [
  { id: 't_1', number: 'T-500-01', fuelTypeId: 'f_1', clientId: 'c_1', volume: 500, status: 'active', issuedAt: '2026-01-10' },
  { id: 't_2', number: 'T-300-02', fuelTypeId: 'f_4', clientId: 'c_3', volume: 300, status: 'used', issuedAt: '2025-12-22' },
  { id: 't_3', number: 'T-200-03', fuelTypeId: 'f_2', clientId: 'c_2', volume: 200, status: 'active', issuedAt: '2026-01-15' },
];