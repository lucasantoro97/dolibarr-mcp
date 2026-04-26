import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DolibarrApi } from '../api.js';
import { ok, err } from '../lib/errors.js';
import { paginationFields, paginationParams, formatList } from '../lib/pagination.js';

export function register(server: McpServer, api: DolibarrApi) {
  server.registerTool('dolibarr_list_supplier_invoices', {
    description: 'List/search supplier invoices.',
    inputSchema: {
      status: z.enum(['draft', 'unpaid', 'paid', 'cancelled']).optional(),
      thirdparty_ids: z.string().optional(),
      sqlfilters: z.string().optional(),
      ...paginationFields,
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const params: Record<string, unknown> = paginationParams(args);
      if (args.status) params.status = args.status;
      if (args.thirdparty_ids) params.thirdparty_ids = args.thirdparty_ids;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      return ok(formatList(await api.get('/supplierinvoices', params), args));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_supplier_invoice', {
    description: 'Get full supplier invoice details by ID.',
    inputSchema: { id: z.number().int().describe('Invoice ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/supplierinvoices/${args.id}`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_create_supplier_invoice', {
    description: 'Create a new supplier invoice.',
    inputSchema: {
      socid: z.number().int().describe('Supplier third party ID'),
      ref_supplier: z.string().optional().describe('Supplier invoice reference'),
      date: z.string().optional().describe('Invoice date'),
      date_lim_reglement: z.string().optional(),
      cond_reglement_id: z.number().int().optional(),
      mode_reglement_id: z.number().int().optional(),
      label: z.string().optional(),
      note_public: z.string().optional(),
      note_private: z.string().optional(),
      fk_project: z.number().int().optional(),
    },
  }, async (args) => {
    try {
      const id = await api.post('/supplierinvoices', args);
      return ok({ id: Number(id), message: `Supplier invoice created with ID ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_update_supplier_invoice', {
    description: 'Update a supplier invoice.',
    inputSchema: {
      id: z.number().int().describe('Invoice ID'),
      ref_supplier: z.string().optional(),
      date: z.string().optional(),
      label: z.string().optional(),
      note_public: z.string().optional(),
      note_private: z.string().optional(),
      vat_reverse_charge: z.number().int().optional().describe('1 to enable reverse charge'),
    },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      await api.put(`/supplierinvoices/${id}`, payload);
      return ok({ message: `Supplier invoice ${id} updated` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_add_supplier_invoice_line', {
    description: 'Add a line to a supplier invoice.',
    inputSchema: {
      id: z.number().int().describe('Invoice ID'),
      description: z.string().describe('Line description'),
      pu_ht: z.number().describe('Unit price (HT)'),
      qty: z.number().describe('Quantity'),
      tva_tx: z.number().describe('VAT rate'),
      product_type: z.number().int().default(1).describe('0=product, 1=service'),
      fk_product: z.number().int().optional(),
      ref_supplier: z.string().optional(),
      vat_src_code: z.string().optional(),
      fk_unit: z.number().int().optional(),
      info_bits: z.number().int().optional(),
      localtax1_tx: z.number().optional(),
      localtax2_tx: z.number().optional(),
      date_start: z.string().optional(),
      date_end: z.string().optional(),
    },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      const lineId = await api.post(`/supplierinvoices/${id}/lines`, payload);
      return ok({ lineId: Number(lineId), message: `Line added to supplier invoice ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_update_supplier_invoice_line', {
    description: 'Update a line on a supplier invoice.',
    inputSchema: {
      id: z.number().int().describe('Invoice ID'),
      lineid: z.number().int().describe('Line ID'),
      description: z.string().optional(),
      pu_ht: z.number().optional(),
      qty: z.number().optional(),
      tva_tx: z.number().optional(),
      product_type: z.number().int().optional(),
    },
  }, async (args) => {
    try {
      const { id, lineid, ...payload } = args;
      await api.put(`/supplierinvoices/${id}/lines/${lineid}`, payload);
      return ok({ message: `Line ${lineid} updated on supplier invoice ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_delete_supplier_invoice_line', {
    description: 'Delete a line from a supplier invoice.',
    inputSchema: {
      id: z.number().int().describe('Invoice ID'),
      lineid: z.number().int().describe('Line ID'),
    },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      await api.del(`/supplierinvoices/${args.id}/lines/${args.lineid}`);
      return ok({ message: `Line ${args.lineid} deleted from supplier invoice ${args.id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_validate_supplier_invoice', {
    description: 'Validate a supplier invoice.',
    inputSchema: {
      id: z.number().int().describe('Invoice ID'),
      idwarehouse: z.number().int().optional(),
    },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      await api.post(`/supplierinvoices/${args.id}/validate`, {
        idwarehouse: args.idwarehouse ?? 0,
      });
      return ok({ message: `Supplier invoice ${args.id} validated` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_set_supplier_invoice_paid', {
    description: 'Mark a supplier invoice as paid.',
    inputSchema: {
      id: z.number().int().describe('Invoice ID'),
      close_code: z.string().optional(),
      close_note: z.string().optional(),
    },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      await api.post(`/supplierinvoices/${args.id}/settopaid`, {
        close_code: args.close_code, close_note: args.close_note,
      });
      return ok({ message: `Supplier invoice ${args.id} marked as paid` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_supplier_invoice_payments', {
    description: 'List payments on a supplier invoice.',
    inputSchema: { id: z.number().int().describe('Invoice ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/supplierinvoices/${args.id}/payments`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_add_supplier_invoice_payment', {
    description: 'Record a payment on a supplier invoice.',
    inputSchema: {
      id: z.number().int().describe('Invoice ID'),
      datepaye: z.string().describe('Payment date'),
      payment_mode_id: z.number().int().describe('Payment mode ID'),
      closepaidinvoices: z.enum(['yes', 'no']).default('yes'),
      accountid: z.number().int().describe('Bank account ID'),
      num_payment: z.string().optional(),
      comment: z.string().optional(),
    },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      const result = await api.post(`/supplierinvoices/${id}/payments`, payload);
      return ok({ paymentId: result, message: `Payment recorded on supplier invoice ${id}` });
    } catch (e) { return err(e); }
  });
}
