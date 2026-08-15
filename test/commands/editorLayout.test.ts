import {
  MAX_EDITOR_GROUPS,
  captureEditorLayout,
  restoreEditorLayout,
} from '../../src/commands/editorLayout';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', () => ({
  commands: {
    executeCommand: vi.fn(),
  },
}));

describe('editor layout helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('captures layouts with up to ten editor groups', async () => {
    const layout = {
      orientation: 0,
      groups: Array.from({ length: MAX_EDITOR_GROUPS }, () => ({ size: 1 })),
    };
    vi.mocked(vscode.commands.executeCommand).mockResolvedValue(layout);

    await expect(captureEditorLayout()).resolves.toEqual(layout);
    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('vscode.getEditorLayout');
  });

  it('does not save layouts with more than ten editor groups', async () => {
    const layout = {
      orientation: 0,
      groups: Array.from({ length: MAX_EDITOR_GROUPS + 1 }, () => ({ size: 1 })),
    };
    vi.mocked(vscode.commands.executeCommand).mockResolvedValue(layout);

    await expect(captureEditorLayout()).resolves.toBeUndefined();
  });

  it('restores a captured layout', async () => {
    const layout = {
      orientation: 1 as const,
      groups: [{ size: 0.5 }, { size: 0.5 }],
    };

    await restoreEditorLayout(layout);

    expect(vscode.commands.executeCommand).toHaveBeenCalledWith('vscode.setEditorLayout', layout);
  });
});
