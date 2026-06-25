/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

// ISS-012: the commit button must commit the user's STAGED changes only — it must
// never stage on their behalf (no `git add`). The wording below is the behavioural
// contract; commitPrompt.test.ts guards against a regression back to "stage all".
export const COMMIT_STAGED_ONLY_PROMPT =
  'Create a single git commit from the currently staged changes only, with a concise conventional-commit message summarizing them. Do not stage additional files (do not run git add) and do not push. If nothing is staged, say so and stop.';
