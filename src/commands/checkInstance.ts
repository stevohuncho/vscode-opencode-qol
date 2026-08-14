import { ConnectionService, pathsMatch } from '../connection/connectionService';
import { WorkspaceUtils } from '../utils/workspace';

import * as vscode from 'vscode';

export async function handleCheckInstance(connectionService: ConnectionService): Promise<void> {
  const activeUri = vscode.window.activeTextEditor?.document.uri;
  const activeWorkspace = activeUri
    ? vscode.workspace.getWorkspaceFolder(activeUri)?.uri.fsPath
    : undefined;
  const workspacePath = activeWorkspace ?? WorkspaceUtils.getWorkspacePath();

  if (!workspacePath) {
    await vscode.window.showWarningMessage(
      'Open a workspace folder before checking OpenCode instance status.'
    );
    return;
  }

  try {
    const connected = await connectionService.ensureConnectedForWorkspace(workspacePath);
    const client = connectionService.getClient();

    if (!connected || !client) {
      const autoSpawnError = connectionService.getLastAutoSpawnError();
      await vscode.window.showErrorMessage(
        autoSpawnError
          ? `OpenCode instance is not ready: ${autoSpawnError}`
          : 'No OpenCode instance is available for this workspace.'
      );
      return;
    }

    const pathInfo = await client.getPath();
    if (!pathsMatch(pathInfo.directory, workspacePath)) {
      await vscode.window.showErrorMessage(
        `OpenCode is connected to "${pathInfo.directory}", not this workspace.`
      );
      return;
    }

    const port = connectionService.getPort();
    await vscode.window.showInformationMessage(
      `OpenCode instance is connected${port ? ` on port ${port}` : ''}.`
    );
  } catch (err) {
    await vscode.window.showErrorMessage(
      `OpenCode instance status check failed: ${(err as Error).message}`
    );
  }
}
