import { z } from 'zod';

export const paginationFields = {
  limit: z.number().int().min(1).max(500).default(50).describe('Max rows to return (default 50, max 500)'),
  page: z.number().int().min(0).default(0).describe('Page number (0-based)'),
  sortfield: z.string().optional().describe('Field to sort by (e.g. "t.rowid")'),
  sortorder: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
};

export function paginationParams(args: {
  limit?: number;
  page?: number;
  sortfield?: string;
  sortorder?: string;
}): Record<string, unknown> {
  const params: Record<string, unknown> = {
    limit: args.limit ?? 50,
    page: args.page ?? 0,
  };
  if (args.sortfield) params.sortfield = args.sortfield;
  if (args.sortorder) params.sortorder = args.sortorder;
  return params;
}

export function formatList(data: unknown, args: { limit?: number; page?: number }): string {
  const items = Array.isArray(data) ? data : [];
  const limit = args.limit ?? 50;
  const page = args.page ?? 0;
  const result = JSON.stringify(items, null, 2);
  const hint = items.length >= limit
    ? `\n\nShowing ${items.length} results (page ${page}). Pass page: ${page + 1} for more.`
    : `\n\n${items.length} result(s) on page ${page}.`;
  return result + hint;
}
