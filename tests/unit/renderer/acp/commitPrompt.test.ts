import { describe, expect, it } from 'vitest';
import { COMMIT_STAGED_ONLY_PROMPT } from '@/renderer/pages/conversation/platforms/acp/commitPrompt';

// ISS-012: the commit button must commit staged changes only and never stage on
// the user's behalf. These assert the prompt's behavioural contract so a revert
// to the old "stage all current changes" wording fails the build.
describe('COMMIT_STAGED_ONLY_PROMPT', () => {
  it('commits staged changes only', () => {
    expect(COMMIT_STAGED_ONLY_PROMPT.toLowerCase()).toContain('staged changes only');
  });

  it('forbids staging (no git add, no "stage all")', () => {
    const lower = COMMIT_STAGED_ONLY_PROMPT.toLowerCase();
    expect(lower).toContain('do not run git add');
    expect(lower).not.toContain('stage all');
  });

  it('forbids pushing', () => {
    expect(COMMIT_STAGED_ONLY_PROMPT.toLowerCase()).toContain('do not');
    expect(COMMIT_STAGED_ONLY_PROMPT.toLowerCase()).toContain('push');
  });
});
