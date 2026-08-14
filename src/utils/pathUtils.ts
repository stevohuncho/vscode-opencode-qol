import * as path from 'path';

/**
 * Check if a file path is a directory based on heuristics:
 * - Path ends with a directory separator
 * - Basename has no extension (e.g., 'src', 'node_modules')
 *
 * Note: This is a heuristic and may misclassify extensionless files
 * like 'Makefile', 'Dockerfile', or hidden files like '.gitignore'.
 *
 * @param filePath - The file path to check
 * @returns True if the path appears to be a directory
 */
export function isDirectory(filePath: string): boolean {
  if (filePath.endsWith('/') || filePath.endsWith('\\')) {
    return true;
  }

  const basename = path.basename(filePath);
  return !basename.includes('.');
}

/**
 * Format an absolute path for sending to OpenCode
 * Uses OpenCode-compatible POSIX-style path separators.
 * @param fsPath - The absolute file system path
 * @returns Formatted path string with @ prefix and trailing slash for directories
 */
export function formatAbsolutePath(fsPath: string): string {
  const normalizedPath = fsPath.replace(/\\/g, '/');
  let formatted = '@' + normalizedPath;
  if (isDirectory(fsPath)) {
    formatted += '/';
  }
  return formatted;
}

/**
 * Format a relative path for sending to OpenCode
 * Uses OpenCode-compatible POSIX-style path separators.
 * @param relativePath - The relative path
 * @param isDir - Whether the path is a directory
 * @returns Formatted path string with @ prefix and trailing slash for directories
 */
export function formatRelativePath(relativePath: string, isDir: boolean): string {
  const normalizedPath = relativePath.replace(/\\/g, '/');
  let formatted = '@' + normalizedPath;
  if (isDir) {
    formatted += '/';
  }
  return formatted;
}
