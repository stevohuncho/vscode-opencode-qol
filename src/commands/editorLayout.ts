import * as vscode from 'vscode';

const GET_EDITOR_LAYOUT_COMMAND = 'vscode.getEditorLayout';
const SET_EDITOR_LAYOUT_COMMAND = 'vscode.setEditorLayout';

/** Maximum number of editor groups supported by a saved layout. */
export const MAX_EDITOR_GROUPS = 10;

interface EditorGroupLayoutNode {
  readonly size?: number;
  readonly groups?: readonly EditorGroupLayoutNode[];
}

/** The recursive layout shape used by VS Code's editor layout commands. */
export interface EditorGroupLayout {
  readonly orientation: 0 | 1;
  readonly groups: readonly EditorGroupLayoutNode[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidSize(size: unknown): boolean {
  return size === undefined || (typeof size === 'number' && Number.isFinite(size) && size >= 0);
}

function isEditorGroupLayoutNode(value: unknown): value is EditorGroupLayoutNode {
  if (!isRecord(value) || !isValidSize(value.size)) {
    return false;
  }

  if (value.groups === undefined) {
    return true;
  }

  return (
    Array.isArray(value.groups) &&
    value.groups.length > 0 &&
    value.groups.every(group => isEditorGroupLayoutNode(group))
  );
}

function isEditorGroupLayout(value: unknown): value is EditorGroupLayout {
  return (
    isRecord(value) &&
    (value.orientation === 0 || value.orientation === 1) &&
    Array.isArray(value.groups) &&
    value.groups.length > 0 &&
    value.groups.every(group => isEditorGroupLayoutNode(group))
  );
}

function countEditorGroups(node: EditorGroupLayoutNode): number {
  if (!node.groups) {
    return 1;
  }

  return node.groups.reduce((count, group) => count + countEditorGroups(group), 0);
}

/**
 * Captures the current editor group layout when it is within the supported limit.
 * @returns The current layout, or `undefined` when it cannot be safely saved
 */
export async function captureEditorLayout(): Promise<EditorGroupLayout | undefined> {
  const layout = await vscode.commands.executeCommand<unknown>(GET_EDITOR_LAYOUT_COMMAND);
  if (!isEditorGroupLayout(layout)) {
    return undefined;
  }

  const groupCount = layout.groups.reduce((count, group) => count + countEditorGroups(group), 0);
  return groupCount <= MAX_EDITOR_GROUPS ? layout : undefined;
}

/**
 * Restores a previously captured editor group layout.
 * @param layout - Layout returned by {@link captureEditorLayout}
 * @returns Promise that resolves after VS Code applies the layout
 */
export async function restoreEditorLayout(layout: EditorGroupLayout): Promise<void> {
  await vscode.commands.executeCommand(SET_EDITOR_LAYOUT_COMMAND, layout);
}
