import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DolibarrApi } from '../api.js';
import { ok, err } from '../lib/errors.js';
import { paginationFields, paginationParams, formatList } from '../lib/pagination.js';

export function register(server: McpServer, api: DolibarrApi) {
  server.registerTool('dolibarr_list_expense_reports', {
    description: 'List expense reports.',
    inputSchema: {
      status: z.number().int().optional().describe('0=draft, 2=validated, 5=approved, 6=paid, 99=refused'),
      sqlfilters: z.string().optional(),
      ...paginationFields,
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const params: Record<string, unknown> = paginationParams(args);
      if (args.status !== undefined) params.status = args.status;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      return ok(formatList(await api.get('/expensereports', params), args));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_expense_report', {
    description: 'Get expense report details by ID.',
    inputSchema: { id: z.number().int().describe('Expense report ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/expensereports/${args.id}`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_create_expense_report', {
    description: 'Create a new expense report.',
    inputSchema: {
      fk_user_author: z.number().int().describe('User ID'),
      date_debut: z.string().describe('Start date'),
      date_fin: z.string().describe('End date'),
      note_public: z.string().optional(),
      note_private: z.string().optional(),
      fk_project: z.number().int().optional(),
    },
  }, async (args) => {
    try {
      const id = await api.post('/expensereports', args);
      return ok({ id: Number(id), message: `Expense report created with ID ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_add_expense_report_line', {
    description: 'Add a line to an expense report.',
    inputSchema: {
      id: z.number().int().describe('Expense report ID'),
      date: z.string().describe('Expense date'),
      type_fees_code: z.string().describe('Expense type code'),
      comments: z.string().describe('Description'),
      value_unit: z.number().describe('Unit amount'),
      qty: z.number().default(1).describe('Quantity'),
      tva_tx: z.number().default(0).describe('VAT rate'),
      fk_projet: z.number().int().optional().describe('Project ID'),
    },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      const lineId = await api.post(`/expensereports/${id}/lines`, payload);
      return ok({ lineId: Number(lineId), message: `Line added to expense report ${id}` });
    } catch (e) { return err(e); }
  });
}
