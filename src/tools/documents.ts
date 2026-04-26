import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DolibarrApi } from '../api.js';
import { ok, err } from '../lib/errors.js';

export function register(server: McpServer, api: DolibarrApi) {
  server.registerTool('dolibarr_upload_document', {
    description: 'Upload a document (base64 encoded) attached to an object.',
    inputSchema: {
      modulepart: z.string().describe('Module: invoice, supplier_invoice, propal, order, thirdparty, product, etc.'),
      ref: z.string().describe('Object reference (e.g. invoice ref)'),
      filename: z.string().describe('Filename with extension'),
      filecontent: z.string().describe('Base64-encoded file content'),
      overwriteifexists: z.number().int().default(1).describe('1=overwrite if exists'),
    },
  }, async (args) => {
    try {
      await api.post('/documents/upload', {
        modulepart: args.modulepart,
        ref: args.ref,
        filename: args.filename,
        filecontent: args.filecontent,
        fileencoding: 'base64',
        overwriteifexists: String(args.overwriteifexists),
      });
      return ok({ message: `Document ${args.filename} uploaded for ${args.modulepart}/${args.ref}` });
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_list_documents', {
    description: 'List documents attached to an object.',
    inputSchema: {
      modulepart: z.string().describe('Module: invoice, supplier_invoice, propal, order, thirdparty, etc.'),
      id: z.number().int().optional().describe('Object ID'),
      ref: z.string().optional().describe('Object reference'),
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      const params: Record<string, unknown> = { modulepart: args.modulepart };
      if (args.id) params.id = args.id;
      if (args.ref) params.ref = args.ref;
      return ok(await api.get('/documents', params));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_download_document', {
    description: 'Download a document (returns base64).',
    inputSchema: {
      modulepart: z.string().describe('Module name'),
      original_file: z.string().describe('Relative path to file within module directory'),
    },
    annotations: { readOnlyHint: true },
  }, async (args) => {
    try {
      return ok(await api.get('/documents/download', {
        modulepart: args.modulepart,
        original_file: args.original_file,
      }));
    } catch (e) { return err(e); }
  });

  server.registerTool('dolibarr_delete_document', {
    description: 'Delete a document.',
    inputSchema: {
      modulepart: z.string().describe('Module name'),
      original_file: z.string().describe('Relative path to file'),
    },
    annotations: { destructiveHint: true },
  }, async (args) => {
    try {
      await api.del(`/documents?modulepart=${encodeURIComponent(args.modulepart)}&original_file=${encodeURIComponent(args.original_file)}`);
      return ok({ message: `Document deleted` });
    } catch (e) { return err(e); }
  });
}
