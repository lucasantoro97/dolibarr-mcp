# Dolibarr MCP Server

MCP server for the Dolibarr ERP REST API. It exposes typed tools for common Dolibarr modules and raw API tools for full REST coverage when a typed wrapper does not expose a specific endpoint or field.

## Setup

```bash
npm install
npm run build
cp .env.example .env
npm start
```

Set `DOLIBARR_BASE_URL` and `DOLIBARR_API_KEY` in `.env`, in the process environment, or in your MCP client config.

For Codex or Claude Desktop, point the MCP server command to:

```bash
node /path/to/dolibarr-mcp/build/index.js
```

with these environment variables:

- `DOLIBARR_BASE_URL`: Dolibarr host, with or without `/api/index.php`
- `DOLIBARR_API_KEY`: Dolibarr API key

Credential source order is: process environment, repo-local `.env`, then `~/.mcp.json` under `mcpServers.dolibarr.env`. Do not commit API keys. Use `.env`, environment variables, or your MCP client secret configuration.

## Tool Coverage

Typed tools cover common operations for:

- third parties, contacts, products, categories
- proposals, orders, customer invoices
- supplier orders, supplier invoices
- projects, tasks, agenda events
- bank accounts, contracts, expense reports
- shipments, warehouses, stock movements
- users, tickets, documents, dictionaries

Raw tools cover the remaining Dolibarr REST surface:

- `dolibarr_api_get`: read-only GET for any relative Dolibarr API path
- `dolibarr_api_request`: POST/PUT/DELETE with unchanged query/body fields; requires `confirm_write: true`
- `dolibarr_get_api_schema`: fetches the live Dolibarr Swagger schema summary or raw schema

Use typed tools first. Use raw tools when you need an endpoint or field that the typed wrapper does not model yet.

## Tests

```bash
npm test
```

Runs TypeScript build plus a registry test that checks tool registration, raw path normalization, write confirmation, and raw body passthrough.

Live read-only smoke test:

```bash
npm run smoke:readonly
```

This starts the built MCP server, lists tools, fetches the API schema, and calls representative read-only tools against a real Dolibarr instance. It reads `DOLIBARR_BASE_URL` and `DOLIBARR_API_KEY` from the same source order as the server.

## Safety

`dolibarr_api_request` can create, update, validate, close, or delete records. The tool refuses to run unless `confirm_write` is exactly `true`. Prefer read-only tools for inspection and keep write calls scoped to draft/test data unless production changes are intended.
