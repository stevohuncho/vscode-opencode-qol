import { handleAddDirectoryToPrompt } from '../../src/commands/addDirectoryToPrompt';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({
  window: {
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    setStatusBarMessage: vi.fn(),
  },
  workspace: {
    getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } })),
  },
}));

function createDependencies() {
  const client = {
    getPath: vi.fn(async () => ({ directory: '/workspace' })),
    getPort: vi.fn(() => 4096),
    appendFileReferences: vi.fn(async () => true),
  };
  const connectionService = {
    ensureConnectedForWorkspace: vi.fn(async () => true),
    ensureConnected: vi.fn(async () => true),
    getClient: vi.fn(() => client),
    getLastAutoSpawnError: vi.fn(() => undefined),
    getConfigManager: vi.fn(() => ({ getAutoFocusTerminal: vi.fn(() => false) })),
    focusTerminal: vi.fn(async () => undefined),
  };
  const outputChannel = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  return { client, connectionService, outputChannel };
}

describe('handleAddDirectoryToPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds a relative directory reference with a trailing slash', async () => {
    const { client, connectionService, outputChannel } = createDependencies();

    await handleAddDirectoryToPrompt(
      connectionService as never,
      outputChannel as never,
      [{ fsPath: '/workspace/src' }] as never
    );

    expect(client.appendFileReferences).toHaveBeenCalledWith([
      {
        filePath: '/workspace/src',
        displayPath: 'src/',
        mimeType: 'application/x-directory',
      },
    ]);
  });

  it('adds an absolute directory reference with a trailing slash outside the instance workspace', async () => {
    const { client, connectionService, outputChannel } = createDependencies();

    await handleAddDirectoryToPrompt(
      connectionService as never,
      outputChannel as never,
      [{ fsPath: '/other-project/docs.with.dots' }] as never
    );

    expect(client.appendFileReferences).toHaveBeenCalledWith([
      {
        filePath: '/other-project/docs.with.dots',
        displayPath: '/other-project/docs.with.dots/',
        mimeType: 'application/x-directory',
      },
    ]);
  });
});
