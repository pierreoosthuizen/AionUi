/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shell Bridge — native macOS app launcher.
 *
 * Routes the workspace-open button through Electron's main process instead of
 * aioncore, whose open-folder-with handler does not reliably launch VS Code.
 *
 * ponytail: macOS-only (uses `open`); this is a personal macOS build. To support
 * Linux/Windows, branch on process.platform and use xdg-open / start here.
 */

import { execFile } from 'node:child_process';
import { ipcBridge } from '@/common';

const APP_NAMES = {
  vscode: 'Visual Studio Code',
  ghostty: 'Ghostty',
} as const;

function openFolder(tool: 'vscode' | 'terminal' | 'ghostty' | 'explorer', folderPath: string): Promise<void> {
  let args: string[];
  switch (tool) {
    case 'vscode':
      args = ['-a', APP_NAMES.vscode, folderPath];
      break;
    case 'terminal':
      args = ['-a', 'Terminal', folderPath];
      break;
    case 'ghostty':
      // -n forces a new instance/window; Ghostty honors --working-directory via --args.
      args = ['-na', APP_NAMES.ghostty, '--args', `--working-directory=${folderPath}`];
      break;
    case 'explorer':
    default:
      // No -a → opens the folder in Finder.
      args = [folderPath];
      break;
  }
  return new Promise((resolve, reject) => {
    execFile('open', args, (error) => (error ? reject(error) : resolve()));
  });
}

export function initShellBridge(): void {
  ipcBridge.shell.openFolderNative.provider(({ folder_path, tool }) => openFolder(tool, folder_path));

  // `open -Ra <app>` exits 0 only when the app is registered with Launch Services.
  ipcBridge.shell.checkAppInstalled.provider(
    ({ tool }) =>
      new Promise<boolean>((resolve) => {
        execFile('open', ['-Ra', APP_NAMES[tool]], (error) => resolve(!error));
      })
  );
}
