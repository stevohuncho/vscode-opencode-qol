import { EditorGroupLayout, restoreEditorLayout } from './editorLayout';

import * as vscode from 'vscode';

/** The editor layout modes controlled by OpenCode QoL. */
export type EditorMode = 'maximize' | 'zen';

type EditorModeListener = (mode: EditorMode | undefined) => void;

let activeEditorMode: EditorMode | undefined;
let savedLayout: EditorGroupLayout | undefined;
const listeners = new Set<EditorModeListener>();

function notifyModeChanged(): void {
  for (const listener of listeners) {
    listener(activeEditorMode);
  }
}

/**
 * Gets the currently active OpenCode editor mode.
 * @returns The active mode, or `undefined` when no mode is active
 */
export function getActiveEditorMode(): EditorMode | undefined {
  return activeEditorMode;
}

/**
 * Subscribes to OpenCode editor mode changes.
 * @param listener - Callback invoked with the new active mode
 * @returns A function that removes the listener
 */
export function onDidChangeEditorMode(listener: EditorModeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Marks an OpenCode editor mode as active and stores its original layout.
 * @param mode - Mode that was activated
 * @param layout - Layout captured before the mode changed the workbench
 */
export function activateEditorMode(mode: EditorMode, layout: EditorGroupLayout | undefined): void {
  activeEditorMode = mode;
  savedLayout = layout;
  notifyModeChanged();
}

/**
 * Deactivates the active OpenCode editor mode and restores its original layout.
 * @returns Promise that resolves after the workbench is restored
 */
export async function deactivateActiveEditorMode(): Promise<void> {
  const mode = activeEditorMode;
  if (!mode) {
    return;
  }

  await vscode.commands.executeCommand(
    mode === 'zen' ? 'workbench.action.toggleZenMode' : 'workbench.action.toggleMaximizeEditorGroup'
  );

  if (savedLayout) {
    await restoreEditorLayout(savedLayout);
  }

  activeEditorMode = undefined;
  savedLayout = undefined;
  notifyModeChanged();
}

/**
 * Resets the editor mode state.
 * Intended for lifecycle cleanup and tests.
 */
export function resetEditorMode(): void {
  activeEditorMode = undefined;
  savedLayout = undefined;
  notifyModeChanged();
}
