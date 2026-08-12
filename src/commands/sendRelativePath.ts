import { ConnectionService } from '../connection/connectionService';
import { FileReferenceInput } from '../types';
import { formatRelativePath, isDirectory } from '../utils/pathUtils';

import * as vscode from 'vscode';

/**
 * Show transient notification in status bar
 * @param message - Message to display
 */
function showTransientNotification(message: string): void {
  vscode.window.setStatusBarMessage(`$(check) ${message}`, 3000);
}

/**
 * Format relative paths for sending to OpenCode
 * @param resources - Array of VS Code URIs
 * @returns Structured file references with relative display paths
 */
function formatRelativeReferences(resources: vscode.Uri[]): FileReferenceInput[] {
  return resources.map(uri => {
    const relativePath = vscode.workspace.asRelativePath(uri, false);
    return {
      filePath: uri.fsPath,
      displayPath: formatRelativePath(relativePath, isDirectory(uri.fsPath)).slice(1),
      mimeType: isDirectory(uri.fsPath) ? 'application/x-directory' : 'text/plain',
    };
  });
}

export async function handleSendRelativePath(
  connectionService: ConnectionService,
  outputChannel: vscode.LogOutputChannel,
  resources: vscode.Uri[]
): Promise<void> {
  if (!resources || resources.length === 0) {
    await vscode.window.showWarningMessage('No files or directories selected');
    return;
  }

  const workspacePath = vscode.workspace.getWorkspaceFolder(resources[0])?.uri.fsPath;
  const connected = workspacePath
    ? await connectionService.ensureConnectedForWorkspace(workspacePath)
    : await connectionService.ensureConnected();

  const openCodeClient = connectionService.getClient();
  const lastAutoSpawnError = connectionService.getLastAutoSpawnError();

  if (!connected || !openCodeClient) {
    const msg = lastAutoSpawnError
      ? `OpenCode auto-spawn failed: ${lastAutoSpawnError}`
      : 'No OpenCode instance found. Run `opencode --port <port>` in your project directory.';
    await vscode.window.showErrorMessage(msg);
    return;
  }

  try {
    const port = openCodeClient.getPort();
    const workspaceDir =
      workspacePath ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? 'unknown';
    const references = formatRelativeReferences(resources);
    const paths = references.map(reference => `@${reference.displayPath}`).join('\n');

    outputChannel.info(`Sending to port ${port}, cwd: ${workspaceDir}`);
    outputChannel.debug(`Content: "${paths}"`);

    const result = await openCodeClient.appendFileReferences(references);
    if (!result) {
      throw new Error('OpenCode did not accept the selected paths');
    }
    outputChannel.debug(`Result: ${JSON.stringify(result)}`);

    const count = resources.length;
    showTransientNotification(`Sent ${count} relative path${count > 1 ? 's' : ''}`);

    if (connectionService.getConfigManager().getAutoFocusTerminal()) {
      try {
        await connectionService.focusTerminal();
      } catch (err) {
        outputChannel.warn(`Terminal focus error: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    await vscode.window.showErrorMessage(`Failed to send paths: ${(err as Error).message}`);
  }
}
