import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';

const LOGO =
  'https://cdn.poehali.dev/projects/cc75541e-6a4b-4243-9045-839da83c8672/bucket/288ee4f1-d06e-472f-b7f8-c10a8b03ae64.png';

const HERO_IMG = 'https://cdn.poehali.dev/projects/cc75541e-6a4b-4243-9045-839da83c8672/files/23676ced-7750-4711-9bda-85e396300150.jpg';
const CARDS_IMG = 'https://cdn.poehali.dev/projects/cc75541e-6a4b-4243-9045-839da83c8672/files/c6eaa25a-c3f5-49f1-ab77-423221e5ae14.jpg';
const OPERATIONS_IMG = 'https://cdn.poehali.dev/projects/cc75541e-6a4b-4243-9045-839da83c8672/files/68a073ae-ebf6-4e53-ac32-542098d05d22.jpg';

interface Section {
  id: string;
  icon: string;
  title: string;
  intro: string;
  points: string[];
  example?: { title: string; text: string };
  image?: string;
}

const sections: Section[] = [
  {
    id: 'start',
    icon: 'LogIn',
    title: 'Вход в личный кабинет',
    intro: 'Кабинет открывается в браузере — не нужно ничего устанавливать. Достаточно знать сайт компании, логин и пароль, которые вам выдал менеджер.',
    points: [
      'Откройте сайт компании — адрес указан в разделе «Регистрационные данные»',
      'Введите логин и пароль в форму на главной странице и нажмите «Войти в личный кабинет»',
      'Если ввели пароль неправильно — сайт покажет ошибку, попробуйте ещё раз внимательно',
      'Забыли пароль — обратитесь к менеджеру, он выдаст новый',
    ],
    example: {
      title: 'Пример',
      text: 'Логин: autotrans, Пароль: Client1! — вводятся ровно так, как выданы, включая заглавные буквы и знаки.',
    },
  },
  {
    id: 'nav',
    icon: 'LayoutDashboard',
    title: 'Навигация по кабинету',
    intro: 'Все доступные вам разделы показаны в меню слева (на телефоне — прокрутка сверху). Набор разделов настраивает менеджер под вашу учётную запись.',
    points: [
      'Кликните по разделу — содержимое справа обновится без перезагрузки страницы',
      'В шапке сверху — карточка компании с ИНН, телефоном, почтой и вашим логином',
      'Если стоит пометка «Режим «только просмотр»» — вы видите данные, но не можете их менять',
      'Кнопки «Регистрационные данные» и «Инструкция» находятся в правом верхнем углу, рядом с кнопкой «Выйти»',
    ],
  },
  {
    id: 'fuelCards',
    icon: 'CreditCard',
    title: 'Топливные карты',
    intro: 'Раздел показывает все топливные карты вашей компании: остаток топлива, дневной лимит и статус каждой карты.',
    points: [
      'Номер карты состоит из кода и индекса, например 0001/1',
      'Карта с иконкой кошелька — «балансная»: на ней хранится общий остаток топлива по одному виду',
      'Зелёная точка — карта активна, красная — заблокирована (с указанием причины)',
      'Иконка со стрелками переносит топливо с одной вашей карты на другую',
      'Иконка датчика позволяет изменить дневной лимит расхода по карте',
    ],
    example: {
      title: 'Пример',
      text: 'Карта 0001/1 с балансом 12 400 л АИ-92 и дневным лимитом 5 000 л — водитель не сможет заправить за сутки больше лимита, даже если на карте есть остаток.',
    },
    image: CARDS_IMG,
  },
  {
    id: 'discountCards',
    icon: 'BadgePercent',
    title: 'Бонусные карты',
    intro: 'Отдельные карты лояльности со скидкой в процентах и накопленными бонусными баллами.',
    points: [
      'Колонка «Скидка» — процент, на который автоматически уменьшается цена при заправке',
      'Колонка «Бонусы» — накопленные баллы, которые менеджер может списывать в счёт оплаты',
      'Статус карты показывает, активна она сейчас или заблокирована',
    ],
  },
  {
    id: 'coupons',
    icon: 'Ticket',
    title: 'Талоны',
    intro: 'Талон — заранее оплаченный объём топлива по фиксированной цене, не привязанный к конкретной карте.',
    points: [
      'В таблице видно вид топлива, объём и статус талона',
      'Статус «Активен» — талон можно предъявить на заправке',
      'Статус «Использован» — топливо по талону уже выдано',
      'Статус «Заблокирован» — талон временно недоступен, уточните причину у менеджера',
    ],
  },
  {
    id: 'operations',
    icon: 'ListOrdered',
    title: 'Операции',
    intro: 'Журнал показывает историю движения топлива по вашим картам: пополнения, заправки и перемещения между картами.',
    points: [
      'Кнопка «Фильтр» открывает окно: можно выбрать период, конкретную карту, вид топлива, АЗС и тип операции',
      'Кнопка «Печать» формирует версию журнала для распечатки',
      '«Экспорт в Excel» выгружает отфильтрованные строки в файл .xlsx для бухгалтерии',
      'Внизу таблицы — переключение между страницами, если операций много',
    ],
    example: {
      title: 'Пример',
      text: 'Чтобы проверить расход топлива за июль по одной карте — откройте «Фильтр», укажите даты 01.07–31.07 и номер карты, нажмите «Применить».',
    },
    image: OPERATIONS_IMG,
  },
  {
    id: 'docs',
    icon: 'IdCard',
    title: 'Регистрационные данные и инструкция',
    intro: 'Две кнопки в правом верхнем углу кабинета помогают быстро получить нужную информацию.',
    points: [
      '«Регистрационные данные» — открывает и сразу готовит к печати страницу с реквизитами компании, списком топливных карт и вашим логином',
      '«Инструкция» — открывает эту страницу с подробным описанием работы в кабинете',
      'Обе страницы можно распечатать через диалог печати браузера (Ctrl+P или кнопка печати)',
    ],
  },
];

const ClientGuide = () => {
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
          onClick={() => navigate('/client')}
          className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary"
        >
          <Icon name="ArrowLeft" size={16} />
          В кабинет
        </button>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-12 md:px-8">
        <div className="mb-10 overflow-hidden rounded-2xl border border-border bg-card">
          <img src={HERO_IMG} alt="Инструкция по личному кабинету клиента" className="h-56 w-full object-cover md:h-72" />
          <div className="p-8">
            <div className="eyebrow mb-3">Инструкция</div>
            <h1 className="font-head text-3xl font-medium tracking-tight md:text-4xl">
              Личный кабинет клиента «Талан»
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Подробное описание работы с личным кабинетом: как войти, что показывает каждый раздел
              и как получить нужный документ или отчёт.
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
                {s.example && (
                  <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
                    <Icon name="Lightbulb" size={16} className="mt-0.5 shrink-0 text-primary" />
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{s.example.title}: </span>
                      {s.example.text}
                    </p>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
          <Icon name="MessageCircleQuestion" size={28} className="text-primary" />
          <p className="max-w-md text-sm text-muted-foreground">
            Остались вопросы по работе с кабинетом или нужно изменить логин, пароль либо доступные
            разделы? Обратитесь к вашему менеджеру в «Талан».
          </p>
          <button
            onClick={() => navigate('/client')}
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

export default ClientGuide;