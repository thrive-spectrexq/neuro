const API_BASE_URL = (typeof window !== 'undefined' && (window as any).env?.VITE_API_URL) || 'http://localhost:8000/api/v1';

export interface ApiError extends Error {
  status?: number;
  data?: any;
}

// Token storage key
const TOKEN_KEY = 'neuro_auth_token';

export const tokenStorage = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string): void => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.warn('Could not persist token:', e);
    }
  },
  clear: (): void => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
  },
};

// Simple offline mutation queue persisted in localStorage
interface QueuedMutation {
  id: string;
  url: string;
  method: string;
  body?: any;
  timestamp: number;
}

const OFFLINE_QUEUE_KEY = 'neuro_offline_mutations';

export const offlineQueue = {
  get: (): QueuedMutation[] => {
    try {
      const data = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },
  enqueue: (mutation: Omit<QueuedMutation, 'id' | 'timestamp'>): void => {
    try {
      const queue = offlineQueue.get();
      queue.push({
        ...mutation,
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
      });
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('Failed to enqueue offline mutation:', e);
    }
  },
  clear: (): void => {
    try {
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
    } catch {}
  },
};

const getHeaders = (customHeaders?: HeadersInit): HeadersInit => {
  const token = tokenStorage.get();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...customHeaders,
  };
};

export const apiClient = {
  get: async <T = any>(url: string): Promise<{ data: T }> => {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err: ApiError = new Error(`HTTP ${res.status}: ${res.statusText}`);
      err.status = res.status;
      try {
        err.data = await res.json();
      } catch {}
      throw err;
    }
    return { data: await res.json() };
  },

  post: async <T = any>(url: string, body?: any): Promise<{ data: T }> => {
    try {
      const res = await fetch(`${API_BASE_URL}${url}`, {
        method: 'POST',
        headers: getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const err: ApiError = new Error(`HTTP ${res.status}: ${res.statusText}`);
        err.status = res.status;
        try {
          err.data = await res.json();
        } catch {}
        throw err;
      }
      return { data: await res.json() };
    } catch (err: any) {
      if (!navigator.onLine) {
        offlineQueue.enqueue({ url, method: 'POST', body });
      }
      throw err;
    }
  },

  put: async <T = any>(url: string, body?: any): Promise<{ data: T }> => {
    try {
      const res = await fetch(`${API_BASE_URL}${url}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const err: ApiError = new Error(`HTTP ${res.status}: ${res.statusText}`);
        err.status = res.status;
        try {
          err.data = await res.json();
        } catch {}
        throw err;
      }
      return { data: await res.json() };
    } catch (err: any) {
      if (!navigator.onLine) {
        offlineQueue.enqueue({ url, method: 'PUT', body });
      }
      throw err;
    }
  },

  patch: async <T = any>(url: string, body?: any): Promise<{ data: T }> => {
    try {
      const res = await fetch(`${API_BASE_URL}${url}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const err: ApiError = new Error(`HTTP ${res.status}: ${res.statusText}`);
        err.status = res.status;
        try {
          err.data = await res.json();
        } catch {}
        throw err;
      }
      return { data: await res.json() };
    } catch (err: any) {
      if (!navigator.onLine) {
        offlineQueue.enqueue({ url, method: 'PATCH', body });
      }
      throw err;
    }
  },

  delete: async <T = any>(url: string): Promise<{ data: T }> => {
    const res = await fetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err: ApiError = new Error(`HTTP ${res.status}: ${res.statusText}`);
      err.status = res.status;
      try {
        err.data = await res.json();
      } catch {}
      throw err;
    }
    return { data: await res.json() };
  },
};
