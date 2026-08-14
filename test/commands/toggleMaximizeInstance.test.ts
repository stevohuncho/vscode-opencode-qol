import { handleToggleMaximizeInstance } from '../../src/commands/toggleMaximizeInstance';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', () => ({
  commands: {
    executeCommand: vi.fn(),
  },
  window: {
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
  },
}));

describe('handleToggleMaximizeInstance', () => {
  const outputChannel = {
    error: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('focuses the OpenCode terminal when one is available', async () => {
    const connectionService = {
      focusTerminal: vi.fn(async () => true),
    };

    await handleToggleMaximizeInstance(connectionService as never, outputChannel as never);

    expect(connectionService.focusTerminal).toHaveBeenCalledOnce();
    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(
      1,
      'workbench.action.toggleMaximizeEditorGroup'
    );
    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(
      2,
      'workbench.action.zenShowEditorTab'
    );
    expect(vscode.commands.executeCommand).toHaveBeenCalledTimes(2);

    vi.clearAllMocks();
    await handleToggleMaximizeInstance(connectionService as never, outputChannel as never);

    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(
      1,
      'workbench.action.toggleMaximizeEditorGroup'
    );
    expect(vscode.commands.executeCommand).toHaveBeenCalledOnce();
  });

  it('warns when no OpenCode terminal is available', async () => {
    const connectionService = {
      focusTerminal: vi.fn(async () => false),
    };

    await handleToggleMaximizeInstance(connectionService as never, outputChannel as never);

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      'No OpenCode terminal is available.'
    );
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it('logs and reports maximize errors', async () => {
    const connectionService = {
      focusTerminal: vi.fn(async () => {
        throw new Error('terminal unavailable');
      }),
    };

    await handleToggleMaximizeInstance(connectionService as never, outputChannel as never);

    expect(outputChannel.error).toHaveBeenCalledWith(
      'OpenCode terminal maximize failed: terminal unavailable'
    );
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'OpenCode terminal maximize failed: terminal unavailable'
    );
  });
});
