import { GoUsageResponse, GoUsageWindow } from '../types';
import { OpenCodeGoUsageError } from './errors';

import { readFile } from 'fs/promises';

import axios from 'axios';
import * as os from 'os';
import * as path from 'path';

/** OpenCode Go's authenticated usage endpoint. */
export const OPENCODE_GO_USAGE_URL = 'https://opencode.ai/zen/go/v1/usage';

interface OpenCodeAuthEntry {
  type?: unknown;
  key?: unknown;
}

function getOpenCodeDataDirectory(): string {
  if (process.env.XDG_DATA_HOME) {
    return process.env.XDG_DATA_HOME;
  }

  if (process.platform === 'win32') {
    return process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming');
  }

  return path.join(os.homedir(), '.local', 'share');
}

/**
 * Get the path to OpenCode's local authentication store.
 * @returns Absolute path to auth.json
 */
export function getOpenCodeAuthPath(): string {
  const dataDirectory = getOpenCodeDataDirectory();
  return process.env.XDG_DATA_HOME
    ? path.posix.join(dataDirectory, 'opencode', 'auth.json')
    : path.join(dataDirectory, 'opencode', 'auth.json');
}

async function getOpenCodeGoApiKey(): Promise<string> {
  const authPath = getOpenCodeAuthPath();
  let contents: string;

  try {
    contents = await readFile(authPath, 'utf8');
  } catch (err) {
    throw new OpenCodeGoUsageError(
      `OpenCode authentication was not found at ${authPath}`,
      undefined,
      err as Error
    );
  }

  let auth: Record<string, OpenCodeAuthEntry>;
  try {
    const parsed: unknown = JSON.parse(contents);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Expected an object');
    }
    auth = parsed as Record<string, OpenCodeAuthEntry>;
  } catch (err) {
    throw new OpenCodeGoUsageError(
      `OpenCode authentication at ${authPath} is not valid JSON`,
      undefined,
      err as Error
    );
  }

  const entry = auth['opencode-go'];
  if (entry?.type !== 'api' || typeof entry.key !== 'string' || entry.key.length === 0) {
    throw new OpenCodeGoUsageError(
      'No OpenCode Go API key is configured in OpenCode authentication'
    );
  }

  return entry.key;
}

function isUsageWindow(value: unknown): value is GoUsageWindow {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const window = value as Partial<GoUsageWindow>;
  return (
    (window.status === 'ok' || window.status === 'rate-limited') &&
    typeof window.percent === 'number' &&
    Number.isFinite(window.percent) &&
    window.percent >= 0 &&
    window.percent <= 100 &&
    typeof window.resetsAt === 'string' &&
    window.resetsAt.length > 0
  );
}

function parseUsageResponse(value: unknown): GoUsageResponse {
  if (!value || typeof value !== 'object') {
    throw new OpenCodeGoUsageError('OpenCode Go returned an invalid usage response');
  }

  const response = value as Partial<GoUsageResponse>;
  const usage = response.usage;
  if (
    !usage ||
    !isUsageWindow(usage.rolling) ||
    !isUsageWindow(usage.weekly) ||
    !isUsageWindow(usage.monthly)
  ) {
    throw new OpenCodeGoUsageError('OpenCode Go returned an invalid usage response');
  }

  return {
    usage: {
      rolling: usage.rolling,
      weekly: usage.weekly,
      monthly: usage.monthly,
    },
  };
}

/**
 * Retrieve the authenticated OpenCode Go quota usage.
 * @returns Rolling, weekly, and monthly usage windows
 * @throws OpenCodeGoUsageError when credentials or the remote response is invalid
 */
export async function getOpenCodeGoUsage(): Promise<GoUsageResponse> {
  const apiKey = await getOpenCodeGoApiKey();

  try {
    const response = await axios.get<unknown>(OPENCODE_GO_USAGE_URL, {
      timeout: 5000,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    });

    return parseUsageResponse(response.data);
  } catch (err) {
    if (err instanceof OpenCodeGoUsageError) {
      throw err;
    }

    const statusCode = axios.isAxiosError(err) ? err.response?.status : undefined;
    if (statusCode === 401) {
      throw new OpenCodeGoUsageError(
        'The OpenCode Go API key is invalid or expired',
        statusCode,
        err as Error
      );
    }
    if (statusCode === 403) {
      throw new OpenCodeGoUsageError(
        'The authenticated account does not have an OpenCode Go subscription',
        statusCode,
        err as Error
      );
    }

    throw new OpenCodeGoUsageError(
      `Failed to retrieve OpenCode Go usage${statusCode ? ` (HTTP ${statusCode})` : ''}`,
      statusCode,
      err as Error
    );
  }
}
