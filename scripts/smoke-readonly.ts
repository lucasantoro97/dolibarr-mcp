import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { loadDolibarrEnv } from '../src/config.js';

type JsonObject = Record<string, unknown>;

function textOf(result: { content?: Array<{ type: string; text?: string }>; isError?: boolean }) {
  return result.content?.map((item) => item.text ?? '').join('\n') ?? '';
}

function parseJsonPrefix(text: string): unknown {
  const jsonText = text
    .replace(/\n\nShowing[\s\S]*$/m, '')
    .replace(/\n\n\d+ result\(s\) on page [\s\S]*$/m, '')
    .trim();
  return JSON.parse(jsonText);
}

function firstId(text: string): number | undefined {
  const parsed = parseJsonPrefix(text);
  const row = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!row || typeof row !== 'object') return undefined;
  const value = (row as JsonObject).id ?? (row as JsonObject).rowid;
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : undefined;
}

async function main() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const serverPath = path.join(root, 'build', 'index.js');
  if (!fs.existsSync(serverPath)) throw new Error('Build missing. Run npm run build first.');

  const client = new Client({ name: 'dolibarr-mcp-readonly-smoke', version: '1.0.0' });
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
    env: loadDolibarrEnv(),
  });

  await client.connect(transport);
  const results: Array<{ tool: string; status: string; bytes?: number }> = [];

  async function call(tool: string, args?: JsonObject) {
    const result = await client.callTool(args === undefined ? { name: tool } : { name: tool, arguments: args });
    const text = textOf(result);
    if (result.isError) throw new Error(`${tool} failed: ${text.slice(0, 500)}`);
    results.push({ tool, status: 'ok', bytes: text.length });
    return text;
  }

  try {
    const listed = await client.listTools();
    if (listed.tools.length < 139) throw new Error(`Expected at least 139 tools, got ${listed.tools.length}`);

    await call('dolibarr_get_current_user');
    await call('dolibarr_list_payment_modes');
    await call('dolibarr_list_payment_terms');
    await call('dolibarr_list_units');
    await call('dolibarr_list_currencies');
    await call('dolibarr_get_api_schema', { tag: 'products' });
    await call('dolibarr_api_get', { path: '/status' });

    const listTools: Array<[string, JsonObject, string | undefined]> = [
      ['dolibarr_list_third_parties', { limit: 1, page: 0 }, 'dolibarr_get_third_party'],
      ['dolibarr_list_contacts', { limit: 1, page: 0 }, 'dolibarr_get_contact'],
      ['dolibarr_list_products', { limit: 1, page: 0 }, 'dolibarr_get_product'],
      ['dolibarr_list_customer_invoices', { limit: 1, page: 0 }, 'dolibarr_get_customer_invoice'],
      ['dolibarr_list_supplier_invoices', { limit: 1, page: 0 }, 'dolibarr_get_supplier_invoice'],
      ['dolibarr_list_proposals', { limit: 1, page: 0 }, 'dolibarr_get_proposal'],
      ['dolibarr_list_orders', { limit: 1, page: 0 }, 'dolibarr_get_order'],
      ['dolibarr_list_supplier_orders', { limit: 1, page: 0 }, 'dolibarr_get_supplier_order'],
      ['dolibarr_list_projects', { limit: 1, page: 0 }, 'dolibarr_get_project'],
      ['dolibarr_list_tasks', { limit: 1, page: 0 }, 'dolibarr_get_task'],
      ['dolibarr_list_agenda_events', { limit: 1, page: 0 }, 'dolibarr_get_agenda_event'],
      ['dolibarr_list_bank_accounts', { limit: 1, page: 0 }, 'dolibarr_get_bank_account'],
      ['dolibarr_list_categories', { limit: 1, page: 0 }, 'dolibarr_get_category'],
      ['dolibarr_list_contracts', { limit: 1, page: 0 }, 'dolibarr_get_contract'],
      ['dolibarr_list_expense_reports', { limit: 1, page: 0 }, 'dolibarr_get_expense_report'],
      ['dolibarr_list_shipments', { limit: 1, page: 0 }, 'dolibarr_get_shipment'],
      ['dolibarr_list_warehouses', { limit: 1, page: 0 }, 'dolibarr_get_warehouse'],
      ['dolibarr_list_stock_movements', { limit: 1, page: 0 }, undefined],
      ['dolibarr_list_users', { limit: 1, page: 0 }, 'dolibarr_get_user'],
      ['dolibarr_list_tickets', { limit: 1, page: 0 }, 'dolibarr_get_ticket'],
      ['dolibarr_list_countries', { limit: 1, page: 0 }],
    ];

    const ids: Record<string, number> = {};
    for (const [tool, args, getTool] of listTools) {
      const text = await call(tool, args);
      const id = firstId(text);
      if (id && getTool) {
        ids[tool] = id;
        await call(getTool, { id });
      }
    }

    if (ids.dolibarr_list_products) {
      await call('dolibarr_get_product_stock', { id: ids.dolibarr_list_products });
      await call('dolibarr_list_product_categories', { id: ids.dolibarr_list_products });
      await call('dolibarr_get_product_subproducts', { id: ids.dolibarr_list_products });
    }
    if (ids.dolibarr_list_bank_accounts) {
      await call('dolibarr_get_bank_account_lines', { id: ids.dolibarr_list_bank_accounts, limit: 1, page: 0 });
    }
    if (ids.dolibarr_list_customer_invoices) {
      await call('dolibarr_get_customer_invoice_payments', { id: ids.dolibarr_list_customer_invoices });
    }
    if (ids.dolibarr_list_supplier_invoices) {
      await call('dolibarr_get_supplier_invoice_payments', { id: ids.dolibarr_list_supplier_invoices });
    }
    if (ids.dolibarr_list_tasks) {
      await call('dolibarr_list_task_time', { id: ids.dolibarr_list_tasks });
    }

    console.log(JSON.stringify({
      status: 'ok',
      toolCount: listed.tools.length,
      calls: results.length,
      results,
    }, null, 2));
  } finally {
    await client.close();
  }
}

await main();
