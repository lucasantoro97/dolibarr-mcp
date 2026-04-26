import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DolibarrApi, DolibarrHttpMethod, normalizeDolibarrPath } from '../api.js';
import { ok, err } from '../lib/errors.js';

const paramsSchema = z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional();

type SwaggerOperation = {
  tags?: string[];
  operationId?: string;
  summary?: string;
  parameters?: unknown[];
};

type SwaggerSchema = {
  swagger?: string;
  openapi?: string;
  info?: unknown;
  paths?: Record<string, Record<string, SwaggerOperation>>;
  definitions?: Record<string, unknown>;
};

function summarizeSwagger(schema: SwaggerSchema, tag?: string) {
  const paths = schema.paths ?? {};
  const operations = Object.entries(paths).flatMap(([path, methods]) => (
    Object.entries(methods).map(([method, operation]) => ({ path, method, operation }))
  ));
  const filtered = tag
    ? operations.filter(({ operation }) => operation.tags?.includes(tag))
    : operations;

  return {
    swagger: schema.swagger ?? schema.openapi,
    info: schema.info,
    pathCount: new Set(filtered.map((item) => item.path)).size,
    operationCount: filtered.length,
    definitionCount: Object.keys(schema.definitions ?? {}).length,
    operations: filtered.map(({ path, method, operation }) => ({
      path,
      method: method.toUpperCase(),
      operationId: operation.operationId,
      tags: operation.tags,
      summary: operation.summary,
      parameterCount: operation.parameters?.length ?? 0,
    })),
  };
}

export function register(server: McpServer, api: DolibarrApi) {
  server.registerTool('dolibarr_api_get', {
    description: 'Low-level read-only Dolibarr REST API GET. Use when typed tools do not expose an endpoint or field.',
    inputSchema: {
      path: z.string().describe('Relative path under /api/index.php, for example /products/123 or /api/index.php/products'),
      params: paramsSchema.describe('Query parameters passed to Dolibarr unchanged'),
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      return ok(await api.get(normalizeDolibarrPath(args.path), args.params));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_api_request', {
    description: 'Advanced raw Dolibarr REST API write/delete request. Body and query fields are passed through unchanged.',
    inputSchema: {
      method: z.enum(['POST', 'PUT', 'DELETE']).describe('HTTP method'),
      path: z.string().describe('Relative path under /api/index.php'),
      params: paramsSchema.describe('Query parameters passed to Dolibarr unchanged'),
      body: z.any().optional().describe('JSON body passed to Dolibarr unchanged, allowing full API field coverage'),
      confirm_write: z.boolean().describe('Must be true. Required because this can create, update, validate, close, or delete records.'),
    },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      if (args.confirm_write !== true) {
        throw new Error('confirm_write must be true for raw write/delete API requests');
      }
      const method = args.method as DolibarrHttpMethod;
      return ok(await api.request(method, normalizeDolibarrPath(args.path), {
        params: args.params,
        body: args.body,
      }));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_get_api_schema', {
    description: 'Fetch Dolibarr Swagger schema summary to inspect available API operations and body models.',
    inputSchema: {
      tag: z.string().optional().describe('Optional Swagger tag/module filter, for example products, invoices, proposals'),
      include_raw: z.boolean().default(false).describe('Return full raw Swagger JSON instead of a compact summary'),
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const schema = await api.get<SwaggerSchema>('/explorer/swagger.json');
      return ok(args.include_raw ? schema : summarizeSwagger(schema, args.tag));
    } catch (e) { return err(e); }
  });
}
