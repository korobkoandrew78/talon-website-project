import func2url from '../../backend/func2url.json';

type FuncName = keyof typeof func2url;

const AUTH_TOKEN_KEY = 'authToken';
const AUTH_ROLE_KEY = 'authRole';

export const getToken = () => localStorage.getItem(AUTH_TOKEN_KEY);
export const getRole = () => localStorage.getItem(AUTH_ROLE_KEY) as
  | 'admin'
  | 'manager'
  | 'client'
  | null;

export const setAuth = (token: string, role: string) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_ROLE_KEY, role);
};

export const clearAuth = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_ROLE_KEY);
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOpts {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

const buildQuery = (query?: Record<string, string | number | undefined>) => {
  if (!query) return '';
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

export const api = async <T = unknown>(fn: FuncName, opts: RequestOpts = {}): Promise<T> => {
  const url = func2url[fn] + buildQuery(opts.query);
  const token = getToken();

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['X-Auth-Token'] = token;

  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    let message = `Ошибка ${res.status}`;
    if (data && typeof data === 'object' && 'error' in data) {
      message = String((data as { error: unknown }).error);
    }
    throw new ApiError(res.status, message);
  }

  return data as T;
};

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}