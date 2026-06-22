/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Sum `git diff --numstat` output into total added/removed line counts.
 * Each line is `<added>\t<removed>\t<path>`; binary files report `-` (→ NaN),
 * which is skipped.
 */
export function sumNumstat(out: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const line of out.split('\n')) {
    const [a, r] = line.split('\t');
    const ai = Number(a);
    const ri = Number(r);
    if (!Number.isNaN(ai)) added += ai;
    if (!Number.isNaN(ri)) removed += ri;
  }
  return { added, removed };
}
