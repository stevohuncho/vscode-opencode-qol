/**
 * Unit tests for workspace utilities
 */
import { WorkspaceUtils } from '../../src/utils/workspace';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

// Mock vscode module before importing WorkspaceUtils
vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: undefined,
    name: undefined,
    asRelativePath: vi.fn(),
    getWorkspaceFolder: vi.fn(),
  },
  window: {
    activeTextEditor: undefined,
  },
  Uri: {
    parse: vi.fn((str: string) => ({
      fsPath: str,
      toString: () => str,
    })),
    joinPath: vi.fn((uri: any, ...segments: string[]) => ({
      ...uri,
      toString: () => [uri.toString(), ...segments].join('/'),
    })),
  },
}));

describe('getWorkspaceHash', () => {
  it('should generate consistent hash for same path', () => {
    const path = '/Users/test/project';
    const hash1 = WorkspaceUtils.getWorkspaceHash(path);
    const hash2 = WorkspaceUtils.getWorkspaceHash(path);
    expect(hash1).toBe(hash2);
  });

  it('should generate different hashes for different paths', () => {
    const hash1 = WorkspaceUtils.getWorkspaceHash('/Users/test/project1');
    const hash2 = WorkspaceUtils.getWorkspaceHash('/Users/test/project2');
    expect(hash1).not.toBe(hash2);
  });

  it('should return 8-character hash', () => {
    const hash = WorkspaceUtils.getWorkspaceHash('/any/path');
    expect(hash).toHaveLength(8);
  });

  it('should return only hexadecimal characters', () => {
    const hash = WorkspaceUtils.getWorkspaceHash('/test/path');
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('should handle empty string', () => {
    const hash = WorkspaceUtils.getWorkspaceHash('');
    expect(hash).toHaveLength(8);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('should handle special characters in path', () => {
    const hash = WorkspaceUtils.getWorkspaceHash('/path/with spaces & special!@#');
    expect(hash).toHaveLength(8);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('should handle unicode characters in path', () => {
    const hash = WorkspaceUtils.getWorkspaceHash('/path/with/unicode/日本語');
    expect(hash).toHaveLength(8);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it('should handle very long paths', () => {
    const longPath = '/'.repeat(1000);
    const hash = WorkspaceUtils.getWorkspaceHash(longPath);
    expect(hash).toHaveLength(8);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });
});

describe('getActiveFileRef', () => {
  beforeEach(() => {
    vi.mocked(vscode.workspace.asRelativePath).mockReturnValue('src\\extension.ts');
    vi.mocked(vscode.workspace.getWorkspaceFolder).mockReturnValue({
      uri: { fsPath: '/workspace' },
    } as vscode.WorkspaceFolder);
  });

  it('uses OpenCode-compatible line ranges for a selection', () => {
    vi.mocked(vscode.window).activeTextEditor = {
      document: {
        uri: { fsPath: '/workspace/src/extension.ts' },
      },
      selection: {
        isEmpty: false,
        start: { line: 38 },
        end: { line: 102 },
      },
    } as vscode.TextEditor;

    expect(WorkspaceUtils.getActiveFileRef()).toBe('@src/extension.ts#39-103');
  });
});
