import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';

const ADMIN_LOGIN = 'Pi0neer78';
const ADMIN_PASSWORD = 'Tytparol1!';

const LoginPanel = () => {
  const navigate = useNavigate();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
      setError('');
      navigate('/admin');
      return;
    }
    setError('Неверный логин или пароль');
  };

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm justify-self-end rounded-2xl border border-border bg-card p-8 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)]"
    >
      <h2 className="font-head text-2xl font-medium tracking-tight">
        Вход в кабинет
      </h2>
      <p className="mt-1 mb-7 text-sm text-muted-foreground">
        Для клиентов автопарков и менеджеров «Талан».
      </p>

      <div className="mb-4">
        <label
          htmlFor="login"
          className="mb-2 block text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground"
        >
          Логин
        </label>
        <input
          id="login"
          type="text"
          autoComplete="username"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          placeholder="Номер договора или логин"
          className="w-full rounded-xl border border-transparent bg-secondary px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
        />
      </div>

      <div className="mb-2">
        <label
          htmlFor="password"
          className="mb-2 block text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground"
        >
          Пароль
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPass ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-transparent bg-secondary px-4 py-3 pr-11 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showPass ? 'Скрыть пароль' : 'Показать пароль'}
          >
            <Icon name={showPass ? 'EyeOff' : 'Eye'} size={18} />
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-2 text-sm text-accent animate-fade-in">
          <Icon name="TriangleAlert" size={15} />
          {error}
        </p>
      )}

      <button
        type="submit"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3.5 text-sm font-semibold text-accent-foreground transition-all hover:-translate-y-0.5 hover:brightness-110"
      >
        Войти в личный кабинет
        <Icon name="ArrowRight" size={17} />
      </button>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <Icon name="ShieldCheck" size={13} />
        Защищённое соединение · Талан&nbsp;ID
      </p>
    </form>
  );
};

export default LoginPanel;
