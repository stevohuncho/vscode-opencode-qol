import { ConnectionService } from '../connection/connectionService';
import { FileReferenceInput } from '../types';
import { formatAbsolutePath, formatRelativePath, isDirectory } from '../utils/pathUtils';

import * as path from 'path';
import * as vscode from 'vscode';

function isInsideDirectory(filePath: string, directoryPath: string): boolean {
  const relativePath = path.relative(directoryPath, filePath);
  return relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

function formatReference(
  uri: vscode.Uri,
  instanceDirectory: string,
  forceDirectory: boolean
): FileReferenceInput {
  const directory = forceDirectory || isDirectory(uri.fsPath);
  if (isInsideDirectory(uri.fsPath, instanceDirectory)) {
    const relativePath = path.relative(instanceDirectory, uri.fsPath);
    return {
      filePath: uri.fsPath,
      displayPath: formatRelativePath(relativePath, directory).slice(1),
      mimeType: directory ? 'application/x-directory' : 'text/plain',
    };
  }

  const displayPath = formatAbsolutePath(uri.fsPath).slice(1);

  return {
    filePath: uri.fsPath,
    displayPath: directory && !displayPath.endsWith('/') ? `${displayPath}/` : displayPath,
    mimeType: directory ? 'application/x-directory' : 'text/plain',
  };
}

/**
 * Add Explorer resources to the active OpenCode prompt.
 * @param connectionService - Active OpenCode connection service
 * @param outputChannel - User-visible log channel
 * @param resources - Explorer-selected files or directories
 * @param forceDirectory - Treat every selected resource as a directory
 * @param resourceLabel - Singular label used in status and error messages
 */
export async function handleAddResourcesToPrompt(
  connectionService: ConnectionService,
  outputChannel: vscode.LogOutputChannel,
  resources: vscode.Uri[],
  forceDirectory: boolean,
  resourceLabel: 'file' | 'directory'
): Promise<void> {
  if (!resources || resources.length === 0) {
    await vscode.window.showWarningMessage('No files or directories selected');
    return;
  }

  const workspacePath = vscode.workspace.getWorkspaceFolder(resources[0])?.uri.fsPath;
  const connected = workspacePath
    ? await connectionService.ensureConnectedForWorkspace(workspacePath)
    : await connectionService.ensureConnected();
  const client = connectionService.getClient();
  const lastAutoSpawnError = connectionService.getLastAutoSpawnError();

  if (!connected || !client) {
    const message = lastAutoSpawnError
      ? `OpenCode auto-spawn failed: ${lastAutoSpawnError}`
      : 'No OpenCode instance found. Run `opencode --port <port>` in your project directory.';
    await vscode.window.showErrorMessage(message);
    return;
  }

  try {
    const instanceDirectory = (await client.getPath()).directory;
    const references = resources.map(resource =>
      formatReference(resource, instanceDirectory, forceDirectory)
    );
    const paths = references.map(reference => `@${reference.displayPath}`).join('\n');

    outputChannel.info(
      `[add${resourceLabel[0].toUpperCase()}${resourceLabel.slice(1)}ToPrompt] Sending to port ${client.getPort()}, instance directory: ${instanceDirectory}`
    );
    outputChannel.debug(
      `[add${resourceLabel[0].toUpperCase()}${resourceLabel.slice(1)}ToPrompt] Content: "${paths}"`
    );

    const sent = await client.appendFileReferences(references);
    if (!sent) {
      throw new Error(`OpenCode did not accept the selected ${resourceLabel}s`);
    }

    vscode.window.setStatusBarMessage(
      `$(check) Added ${resources.length} ${resourceLabel}${resources.length > 1 ? 's' : ''} to OpenCode`,
      3000
    );

    if (connectionService.getConfigManager().getAutoFocusTerminal()) {
      try {
        await connectionService.focusTerminal();
      } catch (err) {
        outputChannel.warn(
          `[add${resourceLabel[0].toUpperCase()}${resourceLabel.slice(1)}ToPrompt] Terminal focus error: ${(err as Error).message}`
        );
      }
    }
  } catch (err) {
    await vscode.window.showErrorMessage(
      `Failed to add ${resourceLabel}s: ${(err as Error).message}`
    );
  }
}
