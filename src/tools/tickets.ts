import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DolibarrApi } from '../api.js';
import { ok, err } from '../lib/errors.js';
import { paginationFields, paginationParams, formatList } from '../lib/pagination.js';

export function register(server: McpServer, api: DolibarrApi) {
  server.registerTool('dolibarr_list_tickets', {
    description: 'List support tickets.',
    inputSchema: {
      sqlfilters: z.string().optional(),
      ...paginationFields,
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const params: Record<string, unknown> = paginationParams(args);
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      return ok(formatList(await api.get('/tickets', params), args));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_ticket', {
    description: 'Get ticket details by ID.',
    inputSchema: { id: z.number().int().describe('Ticket ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/tickets/${args.id}`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_create_ticket', {
    description: 'Create a new support ticket.',
    inputSchema: {
      subject: z.string().describe('Ticket subject'),
      message: z.string().describe('Ticket message/description'),
      type_code: z.string().optional().describe('Ticket type code'),
      category_code: z.string().optional().describe('Ticket category code'),
      severity_code: z.string().optional().describe('Severity code'),
      fk_soc: z.number().int().optional().describe('Third party ID'),
      fk_project: z.number().int().optional(),
      notify_tiers_at_create: z.number().int().optional().describe('1 to notify third party'),
    },
  }, async (args) => {
    try {
      const id = await api.post('/tickets', args);
      return ok({ id: Number(id), message: `Ticket created with ID ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_update_ticket', {
    description: 'Update a ticket.',
    inputSchema: {
      id: z.number().int().describe('Ticket ID'),
      subject: z.string().optional(),
      message: z.string().optional(),
      fk_statut: z.number().int().optional().describe('Status'),
      progress: z.number().int().optional().describe('Progress 0-100'),
    },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      await api.put(`/tickets/${id}`, payload);
      return ok({ message: `Ticket ${id} updated` });
    } catch (e) { return err(e); }
  });
}
