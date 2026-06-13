import { getValidToken } from '@/lib/auth';
import type {
  LoginResponse,
  Patient,
  PatientInput,
  PatientsQuery,
  PatientsResponse,
  SetupPasswordValidation,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function publicRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      (payload && (payload.message as string | string[])) ||
      response.statusText ||
      'Request failed';

    throw new ApiError(
      Array.isArray(message) ? message.join(', ') : message,
      response.status,
    );
  }

  return (await response.json()) as T;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = 2,
): Promise<T> {
  const token = getValidToken();
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const message =
        (payload && (payload.message as string | string[])) ||
        response.statusText ||
        'Request failed';

      if (response.status === 503 && retry > 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return request<T>(path, options, retry - 1);
      }

      throw new ApiError(
        Array.isArray(message) ? message.join(', ') : message,
        response.status,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (retry > 0) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      return request<T>(path, options, retry - 1);
    }

    throw error;
  }
}

export const api = {
  login(email: string, password: string) {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  validateSetupToken(token: string) {
    const params = new URLSearchParams({ token });
    return publicRequest<SetupPasswordValidation>(
      `/auth/setup-password/validate?${params.toString()}`,
    );
  },

  setupPassword(token: string, password: string) {
    return publicRequest<LoginResponse>('/auth/setup-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },

  getPatients(query: PatientsQuery = {}) {
    const params = new URLSearchParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.set(key, String(value));
      }
    });

    const suffix = params.toString() ? `?${params.toString()}` : '';
    return request<PatientsResponse>(`/patients${suffix}`);
  },

  getPatient(id: string) {
    return request<Patient>(`/patients/${id}`);
  },

  createPatient(data: PatientInput) {
    return request<Patient>('/patients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  updatePatient(id: string, data: Partial<PatientInput>) {
    return request<Patient>(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deletePatient(id: string) {
    return request<{ ok: true }>(`/patients/${id}`, {
      method: 'DELETE',
    });
  },
};
