import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DolibarrApi } from '../api.js';
import { ok, err } from '../lib/errors.js';
import { paginationFields, paginationParams, formatList } from '../lib/pagination.js';

export function register(server: McpServer, api: DolibarrApi) {
  server.registerTool('dolibarr_list_contracts', {
    description: 'List/search contracts.',
    inputSchema: {
      thirdparty_ids: z.string().optional(),
      sqlfilters: z.string().optional(),
      ...paginationFields,
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const params: Record<string, unknown> = paginationParams(args);
      if (args.thirdparty_ids) params.thirdparty_ids = args.thirdparty_ids;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      return ok(formatList(await api.get('/contracts', params), args));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_contract', {
    description: 'Get contract details by ID.',
    inputSchema: { id: z.number().int().describe('Contract ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/contracts/${args.id}`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_create_contract', {
    description: 'Create a new contract.',
    inputSchema: {
      socid: z.number().int().describe('Third party ID'),
      date_contrat: z.string().optional().describe('Contract date'),
      ref_customer: z.string().optional(),
      ref_supplier: z.string().optional(),
      note_public: z.string().optional(),
      note_private: z.string().optional(),
      fk_project: z.number().int().optional(),
    },
  }, async (args) => {
    try {
      const id = await api.post('/contracts', args);
      return ok({ id: Number(id), message: `Contract created with ID ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_update_contract', {
    description: 'Update a contract.',
    inputSchema: {
      id: z.number().int().describe('Contract ID'),
      ref_customer: z.string().optional(),
      note_public: z.string().optional(),
      note_private: z.string().optional(),
    },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      await api.put(`/contracts/${id}`, payload);
      return ok({ message: `Contract ${id} updated` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_add_contract_line', {
    description: 'Add a service line to a contract.',
    inputSchema: {
      id: z.number().int().describe('Contract ID'),
      desc: z.string().describe('Line description'),
      subprice: z.number().describe('Unit price (HT)'),
      qty: z.number().describe('Quantity'),
      tva_tx: z.number().describe('VAT rate'),
      fk_product: z.number().int().optional(),
      date_start_real: z.string().optional(),
      date_end_real: z.string().optional(),
    },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      const lineId = await api.post(`/contracts/${id}/lines`, payload);
      return ok({ lineId: Number(lineId), message: `Line added to contract ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_activate_contract_line', {
    description: 'Activate a contract line (start the service).',
    inputSchema: {
      id: z.number().int().describe('Contract ID'),
      lineid: z.number().int().describe('Line ID'),
      datestart: z.string().describe('Actual start date'),
      dateend: z.string().optional().describe('Actual end date'),
      comment: z.string().optional(),
    },
  }, async (args) => {
    try {
      await api.put(`/contracts/${args.id}/lines/${args.lineid}/activate`, {
        datestart: args.datestart,
        dateend: args.dateend,
        comment: args.comment,
      });
      return ok({ message: `Contract line ${args.lineid} activated` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_close_contract_line', {
    description: 'Close a contract line (end the service).',
    inputSchema: {
      id: z.number().int().describe('Contract ID'),
      lineid: z.number().int().describe('Line ID'),
      datestart: z.string().describe('End date'),
      comment: z.string().optional(),
    },
  }, async (args) => {
    try {
      await api.put(`/contracts/${args.id}/lines/${args.lineid}/unactivate`, {
        datestart: args.datestart,
        comment: args.comment,
      });
      return ok({ message: `Contract line ${args.lineid} closed` });
    } catch (e) { return err(e); }
  });
}
