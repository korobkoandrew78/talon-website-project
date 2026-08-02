import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useStore } from '@/lib/store';
import { Manager, SectionKey, uid } from '@/lib/cabinet';
import { usePagination } from '@/hooks/use-pagination';
import DataPagination from '@/components/cabinet/DataPagination';
import { Field, inputCls, SwitchRow } from '@/components/cabinet/Field';
import {
  SectionHeader,
  AddButton,
  RowAction,
  TableCard,
  Th,
  StatusPill,
  SectionIcons,
  SectionPicker,
  ALL_SECTION_OPTIONS,
} from '@/components/cabinet/ui';

const empty = (): Manager => ({
  id: '',
  login: '',
  password: '',
  fullName: '',
  phone: '',
  status: 'active',
  readOnly: false,
  sections: [],
});

const ManagersSection = () => {
  const { managers, setManagers } = useStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Manager>(empty());
  const { page, setPage, pageCount, pageItems } = usePagination(managers);

  const create = () => {
    setDraft(empty());
    setOpen(true);
  };
  const edit = (m: Manager) => {
    setDraft({ ...m });
    setOpen(true);
  };
  const save = () => {
    if (!draft.login.trim() || !draft.fullName.trim()) return;
    if (draft.id) setManagers((p) => p.map((m) => (m.id === draft.id ? draft : m)));
    else setManagers((p) => [...p, { ...draft, id: uid('m') }]);
    setOpen(false);
  };
  const remove = (id: string) => setManagers((p) => p.filter((m) => m.id !== id));

  return (
    <>
      <SectionHeader
        subtitle="Администратор"
        title="Менеджеры"
        action={<AddButton label="Новый менеджер" onClick={create} />}
      />
      <TableCard>
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <Th>Логин</Th>
                <Th>Пароль</Th>
                <Th>ФИО</Th>
                <Th>Телефон</Th>
                <Th>Статус</Th>
                <Th>Только просмотр</Th>
                <Th>Разделы</Th>
                <Th right>Действия</Th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((m) => (
                <tr key={m.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                  <td className="px-4 py-3 font-medium">{m.login}</td>
                  <td className="px-4 py-3 font-mono text-muted-foreground">{m.password}</td>
                  <td className="px-4 py-3">{m.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.phone}</td>
                  <td className="px-4 py-3"><StatusPill active={m.status === 'active'} /></td>
                  <td className="px-4 py-3">{m.readOnly ? 'Да' : 'Нет'}</td>
                  <td className="px-4 py-3"><SectionIcons keys={m.sections} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      <RowAction icon="Pencil" label="Изменить" onClick={() => edit(m)} />
                      <RowAction icon="Trash2" label="Удалить" danger onClick={() => remove(m.id)} />
                    </div>
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">Нет менеджеров</td>
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
            <DialogTitle>{draft.id ? 'Изменить менеджера' : 'Новый менеджер'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Field label="ФИО">
              <input className={inputCls} value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Логин">
                <input className={inputCls} value={draft.login} onChange={(e) => setDraft({ ...draft, login: e.target.value })} />
              </Field>
              <Field label="Пароль">
                <input className={inputCls} value={draft.password} onChange={(e) => setDraft({ ...draft, password: e.target.value })} />
              </Field>
            </div>
            <Field label="Номер телефона">
              <input className={inputCls} value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <SwitchRow
                label="Активен"
                checked={draft.status === 'active'}
                onChange={(v) => setDraft({ ...draft, status: v ? 'active' : 'blocked' })}
              />
              <SwitchRow
                label="Только просмотр"
                checked={draft.readOnly}
                onChange={(v) => setDraft({ ...draft, readOnly: v })}
              />
            </div>
            <Field label="Доступные разделы">
              <SectionPicker
                options={ALL_SECTION_OPTIONS}
                value={draft.sections}
                onChange={(v) => setDraft({ ...draft, sections: v as SectionKey[] })}
              />
            </Field>
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">Отмена</button>
            <button onClick={save} className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground">Сохранить</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ManagersSection;
