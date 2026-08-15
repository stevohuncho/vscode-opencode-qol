import { ConnectionService } from '../connection/connectionService';
import { handleAddResourcesToPrompt } from './addResourcesToPrompt';

import * as vscode from 'vscode';

/**
 * Add an Explorer-selected directory to the active OpenCode prompt.
 * @param connectionService - Active OpenCode connection service
 * @param outputChannel - User-visible log channel
 * @param resources - Explorer-selected directories
 */
export async function handleAddDirectoryToPrompt(
  connectionService: ConnectionService,
  outputChannel: vscode.LogOutputChannel,
  resources: vscode.Uri[]
): Promise<void> {
  await handleAddResourcesToPrompt(connectionService, outputChannel, resources, true, 'directory');
}
