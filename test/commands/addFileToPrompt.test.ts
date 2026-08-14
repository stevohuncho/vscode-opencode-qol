import { handleAddFileToPrompt } from '../../src/commands/addFileToPrompt';

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

describe('handleAddFileToPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses a path relative to the connected instance workspace', async () => {
    const { client, connectionService, outputChannel } = createDependencies();

    await handleAddFileToPrompt(
      connectionService as never,
      outputChannel as never,
      [{ fsPath: '/workspace/src/index.ts' }] as never
    );

    expect(client.appendFileReferences).toHaveBeenCalledWith([
      {
        filePath: '/workspace/src/index.ts',
        displayPath: 'src/index.ts',
        mimeType: 'text/plain',
      },
    ]);
  });

  it('uses an absolute path when the file is outside the connected instance workspace', async () => {
    const { client, connectionService, outputChannel } = createDependencies();

    await handleAddFileToPrompt(
      connectionService as never,
      outputChannel as never,
      [{ fsPath: '/other-project/src/index.ts' }] as never
    );

    expect(client.appendFileReferences).toHaveBeenCalledWith([
      {
        filePath: '/other-project/src/index.ts',
        displayPath: '/other-project/src/index.ts',
        mimeType: 'text/plain',
      },
    ]);
  });

  it('focuses the OpenCode terminal after adding files when enabled', async () => {
    const { connectionService, outputChannel } = createDependencies();
    connectionService.getConfigManager = vi.fn(() => ({
      getAutoFocusTerminal: vi.fn(() => true),
    }));

    await handleAddFileToPrompt(
      connectionService as never,
      outputChannel as never,
      [{ fsPath: '/workspace/src/index.ts' }] as never
    );

    expect(connectionService.focusTerminal).toHaveBeenCalledOnce();
  });
});
