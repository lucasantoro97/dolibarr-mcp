import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import * as thirdparties from '../src/tools/thirdparties.js';
import * as contacts from '../src/tools/contacts.js';
import * as products from '../src/tools/products.js';
import * as customerInvoices from '../src/tools/customer-invoices.js';
import * as supplierInvoices from '../src/tools/supplier-invoices.js';
import * as proposals from '../src/tools/proposals.js';
import * as orders from '../src/tools/orders.js';
import * as supplierOrders from '../src/tools/supplier-orders.js';
import * as projects from '../src/tools/projects.js';
import * as agenda from '../src/tools/agenda.js';
import * as bankAccounts from '../src/tools/bank-accounts.js';
import * as categories from '../src/tools/categories.js';
import * as contracts from '../src/tools/contracts.js';
import * as expenseReports from '../src/tools/expense-reports.js';
import * as shipments from '../src/tools/shipments.js';
import * as stock from '../src/tools/stock.js';
import * as users from '../src/tools/users.js';
import * as dictionaries from '../src/tools/dictionaries.js';
import * as documents from '../src/tools/documents.js';
import * as tickets from '../src/tools/tickets.js';
import * as rawApi from '../src/tools/raw-api.js';

type Handler = (args: Record<string, unknown>) => Promise<unknown>;

class FakeServer {
  tools = new Map<string, { config: Record<string, unknown>; handler: Handler }>();

  registerTool(name: string, config: Record<string, unknown>, handler: Handler) {
    if (this.tools.has(name)) throw new Error(`Duplicate tool registered: ${name}`);
    this.tools.set(name, { config, handler });
  }
}

class FakeApi {
  calls: Array<{ method: string; path: string; params?: unknown; body?: unknown }> = [];

  async get(path: string, params?: unknown) {
    this.calls.push({ method: 'GET', path, params });
    if (path === '/explorer/swagger.json') {
      return {
        swagger: '2.0',
        info: { title: 'fake' },
        paths: { '/products': { get: { tags: ['products'], operationId: 'listProducts' } } },
        definitions: { createProductsModel: {} },
      };
    }
    return { ok: true, path, params };
  }

  async post(path: string, body?: unknown) {
    this.calls.push({ method: 'POST', path, body });
    return 123;
  }

  async put(path: string, body?: unknown) {
    this.calls.push({ method: 'PUT', path, body });
    return { ok: true };
  }

  async del(path: string) {
    this.calls.push({ method: 'DELETE', path });
    return { ok: true };
  }

  async request(method: string, path: string, options: { params?: unknown; body?: unknown }) {
    this.calls.push({ method, path, params: options.params, body: options.body });
    return { ok: true, method, path, params: options.params, body: options.body };
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const server = new FakeServer();
const api = new FakeApi();

[
  thirdparties,
  contacts,
  products,
  customerInvoices,
  supplierInvoices,
  proposals,
  orders,
  supplierOrders,
  projects,
  agenda,
  bankAccounts,
  categories,
  contracts,
  expenseReports,
  shipments,
  stock,
  users,
  dictionaries,
  documents,
  tickets,
  rawApi,
].forEach((module) => module.register(server as unknown as McpServer, api as never));

assert(server.tools.size >= 139, `Expected at least 139 tools, got ${server.tools.size}`);

for (const [name, tool] of server.tools.entries()) {
  assert(name.startsWith('dolibarr_'), `Tool name missing prefix: ${name}`);
  assert(typeof tool.config.description === 'string' && tool.config.description.length > 10, `Tool missing useful description: ${name}`);
}

const rawGet = server.tools.get('dolibarr_api_get');
assert(rawGet, 'dolibarr_api_get not registered');
await rawGet.handler({ path: '/api/index.php/products', params: { limit: 1 } });
assert(api.calls.at(-1)?.path === '/products', 'Raw GET should normalize /api/index.php prefix');

const rawWrite = server.tools.get('dolibarr_api_request');
assert(rawWrite, 'dolibarr_api_request not registered');
const blocked = await rawWrite.handler({ method: 'POST', path: '/products', body: { custom_field: 'kept' }, confirm_write: false });
assert((blocked as { isError?: boolean }).isError === true, 'Raw write must require confirm_write=true');

await rawWrite.handler({
  method: 'POST',
  path: '/products',
  body: { ref: 'TEST', array_options: { options_color: 'blue' }, custom_field: 'kept' },
  confirm_write: true,
});
assert((api.calls.at(-1)?.body as Record<string, unknown>).custom_field === 'kept', 'Raw write must preserve arbitrary API fields');

const schemaTool = server.tools.get('dolibarr_get_api_schema');
assert(schemaTool, 'dolibarr_get_api_schema not registered');
await schemaTool.handler({ tag: 'products', include_raw: false });

await server.tools.get('dolibarr_list_third_parties')?.handler({ mode: 'supplier', limit: 1, page: 0 });
assert((api.calls.at(-1)?.params as Record<string, unknown>).mode === 4, 'Supplier third-party list must use Dolibarr mode=4');

await server.tools.get('dolibarr_list_products')?.handler({ type: 'service', limit: 1, page: 0 });
assert((api.calls.at(-1)?.params as Record<string, unknown>).mode === 2, 'Service list must use Dolibarr product mode=2');

await server.tools.get('dolibarr_add_proposal_line')?.handler({ id: 5, desc: 'x', subprice: 1, qty: 1, tva_tx: 22, product_type: 1 });
assert(api.calls.at(-1)?.path === '/proposals/5/line', 'Proposal single-line create must use /proposals/{id}/line');
assert(!Array.isArray(api.calls.at(-1)?.body), 'Single-line create body must be an object, not an array');

await server.tools.get('dolibarr_add_customer_invoice_line')?.handler({ id: 6, desc: 'x', subprice: 1, qty: 1, tva_tx: 22, product_type: 1, info_bits: 0 });
assert(api.calls.at(-1)?.path === '/invoices/6/lines', 'Invoice line path mismatch');
assert(!Array.isArray(api.calls.at(-1)?.body), 'Invoice line body must be an object, not an array');

await server.tools.get('dolibarr_create_order_invoice')?.handler({ id: 7 });
assert(api.calls.at(-1)?.path === '/invoices/createfromorder/7', 'Invoice-from-order endpoint mismatch');

await server.tools.get('dolibarr_add_task_time')?.handler({ id: 8, date: '2026-01-01', duration: 60, user_id: 1 });
assert(api.calls.at(-1)?.path === '/tasks/8/addtimespent', 'Task time endpoint mismatch');
assert((api.calls.at(-1)?.body as Record<string, unknown>).user_id === 1, 'Task time must send user_id');

await server.tools.get('dolibarr_create_stock_movement')?.handler({ product_id: 9, warehouse_id: 1, qty: 1, type: 0 });
assert((api.calls.at(-1)?.body as Record<string, unknown>).product_id === 9, 'Stock movement must send product_id');

console.log(JSON.stringify({
  status: 'ok',
  toolCount: server.tools.size,
  checked: ['unique names', 'descriptions', 'raw GET normalization', 'raw write confirmation', 'raw body passthrough', 'Swagger summary', 'Dolibarr endpoint/field mappings'],
}, null, 2));
