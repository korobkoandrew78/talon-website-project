import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { useStore } from '@/lib/store';
import { Client, ClientSection as CS, uid } from '@/lib/cabinet';
import { usePagination } from '@/hooks/use-pagination';
import DataPagination from '@/components/cabinet/DataPagination';
import { Field, inputCls, SwitchRow } from '@/components/cabinet/Field';
import {
  SectionHeader,
  AddButton,
  RowAction,
  TableCard,
  Th,
  SectionIcons,
  SectionPicker,
} from '@/components/cabinet/ui';

const CLIENT_SECTION_OPTIONS = [
  { key: 'fuelCards', label: 'Топливные карты', icon: 'CreditCard' },
  { key: 'discountCards', label: 'Бонусные карты', icon: 'BadgePercent' },
  { key: 'coupons', label: 'Талоны', icon: 'Ticket' },
];

const empty = (): Client => ({
  id: '',
  inn: '',
  name: '',
  phone: '',
  email: '',
  login: '',
  password: '',
  readOnly: false,
  sections: [],
});

const ClientsSection = ({ readOnly = false }: { readOnly?: boolean }) => {
  const { clients, setClients } = useStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Client>(empty());
  const [fInn, setFInn] = useState('');
  const [fName, setFName] = useState('');

  const filtered = useMemo(
    () =>
      clients.filter(
        (c) =>
          c.inn.toLowerCase().includes(fInn.trim().toLowerCase()) &&
          c.name.toLowerCase().includes(fName.trim().toLowerCase()),
      ),
    [clients, fInn, fName],
  );
  const { page, setPage, pageCount, pageItems } = usePagination(filtered);

  const edit = (c: Client) => {
    setDraft({ ...c });
    setOpen(true);
  };
  const create = () => {
    setDraft(empty());
    setOpen(true);
  };
  const save = () => {
    if (!draft.name.trim() || !draft.inn.trim()) return;
    if (draft.id) setClients((p) => p.map((c) => (c.id === draft.id ? draft : c)));
    else setClients((p) => [...p, { ...draft, id: uid('c') }]);
    setOpen(false);
  };
  const remove = (id: string) => setClients((p) => p.filter((c) => c.id !== id));

  return (
    <>
      <SectionHeader
        subtitle="Раздел"
        title="Клиенты"
        action={!readOnly && <AddButton label="Новый клиент" onClick={create} />}
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className={inputCls + ' pl-9'}
            placeholder="Фильтр по ИНН"
            value={fInn}
            onChange={(e) => setFInn(e.target.value)}
          />
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className={inputCls + ' pl-9'}
            placeholder="Фильтр по наименованию"
            value={fName}
            onChange={(e) => setFName(e.target.value)}
          />
        </div>
      </div>

      <TableCard>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <Th>ИНН</Th>
                <Th>Наименование</Th>
                <Th>Телефон</Th>
                <Th>Почта</Th>
                <Th>Только просмотр</Th>
                <Th>Разделы</Th>
                {!readOnly && <Th right>Действия</Th>}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                  <td className="px-4 py-3 text-muted-foreground">{c.inn}</td>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                  <td className="px-4 py-3">{c.readOnly ? 'Да' : 'Нет'}</td>
                  <td className="px-4 py-3"><SectionIcons keys={c.sections} /></td>
                  {!readOnly && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <RowAction icon="Pencil" label="Изменить" onClick={() => edit(c)} />
                        <RowAction icon="Trash2" label="Удалить" danger onClick={() => remove(c.id)} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    Нет записей
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <DataPagination page={page} pageCount={pageCount} onChange={setPage} />
      </TableCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? 'Изменить клиента' : 'Новый клиент'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <Field label="ИНН">
                <input className={inputCls} value={draft.inn} onChange={(e) => setDraft({ ...draft, inn: e.target.value })} />
              </Field>
              <Field label="Телефон">
                <input className={inputCls} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              </Field>
            </div>
            <Field label="Наименование">
              <input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label="Почта">
              <input className={inputCls} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Логин">
                <input className={inputCls} value={draft.login} onChange={(e) => setDraft({ ...draft, login: e.target.value })} />
              </Field>
              <Field label="Пароль">
                <input className={inputCls} value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
              </Field>
            </div>
            <SwitchRow
              label="Режим «только просмотр»"
              checked={draft.readOnly}
              onChange={(v) => setDraft({ ...draft, readOnly: v })}
            />
            <Field label="Доступные разделы">
              <SectionPicker
                options={CLIENT_SECTION_OPTIONS}
                value={draft.sections}
                onChange={(v) => setDraft({ ...draft, sections: v as CS[] })}
              />
            </Field>
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">
              Отмена
            </button>
            <button onClick={save} className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground">
              Сохранить
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClientsSection;
