import { ConnectionService } from '../connection/connectionService';
import { FileReferenceInput } from '../types';
import { formatAbsolutePath, formatRelativePath, isDirectory } from '../utils/pathUtils';

import * as path from 'path';
import * as vscode from 'vscode';

function isInsideDirectory(filePath: string, directoryPath: string): boolean {
  const relativePath = path.relative(directoryPath, filePath);
  return relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

function formatReference(uri: vscode.Uri, instanceDirectory: string): FileReferenceInput {
  const directory = isDirectory(uri.fsPath);
  if (isInsideDirectory(uri.fsPath, instanceDirectory)) {
    const relativePath = path.relative(instanceDirectory, uri.fsPath);
    return {
      filePath: uri.fsPath,
      displayPath: formatRelativePath(relativePath, directory).slice(1),
      mimeType: directory ? 'application/x-directory' : 'text/plain',
    };
  }

  return {
    filePath: uri.fsPath,
    displayPath: formatAbsolutePath(uri.fsPath).slice(1),
    mimeType: directory ? 'application/x-directory' : 'text/plain',
  };
}

/**
 * Add Explorer-selected files to the active OpenCode prompt.
 * Uses a path relative to the connected instance when possible and falls back
 * to an absolute path when the instance cannot resolve the relative path.
 * @param connectionService - Active OpenCode connection service
 * @param outputChannel - User-visible log channel
 * @param resources - Explorer-selected files or directories
 */
export async function handleAddFileToPrompt(
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
    const references = resources.map(resource => formatReference(resource, instanceDirectory));
    const paths = references.map(reference => `@${reference.displayPath}`).join('\n');

    outputChannel.info(
      `[addFileToPrompt] Sending to port ${client.getPort()}, instance directory: ${instanceDirectory}`
    );
    outputChannel.debug(`[addFileToPrompt] Content: "${paths}"`);

    const sent = await client.appendFileReferences(references);
    if (!sent) {
      throw new Error('OpenCode did not accept the selected files');
    }

    vscode.window.setStatusBarMessage(
      `$(check) Added ${resources.length} file${resources.length > 1 ? 's' : ''} to OpenCode`,
      3000
    );

    if (connectionService.getConfigManager().getAutoFocusTerminal()) {
      try {
        await connectionService.focusTerminal();
      } catch (err) {
        outputChannel.warn(`[addFileToPrompt] Terminal focus error: ${(err as Error).message}`);
      }
    }
  } catch (err) {
    await vscode.window.showErrorMessage(`Failed to add files: ${(err as Error).message}`);
  }
}
