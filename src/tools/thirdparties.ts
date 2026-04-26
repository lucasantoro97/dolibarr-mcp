import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DolibarrApi, isAxiosError } from '../api.js';
import { ok, err } from '../lib/errors.js';
import { paginationFields, paginationParams, formatList } from '../lib/pagination.js';
import {
  normalizeVat, buildVatLookupTokens, vatEquivalent,
  normalizeForCompare, escapeSqlFilterValue,
} from '../lib/vat-utils.js';

interface ThirdPartyView {
  id?: number | string;
  rowid?: number | string;
  name?: string;
  nom?: string;
  tva_intra?: string;
  siren?: string;
  idprof4?: string;
  [key: string]: unknown;
}

function pickId(row: ThirdPartyView): number | null {
  const id = Number(row.id ?? row.rowid ?? 0);
  return id > 0 ? id : null;
}

export function register(server: McpServer, api: DolibarrApi) {
  server.registerTool('dolibarr_list_third_parties', {
    description: 'List/search third parties (customers, suppliers, prospects). Supports sqlfilters.',
    inputSchema: {
      mode: z.enum(['customer', 'supplier', 'prospect']).optional().describe('Filter by type'),
      sqlfilters: z.string().optional().describe('Dolibarr SQL filter, e.g. (t.nom:like:\'%acme%\')'),
      ...paginationFields,
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const params: Record<string, unknown> = paginationParams(args);
      if (args.mode) params.mode = args.mode === 'customer' ? 1 : args.mode === 'prospect' ? 2 : 4;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      const data = await api.get('/thirdparties', params);
      return ok(formatList(data, args));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_third_party', {
    description: 'Get full details of a third party by ID.',
    inputSchema: { id: z.number().int().describe('Third party ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/thirdparties/${args.id}`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_find_third_party_by_vat', {
    description: 'Find a third party by VAT number (Italian VAT normalization with multi-strategy lookup).',
    inputSchema: { vat: z.string().describe('VAT number to search for') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const normalized = normalizeVat(args.vat);
      if (!normalized) return ok({ found: false, message: 'Empty VAT after normalization' });

      const lookupTokens = buildVatLookupTokens(normalized);
      const filters: string[] = [];
      for (const token of lookupTokens) {
        filters.push(`(t.tva_intra:=:'${token}')`);
        filters.push(`(t.siren:=:'${token}')`);
        filters.push(`(t.idprof4:=:'${token}')`);
      }

      for (const filter of filters) {
        let rows: ThirdPartyView[] = [];
        try {
          rows = await api.get<ThirdPartyView[]>('/thirdparties', {
            limit: 50, sortfield: 't.rowid', sortorder: 'DESC', sqlfilters: filter,
          });
          if (!Array.isArray(rows)) rows = [];
        } catch (e) {
          if (isAxiosError(e) && (e.response?.status === 404 || e.response?.status === 400)) continue;
          throw e;
        }
        const found = rows.find((row) => {
          const fields = [row.tva_intra, row.siren, row.idprof4];
          return fields.some((v) => vatEquivalent(String(v ?? ''), normalized));
        });
        if (found) {
          const id = pickId(found);
          if (id) return ok({ found: true, id, name: found.name ?? found.nom, tva_intra: found.tva_intra });
        }
      }

      // Fallback: scan all
      const limit = 100;
      for (let page = 0; page < 80; page++) {
        let rows: ThirdPartyView[] = [];
        try {
          rows = await api.get<ThirdPartyView[]>('/thirdparties', {
            limit, page, sortfield: 't.rowid', sortorder: 'DESC',
          });
          if (!Array.isArray(rows)) rows = [];
        } catch (e) {
          if (isAxiosError(e) && e.response?.status === 404) break;
          throw e;
        }
        if (!rows.length) break;
        for (const row of rows) {
          const fields = [row.tva_intra, row.siren, row.idprof4];
          if (fields.some((v) => vatEquivalent(String(v ?? ''), normalized))) {
            const id = pickId(row);
            if (id) return ok({ found: true, id, name: row.name ?? row.nom, tva_intra: row.tva_intra });
          }
        }
        if (rows.length < limit) break;
      }

      return ok({ found: false });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_find_third_party_by_name', {
    description: 'Find a third party by exact name.',
    inputSchema: { name: z.string().describe('Name to search for') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const trimmed = args.name.trim();
      if (!trimmed) return ok({ found: false });
      const normalizedName = normalizeForCompare(trimmed);
      const escaped = escapeSqlFilterValue(trimmed);
      const filters = [`(t.nom:=:'${escaped}')`, `(t.nom:like:'${escaped}')`];

      for (const filter of filters) {
        let rows: ThirdPartyView[] = [];
        try {
          rows = await api.get<ThirdPartyView[]>('/thirdparties', {
            limit: 50, sortfield: 't.rowid', sortorder: 'DESC', sqlfilters: filter,
          });
          if (!Array.isArray(rows)) rows = [];
        } catch (e) {
          if (isAxiosError(e) && e.response?.status === 400) continue;
          throw e;
        }
        const found = rows.find((row) => normalizeForCompare(row.name ?? row.nom) === normalizedName);
        if (found) {
          const id = pickId(found);
          if (id) return ok({ found: true, id, name: found.name ?? found.nom });
        }
      }
      return ok({ found: false });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_create_third_party', {
    description: 'Create a new third party (customer, supplier, or both).',
    inputSchema: {
      name: z.string().describe('Company/person name'),
      client: z.number().int().min(0).max(1).optional().describe('1 = customer'),
      fournisseur: z.number().int().min(0).max(1).optional().describe('1 = supplier'),
      prospect: z.number().int().min(0).max(1).optional().describe('1 = prospect'),
      tva_intra: z.string().optional().describe('VAT number'),
      idprof4: z.string().optional().describe('Fiscal code'),
      address: z.string().optional(),
      zip: z.string().optional(),
      town: z.string().optional(),
      country_code: z.string().optional().describe('2-letter country code'),
      email: z.string().optional(),
      phone: z.string().optional(),
      code_client: z.string().optional().describe('Customer code (use "auto" for auto-generation)'),
      code_fournisseur: z.string().optional().describe('Supplier code (use "auto" for auto-generation)'),
    },
  }, async (args) => {
    try {
      const payload: Record<string, unknown> = { ...args };
      if (!payload.code_client && args.client) payload.code_client = 'auto';
      if (!payload.code_fournisseur && args.fournisseur) payload.code_fournisseur = 'auto';
      const id = await api.post('/thirdparties', payload);
      return ok({ id: Number(id), message: `Third party created with ID ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_update_third_party', {
    description: 'Update an existing third party.',
    inputSchema: {
      id: z.number().int().describe('Third party ID'),
      name: z.string().optional(),
      tva_intra: z.string().optional(),
      address: z.string().optional(),
      zip: z.string().optional(),
      town: z.string().optional(),
      country_code: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      client: z.number().int().optional(),
      fournisseur: z.number().int().optional(),
    },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      await api.put(`/thirdparties/${id}`, payload);
      return ok({ message: `Third party ${id} updated` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_delete_third_party', {
    description: 'Delete a third party.',
    inputSchema: { id: z.number().int().describe('Third party ID') },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      await api.del(`/thirdparties/${args.id}`);
      return ok({ message: `Third party ${args.id} deleted` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_third_party_outstanding', {
    description: 'Get outstanding invoices for a third party.',
    inputSchema: {
      id: z.number().int().describe('Third party ID'),
      mode: z.enum(['customer', 'supplier']).optional().describe('Invoice type'),
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const params: Record<string, unknown> = {};
      if (args.mode) params.mode = args.mode;
      return ok(await api.get(`/thirdparties/${args.id}/outstandinginvoices`, params));
    } catch (e) { return err(e); }
  });
}
