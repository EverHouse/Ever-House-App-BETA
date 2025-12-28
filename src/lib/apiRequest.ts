const isDev = import.meta.env.DEV;

export interface ApiResult<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

export async function apiRequest<T = any>(
  url: string,
  options?: RequestInit
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      ...options,
      credentials: 'include',
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const error = errorData.error || errorData.message || `Request failed (${res.status})`;
      if (isDev) console.error('[API]', url, error);
      return { ok: false, error };
    }
    
    const data = await res.json();
    return { ok: true, data };
  } catch (err: any) {
    if (isDev) console.error('[API]', url, err.message);
    return { ok: false, error: err.message || 'Network error' };
  }
}
