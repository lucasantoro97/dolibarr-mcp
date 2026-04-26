import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type JsonObject = Record<string, unknown>;

export type DolibarrConfig = {
  baseURL: string;
  apiKey: string;
  source: string;
};

type EnvInput = Record<string, string | undefined>;

export type LoadDolibarrEnvOptions = {
  env?: EnvInput;
  envPath?: string;
  configPath?: string;
  serverName?: string;
};

function asObject(value: unknown): JsonObject | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : undefined;
}

function copyEnv(env: EnvInput): Record<string, string> {
  const copied: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) copied[key] = value;
  }
  return copied;
}

function readJson(filePath: string): JsonObject | undefined {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as JsonObject;
  } catch {
    return undefined;
  }
}

function readDotenv(filePath: string): Record<string, string> {
  let text: string;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch {
    return {};
  }

  const env: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }

  return env;
}

function readMcpServerEnv(configPath: string, serverName: string): Record<string, string> {
  const mcp = readJson(configPath);
  const servers = asObject(mcp?.mcpServers);
  const server = asObject(servers?.[serverName]);
  const configuredEnv = asObject(server?.env);
  const env: Record<string, string> = {};

  for (const [key, value] of Object.entries(configuredEnv ?? {})) {
    if (typeof value === 'string') env[key] = value;
  }

  return env;
}

function resolveDolibarrEnv(options: LoadDolibarrEnvOptions = {}) {
  const env = copyEnv(options.env ?? process.env);
  const serverName = options.serverName ?? env.DOLIBARR_MCP_SERVER_NAME ?? 'dolibarr';
  const defaultEnvPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.env');
  const envPath = options.envPath ?? defaultEnvPath;
  const configPath = options.configPath ?? path.join(os.homedir(), '.mcp.json');
  const sources: string[] = [];

  if (env.DOLIBARR_BASE_URL || env.DOLIBARR_API_KEY) {
    sources.push('environment');
  }

  if (!env.DOLIBARR_BASE_URL || !env.DOLIBARR_API_KEY) {
    const configuredEnv = readDotenv(envPath);
    let usedDotenv = false;

    for (const key of ['DOLIBARR_BASE_URL', 'DOLIBARR_API_KEY']) {
      if (!env[key] && configuredEnv[key]) {
        env[key] = configuredEnv[key];
        usedDotenv = true;
      }
    }

    if (usedDotenv) {
      sources.push(envPath);
    }
  }

  if (!env.DOLIBARR_BASE_URL || !env.DOLIBARR_API_KEY) {
    const configuredEnv = readMcpServerEnv(configPath, serverName);
    let usedMcpConfig = false;

    for (const key of ['DOLIBARR_BASE_URL', 'DOLIBARR_API_KEY']) {
      if (!env[key] && configuredEnv[key]) {
        env[key] = configuredEnv[key];
        usedMcpConfig = true;
      }
    }

    if (usedMcpConfig) {
      sources.push(`${configPath}:mcpServers.${serverName}.env`);
    }
  }

  const missing = ['DOLIBARR_BASE_URL', 'DOLIBARR_API_KEY'].filter((key) => !env[key]);
  if (missing.length) {
    throw new Error(
      `${missing.join(' and ')} required. Set DOLIBARR_BASE_URL and DOLIBARR_API_KEY in the process environment, in ${envPath}, or in ${configPath} under mcpServers.${serverName}.env.`,
    );
  }

  return {
    env,
    source: sources.join(' + ') || 'environment',
  };
}

export function loadDolibarrEnv(options: LoadDolibarrEnvOptions = {}): Record<string, string> {
  return resolveDolibarrEnv(options).env;
}

export function loadDolibarrConfig(options: LoadDolibarrEnvOptions = {}): DolibarrConfig {
  const { env, source } = resolveDolibarrEnv(options);
  return {
    baseURL: env.DOLIBARR_BASE_URL,
    apiKey: env.DOLIBARR_API_KEY,
    source,
  };
}

export function describeDolibarrConfig(config: DolibarrConfig): string {
  return `config=${config.source}, baseURL=${config.baseURL}, apiKey=present`;
}
