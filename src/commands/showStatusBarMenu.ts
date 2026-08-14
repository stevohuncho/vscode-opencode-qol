import { ConnectionService } from '../connection/connectionService';
import { handleCheckInstance } from './checkInstance';
import { handleSelectDefaultInstance } from './selectDefaultInstance';
import { handleShowGoUsage } from './showGoUsage';

import * as vscode from 'vscode';

/**
 * Show a QuickPick menu with available OpenCode commands.
 */
export async function showStatusBarMenu(
  connectionService: ConnectionService,
  outputChannel: vscode.LogOutputChannel
): Promise<void> {
  const items: vscode.QuickPickItem[] = [
    {
      label: '$(debug-start) Check Instance Status',
      description: 'Check if OpenCode is running and connected',
    },
    {
      label: '$(star) Select Default Instance',
      description: 'Choose a default OpenCode instance for this workspace',
    },
    {
      label: '$(pulse) Show OpenCode Go Usage',
      description: 'View rolling, weekly, and monthly Go quota usage',
    },
  ];

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select an OpenCode action...',
  });

  if (!selected) {
    return;
  }

  // Execute the selected command
  switch (selected.label) {
    case '$(debug-start) Check Instance Status':
      await handleCheckInstance(connectionService);
      break;
    case '$(star) Select Default Instance':
      await handleSelectDefaultInstance(connectionService, outputChannel);
      break;
    case '$(pulse) Show OpenCode Go Usage':
      await handleShowGoUsage(connectionService, outputChannel);
      break;
  }
}
