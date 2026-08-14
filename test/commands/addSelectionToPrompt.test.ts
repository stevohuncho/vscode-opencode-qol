import { handleAddSelectionToPrompt } from '../../src/commands/addSelectionToPrompt';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({
  window: {
    activeTextEditor: {
      document: { uri: { fsPath: '/workspace/src/index.ts' } },
    },
    setStatusBarMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
  },
  workspace: {
    getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } })),
  },
}));

vi.mock('../../src/utils/workspace', () => ({
  WorkspaceUtils: {
    getActiveFileRef: vi.fn(() => '@index.ts#L1-L2'),
    getActiveFileReference: vi.fn(() => ({
      filePath: '/workspace/src/index.ts',
      relativePath: 'src/index.ts',
      lineStart: 1,
      lineEnd: 2,
    })),
  },
}));

function createDependencies() {
  const client = {
    getPort: vi.fn(() => 4096),
    appendFileReferences: vi.fn(async () => true),
  };
  const connectionService = {
    ensureConnectedForWorkspace: vi.fn(async () => true),
    ensureConnected: vi.fn(async () => true),
    getClient: vi.fn(() => client),
    getLastAutoSpawnError: vi.fn(() => undefined),
    getConfigManager: vi.fn(() => ({ getAutoFocusTerminal: vi.fn(() => true) })),
    focusTerminal: vi.fn(async () => true),
  };
  const outputChannel = {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  return { client, connectionService, outputChannel };
}

describe('handleAddSelectionToPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('focuses the OpenCode terminal after adding a selection', async () => {
    const { client, connectionService, outputChannel } = createDependencies();

    await handleAddSelectionToPrompt(connectionService as never, outputChannel as never);

    expect(client.appendFileReferences).toHaveBeenCalledOnce();
    expect(connectionService.focusTerminal).toHaveBeenCalledOnce();
  });
});
