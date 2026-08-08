import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import { useStore } from '@/lib/store';
import { ApiError } from '@/lib/api';
import { Client, ClientAccount, ClientSection as CS } from '@/lib/cabinet';
import { printClientInstruction } from '@/components/cabinet/printClientInstruction';
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
  { key: 'operations', label: 'Операции', icon: 'ListOrdered' },
];

const empty = (): Client => ({
  id: '',
  inn: '',
  name: '',
  phone: '',
  email: '',
});

const emptyAccount = (clientId: string): ClientAccount => ({
  id: '',
  clientId,
  login: '',
  password: '',
  readOnly: false,
  sections: [],
});

const ClientsSection = ({ readOnly = false }: { readOnly?: boolean }) => {
  const {
    clients,
    loadingClients,
    fuelCards,
    fuelTypes,
    createClient,
    updateClient,
    deleteClient,
    fetchClientAccounts,
    createClientAccount,
    updateClientAccount,
    deleteClientAccount,
  } = useStore();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Client>(empty());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [fInn, setFInn] = useState('');
  const [fName, setFName] = useState('');
  const [printingId, setPrintingId] = useState('');

  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountDraft, setAccountDraft] = useState<ClientAccount>(emptyAccount(''));
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState('');

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

  const loadAccounts = async (clientId: string) => {
    setAccountsLoading(true);
    try {
      const items = await fetchClientAccounts(clientId);
      setAccounts(items);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось загрузить учётные записи');
    } finally {
      setAccountsLoading(false);
    }
  };

  const edit = (c: Client) => {
    setDraft({ ...c });
    setFormError('');
    setAccounts([]);
    setOpen(true);
    loadAccounts(c.id);
  };
  const create = () => {
    setDraft(empty());
    setFormError('');
    setAccounts([]);
    setOpen(true);
  };
  const save = async () => {
    if (!draft.name.trim() || !draft.inn.trim()) return;
    setSaving(true);
    setFormError('');
    try {
      const { id, ...data } = draft;
      if (id) {
        await updateClient(id, data);
      } else {
        const c = await createClient(data);
        setDraft(c);
        setAccounts([]);
      }
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Не удалось сохранить клиента');
    } finally {
      setSaving(false);
    }
  };
  const remove = async (id: string) => {
    try {
      await deleteClient(id);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось удалить клиента');
    }
  };

  const printInstruction = async (c: Client) => {
    setPrintingId(c.id);
    try {
      const clientAccounts = await fetchClientAccounts(c.id);
      const clientCards = fuelCards.filter((f) => f.clientId === c.id);
      printClientInstruction(c, clientAccounts, clientCards, fuelTypes);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось сформировать инструкцию');
    } finally {
      setPrintingId('');
    }
  };

  const openAccountCreate = () => {
    setAccountDraft(emptyAccount(draft.id));
    setAccountError('');
    setAccountOpen(true);
  };
  const openAccountEdit = (a: ClientAccount) => {
    setAccountDraft({ ...a });
    setAccountError('');
    setAccountOpen(true);
  };
  const saveAccount = async () => {
    if (!accountDraft.login.trim() || !accountDraft.password.trim()) {
      setAccountError('Укажите логин и пароль');
      return;
    }
    setAccountSaving(true);
    setAccountError('');
    try {
      const { id, ...data } = accountDraft;
      if (id) await updateClientAccount(id, data);
      else await createClientAccount(data);
      setAccountOpen(false);
      await loadAccounts(draft.id);
    } catch (e) {
      setAccountError(e instanceof ApiError ? e.message : 'Не удалось сохранить учётную запись');
    } finally {
      setAccountSaving(false);
    }
  };
  const removeAccount = async (id: string) => {
    try {
      await deleteClientAccount(id);
      await loadAccounts(draft.id);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось удалить учётную запись');
    }
  };

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
                  {!readOnly && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <RowAction
                          icon={printingId === c.id ? 'Loader2' : 'Printer'}
                          label="Печать инструкции пользователя"
                          onClick={() => printInstruction(c)}
                        />
                        <RowAction icon="Pencil" label="Изменить" onClick={() => edit(c)} />
                        <RowAction icon="Trash2" label="Удалить" danger onClick={() => remove(c.id)} />
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    {loadingClients ? 'Загрузка…' : 'Нет записей'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <DataPagination page={page} pageCount={pageCount} onChange={setPage} />
      </TableCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent key={draft.id || 'new'} className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? 'Изменить клиента' : 'Новый клиент'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
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
            {formError && (
              <p className="flex items-center gap-2 text-sm text-accent">
                <Icon name="TriangleAlert" size={15} /> {formError}
              </p>
            )}

            <div className="rounded-xl border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[0.72rem] uppercase tracking-[0.12em] text-muted-foreground">
                  Учётные записи для входа
                </span>
                {!readOnly && draft.id && (
                  <button
                    onClick={openAccountCreate}
                    className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary"
                  >
                    <Icon name="Plus" size={13} /> Добавить
                  </button>
                )}
              </div>

              {!draft.id && (
                <p className="text-xs text-muted-foreground">
                  Сначала сохраните клиента — после этого можно будет добавить учётные записи.
                </p>
              )}

              {draft.id && (
                <div className="space-y-2">
                  {accountsLoading && <p className="text-xs text-muted-foreground">Загрузка…</p>}
                  {!accountsLoading && accounts.length === 0 && (
                    <p className="text-xs text-muted-foreground">Учётных записей пока нет</p>
                  )}
                  {accounts.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{a.login}</span>
                        {a.readOnly && (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[0.65rem] text-muted-foreground">
                            только просмотр
                          </span>
                        )}
                        <SectionIcons keys={a.sections} />
                      </div>
                      {!readOnly && (
                        <div className="flex gap-1.5">
                          <RowAction icon="Pencil" label="Изменить" onClick={() => openAccountEdit(a)} />
                          <RowAction icon="Trash2" label="Удалить" danger onClick={() => removeAccount(a.id)} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">
              {draft.id ? 'Закрыть' : 'Отмена'}
            </button>
            {!readOnly && (
              <button
                onClick={save}
                disabled={saving}
                className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Сохранение…' : draft.id ? 'Сохранить' : 'Создать'}
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
        <DialogContent key={accountDraft.id || 'new-account'} className="max-w-md">
          <DialogHeader>
            <DialogTitle>{accountDraft.id ? 'Изменить учётную запись' : 'Новая учётная запись'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Логин">
                <input
                  className={inputCls}
                  value={accountDraft.login}
                  onChange={(e) => setAccountDraft({ ...accountDraft, login: e.target.value })}
                />
              </Field>
              <Field label="Пароль">
                <input
                  className={inputCls}
                  value={accountDraft.password}
                  onChange={(e) => setAccountDraft({ ...accountDraft, password: e.target.value })}
                />
              </Field>
            </div>
            <SwitchRow
              label="Режим «только просмотр»"
              checked={accountDraft.readOnly}
              onChange={(v) => setAccountDraft({ ...accountDraft, readOnly: v })}
            />
            <Field label="Доступные разделы">
              <SectionPicker
                options={CLIENT_SECTION_OPTIONS}
                value={accountDraft.sections}
                onChange={(v) => setAccountDraft({ ...accountDraft, sections: v as CS[] })}
              />
            </Field>
            {accountError && (
              <p className="flex items-center gap-2 text-sm text-accent">
                <Icon name="TriangleAlert" size={15} /> {accountError}
              </p>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setAccountOpen(false)} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">
              Отмена
            </button>
            <button
              onClick={saveAccount}
              disabled={accountSaving}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {accountSaving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClientsSection;