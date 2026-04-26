import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DolibarrApi } from '../api.js';
import { ok, err } from '../lib/errors.js';
import { paginationFields, paginationParams, formatList } from '../lib/pagination.js';

export function register(server: McpServer, api: DolibarrApi) {
  server.registerTool('dolibarr_list_payment_modes', {
    description: 'List available payment modes (wire, check, cash, etc.).',
    annotations: { readOnlyHint: true },
  }, async () => {
    try { return ok(await api.get('/setup/dictionary/payment_types')); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_list_payment_terms', {
    description: 'List available payment terms (immediate, 30 days, etc.).',
    annotations: { readOnlyHint: true },
  }, async () => {
    try { return ok(await api.get('/setup/dictionary/payment_terms')); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_list_units', {
    description: 'List available units of measure.',
    annotations: { readOnlyHint: true },
  }, async () => {
    try { return ok(await api.get('/setup/dictionary/units')); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_list_countries', {
    description: 'List available countries.',
    inputSchema: {
      sqlfilters: z.string().optional(),
      ...paginationFields,
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const params: Record<string, unknown> = paginationParams(args);
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      return ok(formatList(await api.get('/setup/dictionary/countries', params), args));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_list_currencies', {
    description: 'List available currencies.',
    annotations: { readOnlyHint: true },
  }, async () => {
    try { return ok(await api.get('/setup/dictionary/currencies')); }
    catch (e) { return err(e); }
  });
}
