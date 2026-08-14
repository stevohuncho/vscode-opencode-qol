/**
 * OpenCode Connector VSCode Extension
 * Provides integration between VS Code and OpenCode AI assistant
 */
import {
  handleAddFileToPrompt,
  handleAddSelectionToPrompt,
  handleCheckInstance,
  handleOpenNewInstance,
  handleSelectDefaultInstance,
  showStatusBarMenu,
} from './commands';
import { ConfigManager } from './config';
import { ConnectionService, isRemoteSession } from './connection/connectionService';
import { DefaultInstanceManager } from './instance/defaultInstanceManager';
import { InstanceManager } from './instance/instanceManager';
import { StatusBarManager } from './statusBar';
import { WorkspaceUtils } from './utils/workspace';

import * as vscode from 'vscode';

let configManager: ConfigManager | undefined;
let connectionService: ConnectionService | undefined;
let statusBarManager: StatusBarManager | undefined;
let outputChannel: vscode.LogOutputChannel | undefined;

export function activate(context: vscode.ExtensionContext): void {
  try {
    outputChannel = vscode.window.createOutputChannel('OpenCode Connector', { log: true });
    context?.subscriptions?.push(outputChannel);
    outputChannel?.info('OpenCode Connector extension is now active');
  } catch (err) {
    console.error('Failed to create output channel:', err);
  }

  try {
    configManager = ConfigManager.getInstance(context.extensionUri);

    const instanceManager = InstanceManager.getInstance(configManager);

    if (outputChannel) {
      const channel = outputChannel;
      instanceManager.setLogger({
        info: (msg: string) => channel.info(msg),
        warn: (msg: string) => channel.warn(msg),
        error: (msg: string) => channel.error(msg),
      });
    }

    // Initialize connection service
    connectionService = new ConnectionService(configManager, instanceManager, outputChannel);

    // Initialize status bar manager for connection status
    statusBarManager = StatusBarManager.getInstance();
    statusBarManager.initialize(context);

    // Subscribe to connection state changes FIRST (before other init that might fail)
    const connectionStateSub = connectionService.onDidChangeConnectionState(event => {
      statusBarManager?.updateConnectionStatus(event.connected, event.port);
    });
    context.subscriptions.push(connectionStateSub);

    registerCommands(context);

    registerWorkspaceHandlers(context);

    // Discover and connect in the background so the status bar reflects the
    // current OpenCode instance without blocking activation.
    connectionService.discoverAndConnect().catch(err => {
      outputChannel?.warn(`Background OpenCode discovery failed: ${(err as Error).message}`);
    });

    outputChannel?.info(
      'OpenCode Connector fully initialized' +
        (isRemoteSession() ? ` [Remote: ${vscode.env.remoteName}]` : ' [Local]')
    );
  } catch (err) {
    outputChannel?.error(`Failed to initialize OpenCode Connector: ${(err as Error).message}`);
  }
}

export function registerCommands(context: vscode.ExtensionContext): void {
  if (!connectionService || !outputChannel) {
    return;
  }

  const statusCommand = vscode.commands.registerCommand(
    'opencodeConnector.checkInstance',
    async () => handleCheckInstance(connectionService!)
  );

  const addFileToPromptCommand = vscode.commands.registerCommand(
    'opencodeConnector.addFileToPrompt',
    async (...resources: vscode.Uri[]) => {
      const uris =
        resources.length > 0 && Array.isArray(resources[resources.length - 1])
          ? (resources[resources.length - 1] as unknown as vscode.Uri[])
          : resources;
      await handleAddFileToPrompt(connectionService!, outputChannel!, uris);
    }
  );

  const statusBarMenuCommand = vscode.commands.registerCommand(
    'opencodeConnector.showStatusBarMenu',
    async () => showStatusBarMenu(connectionService!, outputChannel!)
  );

  const selectDefaultInstanceCommand = vscode.commands.registerCommand(
    'opencodeConnector.selectDefaultInstance',
    async () => handleSelectDefaultInstance(connectionService!, outputChannel!)
  );

  const instanceManager = InstanceManager.getInstance();
  const addSelectionToPromptCommand = vscode.commands.registerCommand(
    'opencodeConnector.addSelectionToPrompt',
    async () => handleAddSelectionToPrompt(connectionService!, outputChannel!)
  );

  const openNewInstanceCommand = vscode.commands.registerCommand(
    'opencodeConnector.openNewInstance',
    async () => handleOpenNewInstance(connectionService!, instanceManager, outputChannel!)
  );

  context.subscriptions.push(
    statusCommand,
    addFileToPromptCommand,
    statusBarMenuCommand,
    selectDefaultInstanceCommand,
    addSelectionToPromptCommand,
    openNewInstanceCommand
  );
}

export function registerWorkspaceHandlers(context: vscode.ExtensionContext): void {
  const workspaceFoldersChange = vscode.workspace.onDidChangeWorkspaceFolders(() => {
    const workspaceInfo = WorkspaceUtils.detectWorkspace();
    outputChannel?.info(
      `Workspace changed: ${workspaceInfo.rootCount} root(s), primary: ${workspaceInfo.primaryRoot?.name || 'none'}`
    );
    DefaultInstanceManager.getInstance().clearDefault();
    outputChannel?.info('Cleared default instance due to workspace change');
  });

  context.subscriptions.push(workspaceFoldersChange);
}

export function deactivate(): void {
  outputChannel?.info('OpenCode Connector extension is now deactivated');

  if (connectionService) {
    const client = connectionService.getClient();
    if (client) {
      client.destroy();
    }
    connectionService = undefined;
  }

  InstanceManager.resetInstance();
  configManager = undefined;
}
