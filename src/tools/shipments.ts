import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DolibarrApi } from '../api.js';
import { ok, err } from '../lib/errors.js';
import { paginationFields, paginationParams, formatList } from '../lib/pagination.js';

export function register(server: McpServer, api: DolibarrApi) {
  server.registerTool('dolibarr_list_shipments', {
    description: 'List shipments.',
    inputSchema: {
      sqlfilters: z.string().optional(),
      ...paginationFields,
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const params: Record<string, unknown> = paginationParams(args);
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      return ok(formatList(await api.get('/shipments', params), args));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_shipment', {
    description: 'Get shipment details by ID.',
    inputSchema: { id: z.number().int().describe('Shipment ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/shipments/${args.id}`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_create_shipment', {
    description: 'Create a new shipment.',
    inputSchema: {
      socid: z.number().int().describe('Customer third party ID'),
      origin_id: z.number().int().describe('Source order ID'),
      origin_type: z.string().default('commande').describe('Source type'),
      date_delivery: z.string().optional(),
      note_public: z.string().optional(),
      note_private: z.string().optional(),
    },
  }, async (args) => {
    try {
      const id = await api.post('/shipments', args);
      return ok({ id: Number(id), message: `Shipment created with ID ${id}` });
    } catch (e) { return err(e); }
  });
}
