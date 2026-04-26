import { isAxiosError } from '../api.js';

export type ToolResult = {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

export function ok(data: unknown): ToolResult {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return { content: [{ type: 'text', text }] };
}

export function err(error: unknown): ToolResult {
  if (isAxiosError(error)) {
    const status = error.response?.status ?? 'unknown';
    const data = error.response?.data;
    const message = typeof data === 'string'
      ? data
      : typeof data === 'object' && data !== null && 'error' in (data as Record<string, unknown>)
        ? String((data as Record<string, unknown>).error)
        : JSON.stringify(data);
    return {
      content: [{ type: 'text', text: `Dolibarr API error ${status}: ${message}` }],
      isError: true,
    };
  }
  return {
    content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
    isError: true,
  };
}
