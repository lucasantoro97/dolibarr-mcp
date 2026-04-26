import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DolibarrApi } from '../api.js';
import { ok, err } from '../lib/errors.js';
import { paginationFields, paginationParams, formatList } from '../lib/pagination.js';

export function register(server: McpServer, api: DolibarrApi) {
  server.registerTool('dolibarr_list_proposals', {
    description: 'List/search commercial proposals (quotes).',
    inputSchema: {
      status: z.number().int().optional().describe('0=draft, 1=validated, 2=signed, 3=not signed, 4=billed'),
      thirdparty_ids: z.string().optional(),
      sqlfilters: z.string().optional(),
      ...paginationFields,
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const params: Record<string, unknown> = paginationParams(args);
      if (args.status !== undefined) params.status = args.status;
      if (args.thirdparty_ids) params.thirdparty_ids = args.thirdparty_ids;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      return ok(formatList(await api.get('/proposals', params), args));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_proposal', {
    description: 'Get full proposal details by ID.',
    inputSchema: { id: z.number().int().describe('Proposal ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/proposals/${args.id}`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_create_proposal', {
    description: 'Create a new commercial proposal.',
    inputSchema: {
      socid: z.number().int().describe('Customer third party ID'),
      date: z.string().optional().describe('Proposal date'),
      duree_validite: z.number().int().optional().describe('Validity duration in days'),
      cond_reglement_id: z.number().int().optional(),
      mode_reglement_id: z.number().int().optional(),
      ref_client: z.string().optional(),
      note_public: z.string().optional(),
      note_private: z.string().optional(),
      fk_project: z.number().int().optional(),
    },
  }, async (args) => {
    try {
      const id = await api.post('/proposals', args);
      return ok({ id: Number(id), message: `Proposal created with ID ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_update_proposal', {
    description: 'Update a proposal.',
    inputSchema: {
      id: z.number().int().describe('Proposal ID'),
      date: z.string().optional(),
      duree_validite: z.number().int().optional(),
      ref_client: z.string().optional(),
      note_public: z.string().optional(),
      note_private: z.string().optional(),
    },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      await api.put(`/proposals/${id}`, payload);
      return ok({ message: `Proposal ${id} updated` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_add_proposal_line', {
    description: 'Add a line to a proposal.',
    inputSchema: {
      id: z.number().int().describe('Proposal ID'),
      desc: z.string().describe('Line description'),
      subprice: z.number().describe('Unit price (HT)'),
      qty: z.number().describe('Quantity'),
      tva_tx: z.number().describe('VAT rate'),
      product_type: z.number().int().default(1).describe('0=product, 1=service'),
      fk_product: z.number().int().optional(),
      remise_percent: z.number().optional(),
      fk_unit: z.number().int().optional(),
      date_start: z.string().optional(),
      date_end: z.string().optional(),
    },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      const lineId = await api.post(`/proposals/${id}/line`, payload);
      return ok({ lineId: Number(lineId), message: `Line added to proposal ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_update_proposal_line', {
    description: 'Update a line on a proposal.',
    inputSchema: {
      id: z.number().int().describe('Proposal ID'),
      lineid: z.number().int().describe('Line ID'),
      desc: z.string().optional(),
      subprice: z.number().optional(),
      qty: z.number().optional(),
      tva_tx: z.number().optional(),
      remise_percent: z.number().optional(),
    },
  }, async (args) => {
    try {
      const { id, lineid, ...payload } = args;
      await api.put(`/proposals/${id}/lines/${lineid}`, payload);
      return ok({ message: `Line ${lineid} updated on proposal ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_delete_proposal_line', {
    description: 'Delete a line from a proposal.',
    inputSchema: {
      id: z.number().int().describe('Proposal ID'),
      lineid: z.number().int().describe('Line ID'),
    },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      await api.del(`/proposals/${args.id}/lines/${args.lineid}`);
      return ok({ message: `Line ${args.lineid} deleted from proposal ${args.id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_validate_proposal', {
    description: 'Validate a draft proposal.',
    inputSchema: { id: z.number().int().describe('Proposal ID') },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      await api.post(`/proposals/${args.id}/validate`);
      return ok({ message: `Proposal ${args.id} validated` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_close_proposal', {
    description: 'Close a proposal (signed or refused).',
    inputSchema: {
      id: z.number().int().describe('Proposal ID'),
      status: z.number().int().describe('2=signed, 3=not signed'),
      note_private: z.string().optional(),
    },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      await api.post(`/proposals/${args.id}/close`, {
        status: args.status, note_private: args.note_private,
      });
      return ok({ message: `Proposal ${args.id} closed with status ${args.status}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_set_proposal_invoiced', {
    description: 'Mark a proposal as invoiced.',
    inputSchema: { id: z.number().int().describe('Proposal ID') },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      await api.post(`/proposals/${args.id}/setinvoiced`);
      return ok({ message: `Proposal ${args.id} marked as invoiced` });
    } catch (e) { return err(e); }
  });
}
