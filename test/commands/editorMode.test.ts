import { getActiveEditorMode, resetEditorMode } from '../../src/commands/editorMode';
import { handleToggleMaximizeInstance } from '../../src/commands/toggleMaximizeInstance';
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

describe('OpenCode editor modes', () => {
  const layout = {
    orientation: 0,
    groups: [{ size: 0.6 }, { size: 0.4 }],
  };
  const outputChannel = { error: vi.fn() };

  beforeEach(() => {
    resetEditorMode();
    vi.clearAllMocks();
    vi.mocked(vscode.commands.executeCommand).mockImplementation(async command =>
      command === 'vscode.getEditorLayout' ? layout : undefined
    );
  });

  it('turns off maximize before enabling Zen Mode', async () => {
    const connectionService = { focusTerminal: vi.fn(async () => true) };

    await handleToggleMaximizeInstance(connectionService as never, outputChannel as never);
    expect(getActiveEditorMode()).toBe('maximize');

    vi.clearAllMocks();
    await handleToggleZenInstance(connectionService as never, outputChannel as never);

    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(
      1,
      'workbench.action.toggleMaximizeEditorGroup'
    );
    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(
      2,
      'vscode.setEditorLayout',
      layout
    );
    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(3, 'vscode.getEditorLayout');
    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(
      4,
      'workbench.action.minimizeOtherEditors'
    );
    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(
      5,
      'workbench.action.toggleMaximizeEditorGroup'
    );
    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(
      6,
      'workbench.action.toggleZenMode'
    );
    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(
      7,
      'workbench.action.zenShowEditorTab'
    );
    expect(getActiveEditorMode()).toBe('zen');
  });

  it('turns off Zen Mode before enabling maximize', async () => {
    const connectionService = { focusTerminal: vi.fn(async () => true) };

    await handleToggleZenInstance(connectionService as never, outputChannel as never);

    vi.clearAllMocks();
    await handleToggleMaximizeInstance(connectionService as never, outputChannel as never);

    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(
      1,
      'workbench.action.toggleZenMode'
    );
    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(
      2,
      'vscode.setEditorLayout',
      layout
    );
    expect(vscode.commands.executeCommand).toHaveBeenNthCalledWith(3, 'vscode.getEditorLayout');
    expect(getActiveEditorMode()).toBe('maximize');
  });
});
