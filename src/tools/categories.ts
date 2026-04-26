import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DolibarrApi } from '../api.js';
import { ok, err } from '../lib/errors.js';
import { paginationFields, paginationParams, formatList } from '../lib/pagination.js';

export function register(server: McpServer, api: DolibarrApi) {
  server.registerTool('dolibarr_list_categories', {
    description: 'List categories. Filter by type.',
    inputSchema: {
      type: z.enum(['product', 'supplier', 'customer', 'member', 'contact', 'project']).optional()
        .describe('Category type'),
      sqlfilters: z.string().optional(),
      ...paginationFields,
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const params: Record<string, unknown> = paginationParams(args);
      if (args.type) params.type = args.type;
      if (args.sqlfilters) params.sqlfilters = args.sqlfilters;
      return ok(formatList(await api.get('/categories', params), args));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_category', {
    description: 'Get category details by ID.',
    inputSchema: { id: z.number().int().describe('Category ID') },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try { return ok(await api.get(`/categories/${args.id}`)); }
    catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_create_category', {
    description: 'Create a new category.',
    inputSchema: {
      label: z.string().describe('Category name'),
      type: z.enum(['product', 'supplier', 'customer', 'member', 'contact', 'project']).describe('Category type'),
      description: z.string().optional(),
      color: z.string().optional().describe('Hex color without #'),
      fk_parent: z.number().int().optional().describe('Parent category ID'),
    },
  }, async (args) => {
    try {
      const id = await api.post('/categories', args);
      return ok({ id: Number(id), message: `Category created with ID ${id}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_update_category', {
    description: 'Update a category.',
    inputSchema: {
      id: z.number().int().describe('Category ID'),
      label: z.string().optional(),
      description: z.string().optional(),
      color: z.string().optional(),
    },
  }, async (args) => {
    try {
      const { id, ...payload } = args;
      await api.put(`/categories/${id}`, payload);
      return ok({ message: `Category ${id} updated` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_category_objects', {
    description: 'Get objects assigned to a category.',
    inputSchema: {
      id: z.number().int().describe('Category ID'),
      type: z.enum(['product', 'supplier', 'customer', 'member', 'contact', 'project']).describe('Object type'),
      ...paginationFields,
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const params: Record<string, unknown> = paginationParams(args);
      params.type = args.type;
      return ok(formatList(await api.get(`/categories/${args.id}/objects`, params), args));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_link_object_to_category', {
    description: 'Link an object (product, customer, etc.) to a category.',
    inputSchema: {
      id: z.number().int().describe('Category ID'),
      type: z.enum(['product', 'supplier', 'customer', 'member', 'contact', 'project']).describe('Object type'),
      object_id: z.number().int().describe('Object ID to link'),
    },
  }, async (args) => {
    try {
      await api.post(`/categories/${args.id}/objects/${args.type}/${args.object_id}`);
      return ok({ message: `Object ${args.object_id} linked to category ${args.id}` });
    } catch (e) { return err(e); }
  });
}
