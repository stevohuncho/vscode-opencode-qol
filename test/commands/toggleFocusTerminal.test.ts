import { handleToggleFocusTerminal } from '../../src/commands/toggleFocusTerminal';

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

describe('handleToggleFocusTerminal', () => {
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

    await handleToggleFocusTerminal(connectionService as never, outputChannel as never);

    expect(connectionService.focusTerminal).toHaveBeenCalledOnce();
    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(
      1,
      'workbench.action.maximizeEditorHideSidebar'
    );
    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(
      2,
      'workbench.action.toggleZenMode'
    );
    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(
      3,
      'workbench.action.zenShowEditorTab'
    );

    vi.clearAllMocks();
    await handleToggleFocusTerminal(connectionService as never, outputChannel as never);

    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(
      1,
      'workbench.action.toggleZenMode'
    );
    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(
      2,
      'workbench.action.toggleMaximizeEditorGroup'
    );
  });

  it('warns when no OpenCode terminal is available', async () => {
    const connectionService = {
      focusTerminal: vi.fn(async () => false),
    };

    await handleToggleFocusTerminal(connectionService as never, outputChannel as never);

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      'No OpenCode terminal is available to focus.'
    );
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it('logs and reports focus errors', async () => {
    const connectionService = {
      focusTerminal: vi.fn(async () => {
        throw new Error('terminal unavailable');
      }),
    };

    await handleToggleFocusTerminal(connectionService as never, outputChannel as never);

    expect(outputChannel.error).toHaveBeenCalledWith(
      'OpenCode terminal focus failed: terminal unavailable'
    );
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'OpenCode terminal focus failed: terminal unavailable'
    );
  });
});
