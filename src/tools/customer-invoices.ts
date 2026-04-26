import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DolibarrApi } from '../api.js';
import { ok, err } from '../lib/errors.js';
import { paginationFields, paginationParams, formatList } from '../lib/pagination.js';

export function register(server: McpServer, api: DolibarrApi) {
  server.registerTool('dolibarr_list_customer_invoices', {
    description: 'List/search customer invoices. Filter by status, third party, date range, sqlfilters.',
    inputSchema: {
      status: z.enum(['draft', 'unpaid', 'paid', 'cancelled']).optional(),
      thirdparty_ids: z.string().optional().describe('Comma-separated third party IDs'),
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
      return ok(formatList(await api.get('/invoices', params), args));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_customer_invoice', {
    description: 'Get full customer invoice details by ID (lines, payments, totals).',
    inputSchema: { id: z.number().int().describe('Invoice ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/invoices/${args.id}`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_find_customer_invoice_by_ref', {
    description: 'Find a customer invoice by its Dolibarr reference (e.g. "FA2401-0001").',
    inputSchema: { ref: z.string().describe('Invoice reference') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/invoices/ref/${encodeURIComponent(args.ref)}`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_find_customer_invoice_by_ref_ext', {
    description: 'Find a customer invoice by external reference.',
    inputSchema: { ref_ext: z.string().describe('External reference') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/invoices/ref_ext/${encodeURIComponent(args.ref_ext)}`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_create_customer_invoice', {
    description: 'Create a new customer invoice.',
    inputSchema: {
      socid: z.number().int().describe('Customer third party ID'),
      type: z.number().int().default(0).describe('0=standard, 1=replacement, 2=credit note, 3=deposit, 4=proforma'),
      date: z.string().optional().describe('Invoice date (YYYY-MM-DD or Unix timestamp)'),
      date_lim_reglement: z.string().optional().describe('Payment due date'),
      cond_reglement_id: z.number().int().optional().describe('Payment terms ID'),
      mode_reglement_id: z.number().int().optional().describe('Payment mode ID'),
      ref_ext: z.string().optional().describe('External reference'),
      ref_client: z.string().optional().describe('Customer reference'),
      note_public: z.string().optional(),
      note_private: z.string().optional(),
      fk_project: z.number().int().optional().describe('Project ID'),
    },
  }, async (args) => {
    try {
      const id = await api.post('/invoices', args);
      return ok({ id: Number(id), message: `Customer invoice created with ID ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_update_customer_invoice', {
    description: 'Update a customer invoice (only possible on drafts).',
    inputSchema: {
      id: z.number().int().describe('Invoice ID'),
      date: z.string().optional(),
      date_lim_reglement: z.string().optional(),
      ref_client: z.string().optional(),
      note_public: z.string().optional(),
      note_private: z.string().optional(),
      cond_reglement_id: z.number().int().optional(),
      mode_reglement_id: z.number().int().optional(),
    },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      await api.put(`/invoices/${id}`, payload);
      return ok({ message: `Invoice ${id} updated` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_add_customer_invoice_line', {
    description: 'Add a line to a customer invoice.',
    inputSchema: {
      id: z.number().int().describe('Invoice ID'),
      desc: z.string().describe('Line description'),
      subprice: z.number().describe('Unit price (HT)'),
      qty: z.number().describe('Quantity'),
      tva_tx: z.number().describe('VAT rate (e.g. 22.0)'),
      product_type: z.number().int().default(1).describe('0=product, 1=service'),
      fk_product: z.number().int().optional().describe('Product ID'),
      vat_src_code: z.string().optional(),
      fk_unit: z.number().int().optional(),
      info_bits: z.number().int().default(0),
      date_start: z.string().optional(),
      date_end: z.string().optional(),
      remise_percent: z.number().optional().describe('Discount %'),
    },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      (payload as Record<string, unknown>).price_base_type = 'HT';
      const lineId = await api.post(`/invoices/${id}/lines`, payload);
      return ok({ lineId: Number(lineId), message: `Line added to invoice ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_update_customer_invoice_line', {
    description: 'Update a line on a customer invoice.',
    inputSchema: {
      id: z.number().int().describe('Invoice ID'),
      lineid: z.number().int().describe('Line ID'),
      desc: z.string().optional(),
      subprice: z.number().optional(),
      qty: z.number().optional(),
      tva_tx: z.number().optional(),
      product_type: z.number().int().optional(),
      remise_percent: z.number().optional(),
    },
  }, async (args) => {
    try {
      const { id, lineid, ...payload } = args;
      await api.put(`/invoices/${id}/lines/${lineid}`, payload);
      return ok({ message: `Line ${lineid} updated on invoice ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_delete_customer_invoice_line', {
    description: 'Delete a line from a customer invoice.',
    inputSchema: {
      id: z.number().int().describe('Invoice ID'),
      lineid: z.number().int().describe('Line ID'),
    },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      await api.del(`/invoices/${args.id}/lines/${args.lineid}`);
      return ok({ message: `Line ${args.lineid} deleted from invoice ${args.id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_validate_customer_invoice', {
    description: 'Validate (finalize) a draft customer invoice.',
    inputSchema: {
      id: z.number().int().describe('Invoice ID'),
      idwarehouse: z.number().int().optional().describe('Warehouse ID for stock decrease'),
    },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      await api.post(`/invoices/${args.id}/validate`, {
        idwarehouse: args.idwarehouse ?? 0, notrigger: 0,
      });
      return ok({ message: `Invoice ${args.id} validated` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_set_customer_invoice_paid', {
    description: 'Mark a customer invoice as paid.',
    inputSchema: {
      id: z.number().int().describe('Invoice ID'),
      close_code: z.string().optional().describe('Close code (e.g. "bankorder")'),
      close_note: z.string().optional(),
    },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      await api.post(`/invoices/${args.id}/settopaid`, {
        close_code: args.close_code, close_note: args.close_note,
      });
      return ok({ message: `Invoice ${args.id} marked as paid` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_set_customer_invoice_unpaid', {
    description: 'Re-open a paid customer invoice.',
    inputSchema: { id: z.number().int().describe('Invoice ID') },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      await api.post(`/invoices/${args.id}/settounpaid`);
      return ok({ message: `Invoice ${args.id} set to unpaid` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_customer_invoice_payments', {
    description: 'List payments recorded on a customer invoice.',
    inputSchema: { id: z.number().int().describe('Invoice ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/invoices/${args.id}/payments`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_add_customer_invoice_payment', {
    description: 'Record a payment on a customer invoice.',
    inputSchema: {
      id: z.number().int().describe('Invoice ID'),
      datepaye: z.string().describe('Payment date (YYYY-MM-DD or Unix timestamp)'),
      paymentid: z.number().int().describe('Payment mode ID'),
      closepaidinvoices: z.enum(['yes', 'no']).default('yes').describe('Close invoice if fully paid'),
      accountid: z.number().int().describe('Bank account ID'),
      num_payment: z.string().optional().describe('Payment reference/check number'),
      comment: z.string().optional(),
      multicurrency_code: z.string().optional(),
      multicurrency_tx: z.number().optional(),
    },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      const result = await api.post(`/invoices/${id}/payments`, payload);
      return ok({ paymentId: result, message: `Payment recorded on invoice ${id}` });
    } catch (e) { return err(e); }
  });
}
