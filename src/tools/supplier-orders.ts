import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DolibarrApi } from '../api.js';
import { ok, err } from '../lib/errors.js';
import { paginationFields, paginationParams, formatList } from '../lib/pagination.js';

export function register(server: McpServer, api: DolibarrApi) {
  server.registerTool('dolibarr_list_supplier_orders', {
    description: 'List/search purchase orders.',
    inputSchema: {
      status: z.number().int().optional().describe('0=draft, 1=validated, 2=approved, 3=ordered, 4=partial, 5=received, 6=cancelled, 9=refused'),
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
      return ok(formatList(await api.get('/supplierorders', params), args));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_supplier_order', {
    description: 'Get purchase order details by ID.',
    inputSchema: { id: z.number().int().describe('Supplier order ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/supplierorders/${args.id}`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_create_supplier_order', {
    description: 'Create a new purchase order.',
    inputSchema: {
      socid: z.number().int().describe('Supplier third party ID'),
      date: z.string().optional(),
      date_livraison: z.string().optional(),
      cond_reglement_id: z.number().int().optional(),
      mode_reglement_id: z.number().int().optional(),
      ref_supplier: z.string().optional(),
      note_public: z.string().optional(),
      note_private: z.string().optional(),
      fk_project: z.number().int().optional(),
    },
  }, async (args) => {
    try {
      const id = await api.post('/supplierorders', args);
      return ok({ id: Number(id), message: `Supplier order created with ID ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_update_supplier_order', {
    description: 'Update a purchase order.',
    inputSchema: {
      id: z.number().int().describe('Supplier order ID'),
      date: z.string().optional(),
      ref_supplier: z.string().optional(),
      note_public: z.string().optional(),
      note_private: z.string().optional(),
    },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      await api.put(`/supplierorders/${id}`, payload);
      return ok({ message: `Supplier order ${id} updated` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_add_supplier_order_line', {
    description: 'Add a line to a purchase order.',
    inputSchema: {
      id: z.number().int().describe('Supplier order ID'),
      desc: z.string().describe('Line description'),
      subprice: z.number().describe('Unit price (HT)'),
      qty: z.number().describe('Quantity'),
      tva_tx: z.number().describe('VAT rate'),
      product_type: z.number().int().default(0),
      fk_product: z.number().int().optional(),
      ref_supplier: z.string().optional(),
    },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      const lineId = await api.post(`/supplierorders/${id}/lines`, payload);
      return ok({ lineId: Number(lineId), message: `Line added to supplier order ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_validate_supplier_order', {
    description: 'Validate a purchase order.',
    inputSchema: { id: z.number().int().describe('Supplier order ID') },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      await api.post(`/supplierorders/${args.id}/validate`);
      return ok({ message: `Supplier order ${args.id} validated` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_approve_supplier_order', {
    description: 'Approve a validated purchase order.',
    inputSchema: {
      id: z.number().int().describe('Supplier order ID'),
      idwarehouse: z.number().int().optional(),
    },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      await api.post(`/supplierorders/${args.id}/approve`, {
        idwarehouse: args.idwarehouse ?? 0,
      });
      return ok({ message: `Supplier order ${args.id} approved` });
    } catch (e) { return err(e); }
  });
}
