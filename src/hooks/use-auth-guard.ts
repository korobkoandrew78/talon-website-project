import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getRole, getToken, clearAuth } from '@/lib/api';

type Role = 'admin' | 'manager' | 'client';

interface AuthGuardResult<T> {
  user: T | null;
  loading: boolean;
}

export function useAuthGuard<T = unknown>(expectedRole: Role): AuthGuardResult<T> {
  const navigate = useNavigate();
  const [user, setUser] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const token = getToken();
      const role = getRole();

      if (!token || role !== expectedRole) {
        navigate('/');
        return;
      }

      try {
        const res = await api<{ role: Role; user: T }>('auth', { method: 'GET' });
        if (cancelled) return;
        if (res.role !== expectedRole) {
          clearAuth();
          navigate('/');
          return;
        }
        setUser(res.user);
        setLoading(false);
      } catch {
        if (cancelled) return;
        clearAuth();
        navigate('/');
      }
    };

    check();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expectedRole]);

  return { user, loading };
}