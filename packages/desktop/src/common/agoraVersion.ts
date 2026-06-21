/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Agora app version — personal build, independent of package.json's upstream
 * AionUi version (which drives the installer/auto-update).
 *
 * Scheme (MAJOR.MINOR, two-digit minor):
 *   - fix / tweak      → bump the last digit:   1.00 → 1.01
 *   - small change     → bump the tens digit:   1.01 → 1.10
 *   - (major rewrites)  → bump MAJOR:            1.xx → 2.00
 */
export const AGORA_VERSION = '1.00';
