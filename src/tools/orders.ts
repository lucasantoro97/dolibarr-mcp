import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DolibarrApi } from '../api.js';
import { ok, err } from '../lib/errors.js';
import { paginationFields, paginationParams, formatList } from '../lib/pagination.js';

export function register(server: McpServer, api: DolibarrApi) {
  server.registerTool('dolibarr_list_orders', {
    description: 'List/search sales orders.',
    inputSchema: {
      status: z.number().int().optional().describe('0=draft, 1=validated, 2=shipment in progress, 3=delivered, -1=cancelled'),
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
      return ok(formatList(await api.get('/orders', params), args));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_order', {
    description: 'Get full sales order details by ID.',
    inputSchema: { id: z.number().int().describe('Order ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/orders/${args.id}`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_create_order', {
    description: 'Create a new sales order.',
    inputSchema: {
      socid: z.number().int().describe('Customer third party ID'),
      date: z.string().optional(),
      date_livraison: z.string().optional().describe('Delivery date'),
      cond_reglement_id: z.number().int().optional(),
      mode_reglement_id: z.number().int().optional(),
      ref_client: z.string().optional(),
      note_public: z.string().optional(),
      note_private: z.string().optional(),
      fk_project: z.number().int().optional(),
    },
  }, async (args) => {
    try {
      const id = await api.post('/orders', args);
      return ok({ id: Number(id), message: `Order created with ID ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_update_order', {
    description: 'Update a sales order.',
    inputSchema: {
      id: z.number().int().describe('Order ID'),
      date: z.string().optional(),
      date_livraison: z.string().optional(),
      ref_client: z.string().optional(),
      note_public: z.string().optional(),
      note_private: z.string().optional(),
    },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      await api.put(`/orders/${id}`, payload);
      return ok({ message: `Order ${id} updated` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_add_order_line', {
    description: 'Add a line to a sales order.',
    inputSchema: {
      id: z.number().int().describe('Order ID'),
      desc: z.string().describe('Line description'),
      subprice: z.number().describe('Unit price (HT)'),
      qty: z.number().describe('Quantity'),
      tva_tx: z.number().describe('VAT rate'),
      product_type: z.number().int().default(1),
      fk_product: z.number().int().optional(),
      remise_percent: z.number().optional(),
      fk_unit: z.number().int().optional(),
    },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      const lineId = await api.post(`/orders/${id}/lines`, payload);
      return ok({ lineId: Number(lineId), message: `Line added to order ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_update_order_line', {
    description: 'Update a line on a sales order.',
    inputSchema: {
      id: z.number().int().describe('Order ID'),
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
      await api.put(`/orders/${id}/lines/${lineid}`, payload);
      return ok({ message: `Line ${lineid} updated on order ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_delete_order_line', {
    description: 'Delete a line from a sales order.',
    inputSchema: {
      id: z.number().int().describe('Order ID'),
      lineid: z.number().int().describe('Line ID'),
    },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      await api.del(`/orders/${args.id}/lines/${args.lineid}`);
      return ok({ message: `Line ${args.lineid} deleted from order ${args.id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_validate_order', {
    description: 'Validate a draft sales order.',
    inputSchema: {
      id: z.number().int().describe('Order ID'),
      idwarehouse: z.number().int().optional(),
    },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      await api.post(`/orders/${args.id}/validate`, { idwarehouse: args.idwarehouse ?? 0 });
      return ok({ message: `Order ${args.id} validated` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_close_order', {
    description: 'Close a sales order.',
    inputSchema: {
      id: z.number().int().describe('Order ID'),
      notrigger: z.number().int().optional(),
    },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      await api.post(`/orders/${args.id}/close`, { notrigger: args.notrigger ?? 0 });
      return ok({ message: `Order ${args.id} closed` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_create_order_invoice', {
    description: 'Create an invoice from a sales order.',
    inputSchema: { id: z.number().int().describe('Order ID') },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      const invoiceId = await api.post(`/invoices/createfromorder/${args.id}`);
      return ok({ invoiceId: Number(invoiceId), message: `Invoice created from order ${args.id}` });
    } catch (e) { return err(e); }
  });
}
