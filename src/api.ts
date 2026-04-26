import axios, { AxiosInstance, AxiosError } from 'axios';
import { loadDolibarrConfig, type DolibarrConfig } from './config.js';

export type DolibarrHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type DolibarrRequestOptions = {
  params?: Record<string, unknown>;
  body?: unknown;
};

export function normalizeDolibarrPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) throw new Error('Dolibarr API path is required');
  if (/^https?:\/\//i.test(trimmed)) {
    throw new Error('Use a relative Dolibarr API path, not a full URL');
  }

  const withoutApiPrefix = trimmed.replace(/^\/?api\/index\.php/i, '');
  return withoutApiPrefix.startsWith('/') ? withoutApiPrefix : `/${withoutApiPrefix}`;
}

export class DolibarrApi {
  private client: AxiosInstance;
  private apiPrefix: string;

  constructor(config: DolibarrConfig = loadDolibarrConfig()) {
    const { baseURL, apiKey } = config;

    const normalizedBaseURL = baseURL.replace(/\/+$/, '');
    this.apiPrefix = /\/api\/index\.php$/i.test(normalizedBaseURL) ? '' : '/api/index.php';

    this.client = axios.create({
      baseURL: normalizedBaseURL,
      timeout: 15000,
      headers: { DOLAPIKEY: apiKey },
    });
  }

  private endpoint(path: string): string {
    return `${this.apiPrefix}${normalizeDolibarrPath(path)}`;
  }

  async get<T = unknown>(path: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.get<T>(this.endpoint(path), { params });
    return response.data;
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const response = await this.client.post<T>(this.endpoint(path), body);
    return response.data;
  }

  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    const response = await this.client.put<T>(this.endpoint(path), body);
    return response.data;
  }

  async del(path: string): Promise<unknown> {
    const response = await this.client.delete(this.endpoint(path));
    return response.data;
  }

  async request<T = unknown>(
    method: DolibarrHttpMethod,
    path: string,
    options: DolibarrRequestOptions = {},
  ): Promise<T> {
    const response = await this.client.request<T>({
      method,
      url: this.endpoint(path),
      params: options.params,
      data: options.body,
    });
    return response.data;
  }
}

export function isAxiosError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error);
}
