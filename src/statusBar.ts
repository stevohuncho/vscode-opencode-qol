import { GoUsageResponse, GoUsageWindow } from './types';

import * as vscode from 'vscode';

function formatResetTime(resetsAt: string): string {
  const resetTime = new Date(resetsAt);
  return Number.isNaN(resetTime.getTime()) ? 'unknown' : resetTime.toLocaleString();
}

function formatUsageWindow(label: string, usage: GoUsageWindow): string {
  const status = usage.status === 'rate-limited' ? ' $(warning)' : '';
  return `${label}: ${usage.percent}% used${status}, resets ${formatResetTime(usage.resetsAt)}`;
}

function getUsageColor(usage: GoUsageResponse): vscode.ThemeColor {
  const windows = [usage.usage.rolling, usage.usage.weekly, usage.usage.monthly];
  const highestPercent = Math.max(...windows.map(window => window.percent));

  if (windows.some(window => window.status === 'rate-limited') || highestPercent >= 80) {
    return new vscode.ThemeColor('errorForeground');
  }

  if (highestPercent >= 50) {
    return new vscode.ThemeColor('editorWarning.foreground');
  }

  return new vscode.ThemeColor('statusBar.foreground');
}

/**
 * Status bar manager for OpenCode connection indicator.
 * Shows connection status in the VSCode status bar.
 */
export class StatusBarManager {
  private static instance: StatusBarManager;
  private statusBarItem: vscode.StatusBarItem | undefined;
  private goUsageStatusBarItem: vscode.StatusBarItem | undefined;
  private isConnected: boolean = false;
  private connectedPort: number | undefined;
  private goUsage: GoUsageResponse | undefined;

  private constructor() {}

  /**
   * Get singleton instance of StatusBarManager.
   */
  public static getInstance(): StatusBarManager {
    if (!StatusBarManager.instance) {
      StatusBarManager.instance = new StatusBarManager();
    }
    return StatusBarManager.instance;
  }

  /**
   * Initialize the status bar item.
   * Should be called during extension activation.
   */
  public initialize(context: vscode.ExtensionContext): void {
    this.statusBarItem = vscode.window.createStatusBarItem(
      'opencode-qol-status',
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.name = 'OpenCode Connection Status';
    this.statusBarItem.command = 'opencodeQol.showStatusBarMenu';
    this.statusBarItem.tooltip = 'Click to manage OpenCode connection';

    this.goUsageStatusBarItem = vscode.window.createStatusBarItem(
      'opencode-qol-go-usage',
      vscode.StatusBarAlignment.Right,
      99
    );
    this.goUsageStatusBarItem.name = 'OpenCode Go Usage';
    this.goUsageStatusBarItem.command = 'opencodeQol.showGoUsage';
    this.goUsageStatusBarItem.tooltip = 'Click to view OpenCode Go usage';

    // Set initial disconnected state
    this.goUsage = undefined;
    this.updateConnectionStatus(false);

    this.statusBarItem.show();
    context?.subscriptions?.push(this.statusBarItem, this.goUsageStatusBarItem);
  }

  /**
   * Update the connection status display.
   * @param connected - Whether OpenCode is connected
   * @param port - Optional port number when connected
   */
  public updateConnectionStatus(connected: boolean, port?: number): void {
    this.isConnected = connected;
    this.connectedPort = port;
    if (!connected) {
      this.goUsage = undefined;
    }

    if (this.statusBarItem) {
      this.render();
    }
  }

  /**
   * Update the OpenCode Go usage shown in the connected status bar.
   * @param usage - Latest usage response, or undefined when usage is unavailable
   */
  public updateGoUsage(usage: GoUsageResponse | undefined): void {
    this.goUsage = usage;
    this.render();
  }

  private render(): void {
    if (this.statusBarItem) {
      if (this.isConnected) {
        const port = this.connectedPort === undefined ? '' : ` :${this.connectedPort}`;
        this.statusBarItem.text = `$(circle-filled) OpenCode${port}`;
        this.statusBarItem.tooltip = 'Click to manage OpenCode connection';
        this.statusBarItem.color = new vscode.ThemeColor('statusBar.foreground');
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          'statusBarItem.prominentBackground'
        );
      } else {
        this.statusBarItem.text = '$(circle-outline) OpenCode';
        this.statusBarItem.tooltip = 'Click to manage OpenCode connection';
        this.statusBarItem.color = new vscode.ThemeColor('errorForeground');
        this.statusBarItem.backgroundColor = undefined;
      }
    }

    if (!this.goUsageStatusBarItem) {
      return;
    }

    if (this.isConnected && this.goUsage) {
      this.goUsageStatusBarItem.text = `$(pulse) Go (5h) ${this.goUsage.usage.rolling.percent}% (7d) ${this.goUsage.usage.weekly.percent}% (30d) ${this.goUsage.usage.monthly.percent}%`;
      this.goUsageStatusBarItem.tooltip = [
        'OpenCode Go usage',
        formatUsageWindow('5-hour rolling', this.goUsage.usage.rolling),
        formatUsageWindow('Weekly', this.goUsage.usage.weekly),
        formatUsageWindow('Monthly', this.goUsage.usage.monthly),
      ].join('\n');
      this.goUsageStatusBarItem.color = getUsageColor(this.goUsage);
      this.goUsageStatusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.prominentBackground'
      );
      this.goUsageStatusBarItem.show();
      return;
    }

    this.goUsageStatusBarItem.hide();
  }

  /**
   * Get current connection status.
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Dispose of the status bar item.
   */
  public dispose(): void {
    if (this.statusBarItem) {
      this.statusBarItem.dispose();
      this.statusBarItem = undefined;
    }
    if (this.goUsageStatusBarItem) {
      this.goUsageStatusBarItem.dispose();
      this.goUsageStatusBarItem = undefined;
    }
    StatusBarManager.instance = undefined as unknown as StatusBarManager;
  }

  /**
   * Reset the singleton instance (useful for testing).
   */
  public static resetInstance(): void {
    StatusBarManager.instance = undefined as unknown as StatusBarManager;
  }
}

export default StatusBarManager;
