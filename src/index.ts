#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DolibarrApi } from './api.js';
import { describeDolibarrConfig, loadDolibarrConfig } from './config.js';

import * as thirdparties from './tools/thirdparties.js';
import * as contacts from './tools/contacts.js';
import * as products from './tools/products.js';
import * as customerInvoices from './tools/customer-invoices.js';
import * as supplierInvoices from './tools/supplier-invoices.js';
import * as proposals from './tools/proposals.js';
import * as orders from './tools/orders.js';
import * as supplierOrders from './tools/supplier-orders.js';
import * as projects from './tools/projects.js';
import * as agenda from './tools/agenda.js';
import * as bankAccounts from './tools/bank-accounts.js';
import * as categories from './tools/categories.js';
import * as contracts from './tools/contracts.js';
import * as expenseReports from './tools/expense-reports.js';
import * as shipments from './tools/shipments.js';
import * as stock from './tools/stock.js';
import * as users from './tools/users.js';
import * as dictionaries from './tools/dictionaries.js';
import * as documents from './tools/documents.js';
import * as tickets from './tools/tickets.js';
import * as rawApi from './tools/raw-api.js';

const server = new McpServer(
  { name: 'dolibarr', version: '1.0.0' },
  {
    instructions: 'Dolibarr ERP tools. Use dolibarr_list_* to search/list, dolibarr_get_* for details, dolibarr_create_* to create, dolibarr_update_* to modify, dolibarr_delete_* to remove. All list tools support pagination (limit, page) and sqlfilters.',
  },
);

const config = loadDolibarrConfig();
const api = new DolibarrApi(config);

thirdparties.register(server, api);
contacts.register(server, api);
products.register(server, api);
customerInvoices.register(server, api);
supplierInvoices.register(server, api);
proposals.register(server, api);
orders.register(server, api);
supplierOrders.register(server, api);
projects.register(server, api);
agenda.register(server, api);
bankAccounts.register(server, api);
categories.register(server, api);
contracts.register(server, api);
expenseReports.register(server, api);
shipments.register(server, api);
stock.register(server, api);
users.register(server, api);
dictionaries.register(server, api);
documents.register(server, api);
tickets.register(server, api);
rawApi.register(server, api);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`Dolibarr MCP server running on stdio (${describeDolibarrConfig(config)})`);
