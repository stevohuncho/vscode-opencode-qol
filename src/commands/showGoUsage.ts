import { ConnectionService } from '../connection/connectionService';
import { GoUsageWindow } from '../types';

import * as vscode from 'vscode';

function formatUsage(label: string, usage: GoUsageWindow): string {
  const resetTime = new Date(usage.resetsAt);
  const reset = Number.isNaN(resetTime.getTime()) ? 'unknown' : resetTime.toLocaleString();
  return `${label}: ${usage.percent}% used, resets ${reset}`;
}

/**
 * Show the authenticated OpenCode Go rolling, weekly, and monthly usage.
 * @param connectionService - Service managing the active OpenCode instance
 * @param outputChannel - Extension output logger
 */
export async function handleShowGoUsage(
  connectionService: ConnectionService,
  outputChannel: vscode.LogOutputChannel
): Promise<void> {
  try {
    if (!(await connectionService.ensureConnected())) {
      await vscode.window.showErrorMessage('No OpenCode instance is available.');
      return;
    }

    const usage = await connectionService.getGoUsage();
    await vscode.window.showInformationMessage(
      [
        'OpenCode Go usage',
        formatUsage('5-hour rolling', usage.usage.rolling),
        formatUsage('Weekly', usage.usage.weekly),
        formatUsage('Monthly', usage.usage.monthly),
      ].join('\n')
    );
  } catch (err) {
    outputChannel.error(`OpenCode Go usage lookup failed: ${(err as Error).message}`);
    await vscode.window.showErrorMessage(
      `OpenCode Go usage lookup failed: ${(err as Error).message}`
    );
  }
}
