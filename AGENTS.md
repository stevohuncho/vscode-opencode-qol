# AGENTS.md - Agentic Coding Guidelines

This file provides guidelines and commands for agentic coding agents operating in this repository.

## Project Overview

This is a VS Code extension that integrates OpenCode AI assistant with VS Code. It's a TypeScript project using VS Code extension APIs.

---

## Commands

### Build & Development

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run compile` | Bundle the extension and integration-test runner with esbuild into `out/` |
| `npm run watch` | Watch and rebuild the extension and integration-test runner |
| `npm run pack` | Create `dist/opencode-qol.vsix` |

The repository also provides a lowercase `justfile`:

| Command | Description |
|---------|-------------|
| `just install` | Package the extension and install `dist/opencode-qol.vsix` into VS Code using the `code` CLI |
| `just precommit` | Run linting, formatting checks, unit tests, and compilation |

### Testing

| Command | Description |
|---------|-------------|
| `npm run test` | Run all tests (unit + integration) |
| `npm run test:unit` | Run unit tests only (vitest) |
| `npm run test:integration` | Run the compiled VS Code integration-test runner |

**Running a single test file:**
```bash
npx vitest run test/utils/debounce.test.ts
```

`npm run test` runs `npm run test:unit` followed by `npm run test:integration`. The
`pretest` script compiles the project before `npm run test` runs. Run
`npm run compile` first when invoking `npm run test:integration` directly.

### Linting & Formatting

| Command | Description |
|---------|-------------|
| `npm run lint` | Run ESLint on src directory |
| `npm run format` | Format all files with Prettier |
| `npm run format:check` | Check formatting without modifying |

---

## Code Style Guidelines

### TypeScript Configuration

- **Strict mode**: Enabled
- **Module setting**: ESNext, bundled by esbuild
- **TypeScript target**: ES2020
- **Build target**: Node 16
- **Unused variables and parameters**: Not allowed (`noUnusedLocals`, `noUnusedParameters`)
- **Module resolution**: `bundler`

### Formatting (Prettier)

| Setting | Value |
|---------|-------|
| Semi-colons | Yes |
| Tab width | 2 |
| Print width | 100 |
| Quotes | Single quotes |
| Trailing commas | ES5 style |
| Arrow parens | Avoid when possible |

### Import Sorting

The project uses `@trivago/prettier-plugin-sort-imports` with this order:
1. Relative imports (`./`, `../`)
2. External packages (`^[a-z-]+$`)

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Classes | PascalCase | `OpenCodeClient`, `ConfigManager` |
| Interfaces/Types | PascalCase | `OpenCodeClientConfig`, `HealthResponse` |
| Functions | camelCase | `handleAddToPrompt`, `getActiveFileRef` |
| Variables | camelCase | `connectionService`, `outputChannel` |
| Constants | PascalCase or UPPER_SNAKE | `DEFAULT_CONFIG` |
| Files (classes) | PascalCase | `connectionService.ts` |
| Files (utilities) | camelCase | `debounce.ts`, `workspace.ts` |

### Code Organization

```
src/
├── api/           # OpenCode HTTP client and API errors
├── commands/      # VS Code command handlers and command registration
├── connection/    # Workspace-aware connection service
├── instance/      # Instance discovery, management, and defaults
├── utils/         # Debouncing, path, and workspace utilities
├── config.ts      # VS Code configuration access
├── extension.ts   # Extension activation and lifecycle
├── statusBar.ts   # Connection status-bar item
└── types.ts       # Shared types

test/
├── api/           # OpenCode client tests
├── commands/      # Command-handler tests
├── connection/    # Connection-service tests
├── extension/     # Extension-related tests
├── instance/      # Instance-management tests
├── utils/         # Utility tests
├── runTest.ts     # VS Code integration-test launcher
└── suite/         # Mocha integration-test suite
```

### JSDoc Comments

Document all exported functions and classes with JSDoc:
```typescript
/**
 * Brief description of what the function does.
 * @param paramName - Description of parameter
 * @returns Description of return value
 */
export async function myFunction(paramName: string): Promise<void> {
  // ...
}
```

### Error Handling

- Use custom error classes extending `Error` or `OpenCodeError`
- Always catch and handle async errors with try/catch
- Use type-safe error casting: `(err as Error).message`
- Log errors to output channel before showing user messages

**Good pattern:**
```typescript
try {
  const result = await someAsyncOperation();
  outputChannel.info('Operation succeeded');
} catch (err) {
  outputChannel.error(`Operation failed: ${(err as Error).message}`);
  await vscode.window.showErrorMessage(`Failed: ${(err as Error).message}`);
}
```

### VS Code Extension Patterns

- Register commands with `vscode.commands.registerCommand`
- Subscribe to disposables via `extensionContext.subscriptions.push()`
- Use `LogOutputChannel` for user-accessible logging (View → Output)
- Return early with user messages for validation failures
- Use `async/await` for all VS Code APIs

#### Extension Manifest Commands and Menus

When adding a command or menu contribution:
- Define commands in `contributes.commands`
- Add menu entries to the appropriate `contributes.menus` location
- Keep the command identifier in `package.json` and the registered command in sync

The current extension uses these menu locations:
```json
"menus": {
  "explorer/context": [
    { "command": "opencodeQol.addFileToPrompt" }
  ],
  "editor/context": [
    { "command": "opencodeQol.addSelectionToPrompt" }
  ],
  "editor/title": [
    { "command": "opencodeQol.openNewInstance" }
  ]
}
```

### Type Annotations

- Always use explicit return types on exported functions
- Use `interface` for object shapes, `type` for unions/aliases
- Prefer `type` over `interface` for simple configs
- Use `readonly` for immutable arrays

### Testing Patterns

- Unit tests use Vitest with `describe`, `it`, `expect`, and inline `vi.mock('vscode', ...)` factories where needed.
- Unit tests are discovered from `test/**/*.test.ts` by `vitest.config.ts`.
- Integration tests use Mocha through `@vscode/test-electron`.
- The integration suite scans compiled files under `out/test` for `**/*.test.ts`.
- Keep unit tests under the matching subdirectory in `test/` rather than alongside source files.

---

## Pre-Commit Checklist

Before submitting any changes:

1. [ ] Run `just precommit` (or run its four commands individually)
2. [ ] Run `npm run pack` when packaging or validating the VSIX
3. [ ] Check for any `// TODO:` comments that should be addressed
