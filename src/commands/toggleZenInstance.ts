import { ConnectionService } from '../connection/connectionService';

import * as vscode from 'vscode';

let terminalLayoutActive = false;

/**
 * Toggle the focused OpenCode terminal's maximized, single-tab Zen Mode layout.
 * @param connectionService - Service managing the active OpenCode instance
 * @param outputChannel - Extension output logger
 * @returns Promise that resolves after the terminal focus attempt completes
 */
export async function handleToggleZenInstance(
  connectionService: ConnectionService,
  outputChannel: vscode.LogOutputChannel
): Promise<void> {
  try {
    const focused = await connectionService.focusTerminal();
    if (!focused) {
      await vscode.window.showWarningMessage('No OpenCode terminal is available.');
      return;
    }

    if (terminalLayoutActive) {
      await vscode.commands.executeCommand('workbench.action.toggleZenMode');
      await vscode.commands.executeCommand('workbench.action.toggleMaximizeEditorGroup');
      terminalLayoutActive = false;
    } else {
      await vscode.commands.executeCommand('workbench.action.toggleMaximizeEditorGroup');
      await vscode.commands.executeCommand('workbench.action.toggleZenMode');
      await vscode.commands.executeCommand('workbench.action.zenShowEditorTab');
      terminalLayoutActive = true;
    }
  } catch (err) {
    outputChannel.error(`OpenCode terminal Zen Mode failed: ${(err as Error).message}`);
    await vscode.window.showErrorMessage(
      `OpenCode terminal Zen Mode failed: ${(err as Error).message}`
    );
  }
}
