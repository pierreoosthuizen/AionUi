/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { initApplicationBridge } from './applicationBridge';
import { initDialogBridge } from './dialogBridge';
import { initUpdateBridge } from './updateBridge';
import { initSystemSettingsBridge } from './systemSettingsBridge';
import { initWindowControlsBridge } from './windowControlsBridge';
import { initNotificationBridge } from './notificationBridge';
import { initWebuiBridge } from './webuiBridge';
import { initThemeBridge } from './themeBridge';
import { initShellBridge } from './shellBridge';
import { initGitBridge } from './gitBridge';
import { initUsageBridge } from './usageBridge';
import { initMetricsBridge } from './metricsBridge';
import { initPeerTaskBridge } from './peerTaskBridge';
import { initPeerBridge } from './peerBridge';
import { initPeerGroupBridge } from './peerGroupBridge';

export type BridgeDependencies = Record<string, never>;

export function initAllBridges(_deps: BridgeDependencies = {}): void {
  initDialogBridge();
  initApplicationBridge();
  initWindowControlsBridge();
  initUpdateBridge();
  initSystemSettingsBridge();
  initNotificationBridge();
  initWebuiBridge();
  initThemeBridge();
  initShellBridge();
  initGitBridge();
  initUsageBridge();
  initMetricsBridge();
  initPeerTaskBridge();
  initPeerBridge();
  initPeerGroupBridge();
}

export {
  initApplicationBridge,
  initDialogBridge,
  initNotificationBridge,
  initSystemSettingsBridge,
  initThemeBridge,
  initUpdateBridge,
  initWindowControlsBridge,
  initWebuiBridge,
  initShellBridge,
  initGitBridge,
  initUsageBridge,
  initMetricsBridge,
  initPeerTaskBridge,
  initPeerBridge,
  initPeerGroupBridge,
};
export { registerWindowMaximizeListeners } from './windowControlsBridge';
export const disposeAllTeamSessions = (): Promise<void> => Promise.resolve();
