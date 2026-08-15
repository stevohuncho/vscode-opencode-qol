import { ConnectionService } from '../connection/connectionService';
import { captureEditorLayout } from './editorLayout';
import { activateEditorMode, deactivateActiveEditorMode, getActiveEditorMode } from './editorMode';

import * as vscode from 'vscode';

/**
 * Toggle the focused OpenCode terminal's maximized, single-tab Zen Mode layout.
 * @param connectionService - Service managing the active OpenCode instance
 * @param outputChannel - Extension output logger
 * @returns Promise that resolves after the terminal focus attempt completes
 */
export async function handleToggleMaximizeInstance(
  connectionService: ConnectionService,
  outputChannel: vscode.LogOutputChannel
): Promise<void> {
  try {
    const focused = await connectionService.focusTerminal();
    if (!focused) {
      await vscode.window.showWarningMessage('No OpenCode terminal is available.');
      return;
    }

    const activeMode = getActiveEditorMode();
    if (activeMode === 'maximize') {
      await deactivateActiveEditorMode();
      return;
    }

    if (activeMode) {
      await deactivateActiveEditorMode();
    }

    const layout = await captureEditorLayout();
    await vscode.commands.executeCommand('workbench.action.minimizeOtherEditors');
    await vscode.commands.executeCommand('workbench.action.toggleMaximizeEditorGroup');
    await vscode.commands.executeCommand('workbench.action.zenShowEditorTab');
    activateEditorMode('maximize', layout);
  } catch (err) {
    outputChannel.error(`OpenCode terminal maximize failed: ${(err as Error).message}`);
    await vscode.window.showErrorMessage(
      `OpenCode terminal maximize failed: ${(err as Error).message}`
    );
  }
}
