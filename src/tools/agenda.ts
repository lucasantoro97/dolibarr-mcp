import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DolibarrApi } from '../api.js';
import { ok, err } from '../lib/errors.js';
import { paginationFields, paginationParams, formatList } from '../lib/pagination.js';

export function register(server: McpServer, api: DolibarrApi) {
  server.registerTool('dolibarr_list_agenda_events', {
    description: 'List/search agenda events (calendar).',
    inputSchema: {
      sqlfilters: z.string().optional(),
      ...paginationFields,
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const params: Record<string, unknown> = paginationParams(args);
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      return ok(formatList(await api.get('/agendaevents', params), args));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_agenda_event', {
    description: 'Get agenda event details by ID.',
    inputSchema: { id: z.number().int().describe('Event ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/agendaevents/${args.id}`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_create_agenda_event', {
    description: 'Create a new agenda event.',
    inputSchema: {
      label: z.string().describe('Event label'),
      type_code: z.string().default('AC_OTH').describe('Event type code (AC_OTH, AC_TEL, AC_RDV, etc.)'),
      datep: z.union([z.string(), z.number()]).describe('Start date (Unix timestamp or YYYY-MM-DD)'),
      datef: z.union([z.string(), z.number()]).optional().describe('End date'),
      userownerid: z.number().int().optional().describe('Owner user ID'),
      socid: z.number().int().optional().describe('Third party ID'),
      contactid: z.number().int().optional().describe('Contact ID'),
      elementid: z.number().int().optional().describe('Linked element ID'),
      elementtype: z.string().optional().describe('Linked element type (invoice, order, etc.)'),
      note_private: z.string().optional(),
      note_public: z.string().optional(),
      location: z.string().optional(),
    },
  }, async (args) => {
    try {
      const id = await api.post('/agendaevents', args);
      return ok({ id: Number(id), message: `Agenda event created with ID ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_update_agenda_event', {
    description: 'Update an agenda event.',
    inputSchema: {
      id: z.number().int().describe('Event ID'),
      label: z.string().optional(),
      datep: z.union([z.string(), z.number()]).optional(),
      datef: z.union([z.string(), z.number()]).optional(),
      note_private: z.string().optional(),
      note_public: z.string().optional(),
      location: z.string().optional(),
    },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      await api.put(`/agendaevents/${id}`, payload);
      return ok({ message: `Agenda event ${id} updated` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_delete_agenda_event', {
    description: 'Delete an agenda event.',
    inputSchema: { id: z.number().int().describe('Event ID') },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      await api.del(`/agendaevents/${args.id}`);
      return ok({ message: `Agenda event ${args.id} deleted` });
    } catch (e) { return err(e); }
  });
}
