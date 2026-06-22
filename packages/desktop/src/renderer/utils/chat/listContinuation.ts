/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

export type ListContinuation = { insert: string } | { exit: true } | null;

/**
 * Decide how Shift+Enter should continue a markdown list, given the text of the
 * line the caret sits on:
 *   - a non-empty `- ` / `* ` / `+ ` item → continue with the same marker + indent
 *   - a non-empty `N.` item → continue with the next number
 *   - an empty item (just the marker) → exit the list
 *   - anything else → null (not a list line; caller does nothing special)
 */
export function listContinuation(line: string): ListContinuation {
  const m = /^(\s*)(?:([-*+])|(\d+)\.)(\s+)(.*)$/.exec(line);
  if (!m) return null;
  const [, indent, bullet, num, space, rest] = m;
  if (rest.trim() === '') return { exit: true };
  if (num !== undefined) return { insert: `\n${indent}${parseInt(num, 10) + 1}.${space}` };
  return { insert: `\n${indent}${bullet}${space}` };
}
