import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DolibarrApi } from '../api.js';
import { ok, err } from '../lib/errors.js';
import { paginationFields, paginationParams, formatList } from '../lib/pagination.js';

export function register(server: McpServer, api: DolibarrApi) {
  server.registerTool('dolibarr_list_users', {
    description: 'List Dolibarr users.',
    inputSchema: {
      sqlfilters: z.string().optional(),
      ...paginationFields,
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const params: Record<string, unknown> = paginationParams(args);
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      return ok(formatList(await api.get('/users', params), args));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_user', {
    description: 'Get user details by ID.',
    inputSchema: { id: z.number().int().describe('User ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/users/${args.id}`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_current_user', {
    description: 'Get the current API user info.',
    annotations: { readOnlyHint: true },
  }, async () => {
    try { return ok(await api.get('/users/info')); }
    catch (e) { return err(e); }
  });
}
