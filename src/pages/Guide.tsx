import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';

const LOGO =
  'https://cdn.poehali.dev/projects/cc75541e-6a4b-4243-9045-839da83c8672/bucket/288ee4f1-d06e-472f-b7f8-c10a8b03ae64.png';

const HERO_IMG = 'https://cdn.poehali.dev/projects/cc75541e-6a4b-4243-9045-839da83c8672/files/196dc814-9813-4069-8b87-58276b58d7a1.jpg';
const NAV_IMG = 'https://cdn.poehali.dev/projects/cc75541e-6a4b-4243-9045-839da83c8672/files/b44d838d-b298-40a9-842c-e16e61a17720.jpg';
const CARD_IMG = 'https://cdn.poehali.dev/projects/cc75541e-6a4b-4243-9045-839da83c8672/files/23a55b92-0b28-422a-8b43-f6f4ba3549f2.jpg';

interface Section {
  id: string;
  icon: string;
  title: string;
  intro: string;
  points: string[];
  image?: string;
}

const sections: Section[] = [
  {
    id: 'nav',
    icon: 'LayoutDashboard',
    title: 'Навигация по кабинету',
    intro: 'Все разделы кабинета расположены в боковом меню слева (на телефоне — в горизонтальной прокрутке сверху). Доступный набор разделов зависит от прав, которые администратор выдал менеджеру.',
    points: [
      'Кликните по разделу в меню — содержимое справа обновится без перезагрузки страницы',
      'Если раздела нет в списке — обратитесь к администратору, чтобы включить доступ',
      'Режим «только просмотр» отключает кнопки создания/изменения, но данные видны',
      'Кнопка «Инструкция» рядом с «Выйти» всегда откроет эту страницу',
    ],
    image: NAV_IMG,
  },
  {
    id: 'fuel',
    icon: 'Fuel',
    title: 'Виды топлива',
    intro: 'Справочник видов топлива (АИ-92, АИ-95, ДТ и т.д.) с ценами и единицами измерения. Цена вида топлива используется как цена по умолчанию при пополнении и заправке.',
    points: [
      '«Новый вид» — добавить вид топлива: название, код 1С, цена, единица измерения',
      'Иконка карандаша — изменить существующий вид, иконка корзины — удалить',
      'Изменение цены здесь не пересчитывает уже прошедшие операции — только новые',
    ],
  },
  {
    id: 'stations',
    icon: 'MapPin',
    title: 'АЗС',
    intro: 'Справочник заправочных станций сети. Список станций используется при регистрации заправки на топливной карте.',
    points: [
      '«Новая АЗС» — добавить станцию: название, код 1С, адрес',
      'Удалить станцию можно, если по ней больше не планируются операции',
    ],
  },
  {
    id: 'clients',
    icon: 'Users',
    title: 'Клиенты',
    intro: 'Карточка клиента хранит реквизиты компании (ИНН, название, телефон, почта). Вход в личный кабинет клиента настраивается отдельно — через учётные записи внутри карточки клиента.',
    points: [
      '«Новый клиент» — создать компанию, указав ИНН и наименование',
      'Внутри карточки клиента — блок «Учётные записи для входа»: можно добавить несколько логинов на одну компанию',
      'У каждой учётной записи свои настройки: пароль, режим «только просмотр» и список доступных разделов личного кабинета клиента',
      'Например, у одной компании может быть логин с полным доступом для бухгалтера и второй логин «только просмотр» для водителя',
    ],
  },
  {
    id: 'fuelCards',
    icon: 'CreditCard',
    title: 'Топливные карты',
    intro: 'Основной раздел учёта топлива клиентов. Номер карты состоит из кода (4 цифры) и индекса (1–9), например 0001/1. Карта с кодом 0000 — «балансная» карта, она создаётся автоматически при первом выпуске обычной карты клиента для нового вида топлива и хранит общий остаток.',
    points: [
      '«Новая карта» — код, индекс, клиент, вид топлива, дневной лимит и цена (может быть положительной, нулевой или отрицательной)',
      'Иконка замка — заблокировать карту с указанием причины; открытый замок — разблокировать',
      'Кнопка «+» — пополнить баланс карты на заданное количество',
      'Иконка стрелок — переместить топливо с одной карты на другую (в том числе между разными видами топлива — тогда указывается отдельное количество к зачислению)',
      'Все действия по карте попадают в журнал «Операции»',
    ],
    image: CARD_IMG,
  },
  {
    id: 'operations',
    icon: 'ListOrdered',
    title: 'Операции',
    intro: 'Журнал фиксирует только операции с движением топлива: пополнение, заправку и перемещение (списание/оприходование). Блокировки, создание и изменение карт в журнал не попадают.',
    points: [
      'Кнопка «Фильтр» открывает окно с фильтрами: период, номер карты, клиент, вид топлива, АЗС, тип операции',
      'Кнопка «Печать» формирует версию для печати со всеми отфильтрованными строками',
      '«Экспорт в Excel» выгружает те же данные в файл .xlsx',
      'Таблица на экране показывает столько строк, сколько помещается без прокрутки — переключайтесь между страницами внизу таблицы',
    ],
  },
  {
    id: 'reports',
    icon: 'FileBarChart2',
    title: 'Отчёты',
    intro: 'Раздел для формирования сводных отчётов по одному контрагенту за выбранный период.',
    points: [
      'Выберите период («Дата с», «Дата по») и контрагента',
      'Кнопка «Продажи» — отчёт только по заправкам за период, с группировкой по видам топлива и итогом по количеству и сумме',
      'Кнопка «Обороты» — отчёт по всем операциям за период: остаток на начало, приход, расход и остаток на конец периода по каждому виду топлива, с итоговой строкой',
      'У обоих отчётов есть кнопки «Печать» и «Экспорт в Excel»',
    ],
  },
  {
    id: 'discountCards',
    icon: 'BadgePercent',
    title: 'Бонусные карты',
    intro: 'Отдельные карты лояльности клиента с накопленной скидкой и бонусными баллами.',
    points: [
      '«Новая карта» — номер, клиент, размер скидки в %, количество бонусов, статус',
      'Статус «Активна»/«Заблокирована» переключается при редактировании карты',
    ],
  },
  {
    id: 'coupons',
    icon: 'Ticket',
    title: 'Талоны',
    intro: 'Талоны — фиксированный объём топлива по заранее оговорённой цене, без привязки к карте.',
    points: [
      '«Новый талон» — номер, вид топлива, клиент, объём, статус и дата выдачи',
      'Статусы: «Активен», «Использован», «Заблокирован»',
    ],
  },
];

const Guide = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="glow-scene fixed inset-0 -z-10 opacity-60" />

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-5 backdrop-blur-md md:px-8">
        <div className="flex items-center gap-3">
          <img src={LOGO} alt="Талан" className="h-8 rounded-lg bg-white px-2 py-1" />
          <span className="eyebrow hidden sm:block">Инструкция</span>
        </div>
        <button
          onClick={() => navigate('/manager')}
          className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary"
        >
          <Icon name="ArrowLeft" size={16} />
          В кабинет
        </button>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-12 md:px-8">
        <div className="mb-10 overflow-hidden rounded-2xl border border-border bg-card">
          <img src={HERO_IMG} alt="Инструкция по кабинету менеджера" className="h-56 w-full object-cover md:h-72" />
          <div className="p-8">
            <div className="eyebrow mb-3">Инструкция</div>
            <h1 className="font-head text-3xl font-medium tracking-tight md:text-4xl">
              Кабинет менеджера «Талан»
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Подробное описание всех разделов личного кабинета менеджера: что делает каждый раздел,
              какие кнопки за что отвечают и как правильно вести учёт топлива клиентов.
            </p>
          </div>
        </div>

        <nav className="mb-12 rounded-2xl border border-border bg-card p-6">
          <div className="eyebrow mb-4">Содержание</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Icon name={s.icon} size={16} />
                </span>
                {s.title}
              </a>
            ))}
          </div>
        </nav>

        <div className="space-y-8">
          {sections.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              className="scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-card"
            >
              {s.image && (
                <img src={s.image} alt={s.title} className="h-48 w-full object-cover md:h-56" />
              )}
              <div className="p-8">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Icon name={s.icon} size={20} />
                  </span>
                  <div>
                    <span className="font-head text-xs text-muted-foreground/60">{String(i + 1).padStart(2, '0')}</span>
                    <h2 className="font-head text-xl font-medium tracking-tight">{s.title}</h2>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{s.intro}</p>
                <ul className="mt-5 space-y-2.5 border-t border-border pt-5">
                  {s.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2.5 text-sm">
                      <Icon name="Check" size={15} className="mt-0.5 shrink-0 text-primary" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
          <Icon name="MessageCircleQuestion" size={28} className="text-primary" />
          <p className="max-w-md text-sm text-muted-foreground">
            Остались вопросы по работе с кабинетом? Обратитесь к администратору системы —
            он может изменить набор доступных вам разделов и права.
          </p>
          <button
            onClick={() => navigate('/manager')}
            className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-transform hover:-translate-y-0.5"
          >
            <Icon name="ArrowLeft" size={16} />
            Вернуться в кабинет
          </button>
        </div>
      </main>
    </div>
  );
};

export default Guide;
