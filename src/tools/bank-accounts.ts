import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DolibarrApi } from '../api.js';
import { ok, err } from '../lib/errors.js';
import { paginationFields, paginationParams, formatList } from '../lib/pagination.js';

export function register(server: McpServer, api: DolibarrApi) {
  server.registerTool('dolibarr_list_bank_accounts', {
    description: 'List company bank accounts.',
    inputSchema: { ...paginationFields },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      return ok(formatList(await api.get('/bankaccounts', paginationParams(args)), args));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_bank_account', {
    description: 'Get bank account details by ID.',
    inputSchema: { id: z.number().int().describe('Bank account ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/bankaccounts/${args.id}`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_bank_account_lines', {
    description: 'Get bank account transaction lines.',
    inputSchema: {
      id: z.number().int().describe('Bank account ID'),
      sqlfilters: z.string().optional(),
      ...paginationFields,
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const params: Record<string, unknown> = paginationParams(args);
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      return ok(formatList(await api.get(`/bankaccounts/${args.id}/lines`, params), args));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_create_bank_transfer', {
    description: 'Create an internal bank transfer between two accounts.',
    inputSchema: {
      bankaccount_from_id: z.number().int().describe('Source bank account ID'),
      bankaccount_to_id: z.number().int().describe('Destination bank account ID'),
      date: z.string().describe('Transfer date'),
      description: z.string().describe('Transfer description'),
      amount: z.number().describe('Transfer amount'),
      cheque_number: z.string().optional(),
    },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      const result = await api.post('/bankaccounts/transfer', args);
      return ok({ result, message: 'Bank transfer created' });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_list_third_party_bank_accounts', {
    description: 'List bank accounts for a third party (supplier/customer).',
    inputSchema: { id: z.number().int().describe('Third party ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/thirdparties/${args.id}/bankaccounts`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_create_third_party_bank_account', {
    description: 'Create a bank account for a third party.',
    inputSchema: {
      id: z.number().int().describe('Third party ID'),
      iban: z.string().describe('IBAN'),
      bic: z.string().optional().describe('BIC/SWIFT'),
      bank: z.string().optional().describe('Bank name'),
      label: z.string().optional().describe('Account label'),
      default_rib: z.number().int().optional().describe('1 = set as default'),
    },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      const result = await api.post(`/thirdparties/${id}/bankaccounts`, payload);
      return ok({ result, message: `Bank account created for third party ${id}` });
    } catch (e) { return err(e); }
  });
}
