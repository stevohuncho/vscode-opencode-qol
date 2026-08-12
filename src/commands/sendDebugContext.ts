import { ConnectionService } from '../connection/connectionService';
import { getDebugContext } from '../providers/debugIntegration';
import { formatDebugContext } from '../utils/debugPromptFormatter';

import * as vscode from 'vscode';

/**
 * Sends the current debug context (stack trace and variables) to OpenCode.
 * Requires an active debug session that is paused.
 */
export async function handleSendDebugContext(
  connectionService: ConnectionService,
  outputChannel: vscode.LogOutputChannel
): Promise<void> {
  try {
    const activeUri = vscode.window.activeTextEditor?.document.uri;
    const workspacePath = activeUri
      ? vscode.workspace.getWorkspaceFolder(activeUri)?.uri.fsPath
      : vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
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

    const debugContext = await getDebugContext();

    if (!debugContext) {
      await vscode.window.showErrorMessage(
        'No active debug session or debugger is not paused. Start a debug session and pause at a breakpoint.'
      );
      return;
    }

    const prompt = formatDebugContext(debugContext);
    const sent = await openCodeClient.appendPrompt(prompt);
    if (!sent) {
      throw new Error('OpenCode did not accept the debug context');
    }

    outputChannel.info('Sent debug context to OpenCode');
    vscode.window.setStatusBarMessage(`$(check) Sent debug context to OpenCode`, 3000);

    const configManager = connectionService.getConfigManager();
    if (configManager.getAutoFocusTerminal()) {
      try {
        await connectionService.focusTerminal();
      } catch {
        // Silently ignore focus errors
      }
    }
  } catch (err) {
    await vscode.window.showErrorMessage(`Failed to send debug context: ${(err as Error).message}`);
  }
}

export default handleSendDebugContext;
