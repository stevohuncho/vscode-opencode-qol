import { StatusBarManager } from '../src/statusBar';
import { GoUsageResponse } from '../src/types';

import { beforeEach, describe, expect, it, vi } from 'vitest';

interface MockStatusBarItem {
  text: string;
  tooltip: string;
  color: { id: string } | undefined;
  backgroundColor: { id: string } | undefined;
  hidden: boolean;
  name?: string;
  command?: string;
  show: ReturnType<typeof vi.fn>;
  hide: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
}

function getStatusBarTestState(): { items: MockStatusBarItem[] } {
  const state = globalThis as unknown as {
    __statusBarTestState?: { items: MockStatusBarItem[] };
  };
  state.__statusBarTestState ??= { items: [] };
  return state.__statusBarTestState;
}

vi.mock('vscode', () => {
  const state = getStatusBarTestState();

  return {
    StatusBarAlignment: { Right: 2 },
    ThemeColor: class ThemeColor {
      public constructor(public readonly id: string) {}
    },
    window: {
      createStatusBarItem: vi.fn(() => {
        const item: MockStatusBarItem = {
          text: '',
          tooltip: '',
          color: undefined,
          backgroundColor: undefined,
          hidden: true,
          show: vi.fn(),
          hide: vi.fn(),
          dispose: vi.fn(),
        };
        item.show.mockImplementation(() => {
          item.hidden = false;
        });
        item.hide.mockImplementation(() => {
          item.hidden = true;
        });
        state.items.push(item);
        return item;
      }),
    },
  };
});

const usage: GoUsageResponse = {
  usage: {
    rolling: { status: 'ok', percent: 43, resetsAt: '2026-08-14T04:11:57.000Z' },
    weekly: { status: 'ok', percent: 33, resetsAt: '2026-08-16T20:00:00.000Z' },
    monthly: { status: 'ok', percent: 28, resetsAt: '2026-09-05T12:18:37.000Z' },
  },
};

describe('StatusBarManager', () => {
  const state = getStatusBarTestState();

  beforeEach(() => {
    StatusBarManager.resetInstance();
    state.items = [];
  });

  it('shows the connected port when usage is unavailable', () => {
    const manager = StatusBarManager.getInstance();
    manager.initialize({ subscriptions: [] } as never);
    manager.updateConnectionStatus(true, 4096);

    expect(state.items[0]?.text).toBe('$(circle-filled) OpenCode :4096');
    expect(state.items[0]?.tooltip).toBe('Click to manage OpenCode connection');
    expect(state.items[0]?.color?.id).toBe('statusBar.foreground');
    expect(state.items[1]?.hidden).toBe(true);
  });

  it('shows all Go usage windows and reset times', () => {
    const manager = StatusBarManager.getInstance();
    manager.initialize({ subscriptions: [] } as never);
    manager.updateConnectionStatus(true, 4096);
    manager.updateGoUsage(usage);

    expect(state.items[0]?.text).toBe('$(circle-filled) OpenCode :4096');
    expect(state.items[1]?.text).toBe('$(pulse) Go (5h) 43% (7d) 33% (30d) 28%');
    expect(state.items[1]?.tooltip).toContain('5-hour rolling: 43% used');
    expect(state.items[1]?.tooltip).toContain('Weekly: 33% used');
    expect(state.items[1]?.tooltip).toContain('Monthly: 28% used');
    expect(state.items[1]?.tooltip).toContain('2026');
    expect(state.items[1]?.color?.id).toBe('statusBar.foreground');
  });

  it('shows the active editor mode icon next to the connection status', () => {
    const manager = StatusBarManager.getInstance();
    manager.initialize({ subscriptions: [] } as never);
    manager.updateConnectionStatus(true, 4096);

    manager.updateEditorMode('maximize');
    expect(state.items[0]?.text).toBe('$(circle-filled) OpenCode :4096 $(screen-full)');

    manager.updateEditorMode('zen');
    expect(state.items[0]?.text).toBe('$(circle-filled) OpenCode :4096 $(layout)');

    manager.updateEditorMode(undefined);
    expect(state.items[0]?.text).toBe('$(circle-filled) OpenCode :4096');
  });

  it('uses warning and error colors as quota usage rises', () => {
    const manager = StatusBarManager.getInstance();
    manager.initialize({ subscriptions: [] } as never);
    manager.updateConnectionStatus(true, 4096);

    manager.updateGoUsage({
      ...usage,
      usage: { ...usage.usage, weekly: { ...usage.usage.weekly, percent: 50 } },
    });
    expect(state.items[1]?.color?.id).toBe('editorWarning.foreground');

    manager.updateGoUsage({
      ...usage,
      usage: { ...usage.usage, monthly: { ...usage.usage.monthly, percent: 80 } },
    });
    expect(state.items[1]?.color?.id).toBe('errorForeground');
  });
});
