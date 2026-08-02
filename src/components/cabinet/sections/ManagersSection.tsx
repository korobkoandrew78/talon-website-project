import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import Icon from '@/components/ui/icon';
import { useStore } from '@/lib/store';
import { ApiError } from '@/lib/api';
import { Manager, SectionKey } from '@/lib/cabinet';
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
  const { managers, loadingManagers, createManager, updateManager, deleteManager } = useStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Manager>(empty());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const { page, setPage, pageCount, pageItems } = usePagination(managers);

  const create = () => {
    setDraft(empty());
    setFormError('');
    setOpen(true);
  };
  const edit = (m: Manager) => {
    setDraft({ ...m });
    setFormError('');
    setOpen(true);
  };
  const save = async () => {
    if (!draft.login.trim() || !draft.fullName.trim()) return;
    setSaving(true);
    setFormError('');
    try {
      const { id, ...data } = draft;
      if (id) await updateManager(id, data);
      else await createManager(data);
      setOpen(false);
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Не удалось сохранить менеджера');
    } finally {
      setSaving(false);
    }
  };
  const remove = async (id: string) => {
    try {
      await deleteManager(id);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Не удалось удалить менеджера');
    }
  };

  return (
    <>
      <SectionHeader
        subtitle="Администратор"
        title="Менеджеры"
        action={<AddButton label="Новый менеджер" onClick={create} />}
      />
      <TableCard className="lg:w-3/4">
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
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    {loadingManagers ? 'Загрузка…' : 'Нет менеджеров'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <DataPagination page={page} pageCount={pageCount} onChange={setPage} />
      </TableCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent key={draft.id || 'new'} className="max-h-[85vh] max-w-md overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? 'Изменить менеджера' : 'Новый менеджер'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <Field label="ФИО">
              <input className={inputCls} value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
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
            <div className="flex items-center gap-4 rounded-xl border border-border px-3.5 py-2.5">
              <SwitchRow
                label="Активен"
                checked={draft.status === 'active'}
                onChange={(v) => setDraft({ ...draft, status: v ? 'active' : 'blocked' })}
                bare
              />
              <div className="h-5 w-px bg-border" />
              <SwitchRow
                label="Только просмотр"
                checked={draft.readOnly}
                onChange={(v) => setDraft({ ...draft, readOnly: v })}
                bare
              />
            </div>
            <Field label="Доступные разделы">
              <SectionPicker
                options={ALL_SECTION_OPTIONS}
                value={draft.sections}
                onChange={(v) => setDraft({ ...draft, sections: v as SectionKey[] })}
              />
            </Field>
            {formError && (
              <p className="flex items-center gap-2 text-sm text-accent">
                <Icon name="TriangleAlert" size={15} /> {formError}
              </p>
            )}
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary">Отмена</button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ManagersSection;