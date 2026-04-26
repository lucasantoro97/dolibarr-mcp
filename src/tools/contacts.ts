import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DolibarrApi } from '../api.js';
import { ok, err } from '../lib/errors.js';
import { paginationFields, paginationParams, formatList } from '../lib/pagination.js';

export function register(server: McpServer, api: DolibarrApi) {
  server.registerTool('dolibarr_list_contacts', {
    description: 'List/search contacts.',
    inputSchema: {
      sqlfilters: z.string().optional(),
      thirdparty_ids: z.string().optional().describe('Comma-separated third party IDs'),
      ...paginationFields,
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const params: Record<string, unknown> = paginationParams(args);
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      if (args.thirdparty_ids) params.thirdparty_ids = args.thirdparty_ids;
      return ok(formatList(await api.get('/contacts', params), args));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_contact', {
    description: 'Get contact details by ID.',
    inputSchema: { id: z.number().int().describe('Contact ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/contacts/${args.id}`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_create_contact', {
    description: 'Create a new contact.',
    inputSchema: {
      socid: z.number().int().optional().describe('Third party ID to link to'),
      lastname: z.string().describe('Last name'),
      firstname: z.string().optional(),
      civility_id: z.string().optional().describe('e.g. MR, MME'),
      poste: z.string().optional().describe('Job title'),
      email: z.string().optional(),
      phone_pro: z.string().optional(),
      phone_mobile: z.string().optional(),
      address: z.string().optional(),
      zip: z.string().optional(),
      town: z.string().optional(),
      country_code: z.string().optional(),
      note_public: z.string().optional(),
      note_private: z.string().optional(),
    },
  }, async (args) => {
    try {
      const id = await api.post('/contacts', args);
      return ok({ id: Number(id), message: `Contact created with ID ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_update_contact', {
    description: 'Update an existing contact.',
    inputSchema: {
      id: z.number().int().describe('Contact ID'),
      lastname: z.string().optional(),
      firstname: z.string().optional(),
      poste: z.string().optional(),
      email: z.string().optional(),
      phone_pro: z.string().optional(),
      phone_mobile: z.string().optional(),
      address: z.string().optional(),
      zip: z.string().optional(),
      town: z.string().optional(),
    },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      await api.put(`/contacts/${id}`, payload);
      return ok({ message: `Contact ${id} updated` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_delete_contact', {
    description: 'Delete a contact.',
    inputSchema: { id: z.number().int().describe('Contact ID') },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      await api.del(`/contacts/${args.id}`);
      return ok({ message: `Contact ${args.id} deleted` });
    } catch (e) { return err(e); }
  });
}
