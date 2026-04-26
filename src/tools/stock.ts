import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DolibarrApi } from '../api.js';
import { ok, err } from '../lib/errors.js';
import { paginationFields, paginationParams, formatList } from '../lib/pagination.js';

export function register(server: McpServer, api: DolibarrApi) {
  server.registerTool('dolibarr_list_warehouses', {
    description: 'List warehouses.',
    inputSchema: {
      sqlfilters: z.string().optional(),
      ...paginationFields,
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const params: Record<string, unknown> = paginationParams(args);
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      return ok(formatList(await api.get('/warehouses', params), args));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_warehouse', {
    description: 'Get warehouse details by ID.',
    inputSchema: { id: z.number().int().describe('Warehouse ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/warehouses/${args.id}`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_list_stock_movements', {
    description: 'List stock movements.',
    inputSchema: {
      sqlfilters: z.string().optional(),
      ...paginationFields,
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const params: Record<string, unknown> = paginationParams(args);
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      return ok(formatList(await api.get('/stockmovements', params), args));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_create_stock_movement', {
    description: 'Create a stock movement (add/remove stock).',
    inputSchema: {
      product_id: z.number().int().describe('Product ID'),
      warehouse_id: z.number().int().describe('Warehouse ID'),
      qty: z.number().describe('Quantity (positive=add, negative=remove)'),
      type: z.number().int().default(0).describe('0=increase, 1=decrease, 2=transfer'),
      label: z.string().optional().describe('Movement label'),
      inventorycode: z.string().optional(),
      price: z.number().optional().describe('Unit price for valuation'),
    },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      const id = await api.post('/stockmovements', args);
      return ok({ id: Number(id), message: 'Stock movement created' });
    } catch (e) { return err(e); }
  });
}
