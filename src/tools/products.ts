import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DolibarrApi } from '../api.js';
import { ok, err } from '../lib/errors.js';
import { paginationFields, paginationParams, formatList } from '../lib/pagination.js';

export function register(server: McpServer, api: DolibarrApi) {
  server.registerTool('dolibarr_list_products', {
    description: 'List/search products and services. Filter by type, category, ref, barcode, sqlfilters.',
    inputSchema: {
      type: z.enum(['product', 'service']).optional().describe('Filter: "product" (mode=1) or "service" (mode=2)'),
      category: z.number().int().optional().describe('Filter by category ID'),
      sqlfilters: z.string().optional().describe('Dolibarr SQL filter'),
      ...paginationFields,
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const params: Record<string, unknown> = paginationParams(args);
      if (args.type) params.mode = args.type === 'product' ? 1 : 2;
      if (args.category) params.category = args.category;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      return ok(formatList(await api.get('/products', params), args));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_product', {
    description: 'Get full product/service details by ID (incl. description, prices, stock levels).',
    inputSchema: { id: z.number().int().describe('Product ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/products/${args.id}`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_create_product', {
    description: 'Create a new product or service.',
    inputSchema: {
      ref: z.string().describe('Product reference code'),
      label: z.string().describe('Product label/name'),
      type: z.number().int().min(0).max(1).default(0).describe('0 = product, 1 = service'),
      description: z.string().optional().describe('Product description (HTML allowed)'),
      price: z.number().optional().describe('Selling price (HT)'),
      price_ttc: z.number().optional().describe('Selling price (TTC)'),
      price_base_type: z.enum(['HT', 'TTC']).optional().describe('Price base: HT or TTC'),
      tva_tx: z.number().optional().describe('VAT rate (e.g. 22.0)'),
      cost_price: z.number().optional().describe('Cost price'),
      status: z.number().int().optional().describe('0 = not for sale, 1 = for sale'),
      status_buy: z.number().int().optional().describe('0 = not for purchase, 1 = for purchase'),
      barcode: z.string().optional(),
      weight: z.number().optional(),
      weight_units: z.number().int().optional(),
      duration: z.string().optional().describe('Duration for services (e.g. "1h", "30m")'),
      note_public: z.string().optional(),
      note_private: z.string().optional(),
      fk_unit: z.number().int().optional().describe('Unit ID'),
    },
  }, async (args) => {
    try {
      const id = await api.post('/products', args);
      return ok({ id: Number(id), message: `Product created with ID ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_update_product', {
    description: 'Update an existing product/service (price, description, status, etc.).',
    inputSchema: {
      id: z.number().int().describe('Product ID'),
      ref: z.string().optional(),
      label: z.string().optional(),
      description: z.string().optional(),
      price: z.number().optional(),
      price_ttc: z.number().optional(),
      price_base_type: z.enum(['HT', 'TTC']).optional(),
      tva_tx: z.number().optional(),
      cost_price: z.number().optional(),
      status: z.number().int().optional(),
      status_buy: z.number().int().optional(),
      barcode: z.string().optional(),
      weight: z.number().optional(),
      note_public: z.string().optional(),
      note_private: z.string().optional(),
      fk_unit: z.number().int().optional().describe('Unit ID'),
    },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      await api.put(`/products/${id}`, payload);
      return ok({ message: `Product ${id} updated` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_delete_product', {
    description: 'Delete a product/service.',
    inputSchema: { id: z.number().int().describe('Product ID') },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      await api.del(`/products/${args.id}`);
      return ok({ message: `Product ${args.id} deleted` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_product_stock', {
    description: 'Get stock levels by warehouse for a product.',
    inputSchema: { id: z.number().int().describe('Product ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/products/${args.id}/stock`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_list_product_categories', {
    description: 'List categories assigned to a product.',
    inputSchema: { id: z.number().int().describe('Product ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/products/${args.id}/categories`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_product_subproducts', {
    description: 'Get subproducts (BOM components) of a product.',
    inputSchema: { id: z.number().int().describe('Product ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/products/${args.id}/subproducts`)); }
    catch (e) { return err(e); }
  });
}
