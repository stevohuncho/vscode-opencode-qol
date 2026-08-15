import { handleToggleZenInstance } from '../../src/commands/toggleZenInstance';

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

describe('handleToggleZenInstance', () => {
  const outputChannel = {
    error: vi.fn(),
  };
  const layout = {
    orientation: 0,
    groups: [{ size: 0.6 }, { size: 0.4 }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(vscode.commands.executeCommand).mockImplementation(async command =>
      command === 'vscode.getEditorLayout' ? layout : undefined
    );
  });

  it('expands the active editor group before entering Zen Mode', async () => {
    const connectionService = {
      focusTerminal: vi.fn(async () => true),
    };

    await handleToggleZenInstance(connectionService as never, outputChannel as never);

    expect(connectionService.focusTerminal).toHaveBeenCalledOnce();
    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(1, 'vscode.getEditorLayout');
    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(
      2,
      'workbench.action.minimizeOtherEditors'
    );
    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(
      3,
      'workbench.action.toggleMaximizeEditorGroup'
    );
    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(
      4,
      'workbench.action.toggleZenMode'
    );
    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(
      5,
      'workbench.action.zenShowEditorTab'
    );
    expect(vscode.commands.executeCommand).toHaveBeenCalledTimes(5);

    vi.clearAllMocks();
    await handleToggleZenInstance(connectionService as never, outputChannel as never);

    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(
      1,
      'workbench.action.toggleZenMode'
    );
    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(
      2,
      'vscode.setEditorLayout',
      layout
    );
    expect(vscode.commands.executeCommand).toHaveBeenCalledTimes(2);
  });

  it('does not query unavailable context keys', async () => {
    vi.mocked(vscode.commands.executeCommand).mockResolvedValue(undefined);
    const connectionService = {
      focusTerminal: vi.fn(async () => true),
    };

    await handleToggleZenInstance(connectionService as never, outputChannel as never);

    expect(vscode.commands.executeCommand).not.toHaveBeenCalledWith(
      'getContextKeyValue',
      expect.anything()
    );
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
      'workbench.action.minimizeOtherEditors'
    );
  });

  it('warns when no OpenCode terminal is available', async () => {
    const connectionService = {
      focusTerminal: vi.fn(async () => false),
    };

    await handleToggleZenInstance(connectionService as never, outputChannel as never);

    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
      'No OpenCode terminal is available.'
    );
    expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
  });

  it('logs and reports Zen Mode errors', async () => {
    const connectionService = {
      focusTerminal: vi.fn(async () => {
        throw new Error('terminal unavailable');
      }),
    };

    await handleToggleZenInstance(connectionService as never, outputChannel as never);

    expect(outputChannel.error).toHaveBeenCalledWith(
      'OpenCode terminal Zen Mode failed: terminal unavailable'
    );
    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'OpenCode terminal Zen Mode failed: terminal unavailable'
    );
  });
});
