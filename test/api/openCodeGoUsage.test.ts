import { OpenCodeGoUsageError } from '../../src/api/errors';
import {
  OPENCODE_GO_USAGE_URL,
  getOpenCodeAuthPath,
  getOpenCodeGoUsage,
} from '../../src/api/openCodeGoUsage';

import { readFile } from 'fs/promises';

import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    isAxiosError: (error: unknown) =>
      Boolean(error && typeof error === 'object' && 'isAxiosError' in error),
  },
  __esModule: true,
}));

const mockReadFile = readFile as unknown as ReturnType<typeof vi.fn>;
const mockGet = axios.get as ReturnType<typeof vi.fn>;

const usageResponse = {
  usage: {
    rolling: { status: 'ok', percent: 12, resetsAt: '2026-08-14T12:00:00.000Z' },
    weekly: { status: 'ok', percent: 8, resetsAt: '2026-08-20T12:00:00.000Z' },
    monthly: { status: 'ok', percent: 4, resetsAt: '2026-09-01T12:00:00.000Z' },
  },
};

describe('OpenCode Go usage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFile.mockResolvedValue(
      JSON.stringify({ 'opencode-go': { type: 'api', key: 'test-key' } })
    );
  });

  it('resolves the auth store path from XDG_DATA_HOME', () => {
    const previous = process.env.XDG_DATA_HOME;
    process.env.XDG_DATA_HOME = '/tmp/opencode-data';

    expect(getOpenCodeAuthPath()).toBe('/tmp/opencode-data/opencode/auth.json');

    if (previous === undefined) {
      delete process.env.XDG_DATA_HOME;
    } else {
      process.env.XDG_DATA_HOME = previous;
    }
  });

  it('retrieves usage with the API key from auth.json', async () => {
    mockGet.mockResolvedValueOnce({ data: usageResponse });

    await expect(getOpenCodeGoUsage()).resolves.toEqual(usageResponse);
    expect(mockGet).toHaveBeenCalledWith(OPENCODE_GO_USAGE_URL, {
      timeout: 5000,
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer test-key',
      },
    });
  });

  it('fails clearly when OpenCode Go credentials are missing', async () => {
    mockReadFile.mockResolvedValueOnce(JSON.stringify({}));

    await expect(getOpenCodeGoUsage()).rejects.toThrow(OpenCodeGoUsageError);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('rejects malformed usage responses', async () => {
    mockGet.mockResolvedValueOnce({ data: { usage: {} } });

    await expect(getOpenCodeGoUsage()).rejects.toThrow('invalid usage response');
  });

  it('maps an unauthorized response without exposing the API key', async () => {
    mockGet.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 401 },
    });

    const usagePromise = getOpenCodeGoUsage();
    await expect(usagePromise).rejects.toThrow('invalid or expired');
    await expect(usagePromise).rejects.not.toThrow('test-key');
  });
});
