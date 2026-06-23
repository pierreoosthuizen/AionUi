/**
 * @license
 * Copyright 2026 Plouton Consulting (Pty) Ltd.
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { readFileMock, writeFileMock } = vi.hoisted(() => ({ readFileMock: vi.fn(), writeFileMock: vi.fn() }));
vi.mock('@/common/adapter/ipcBridge', () => ({
  fs: { readFile: { invoke: readFileMock }, writeFile: { invoke: writeFileMock } },
}));

import {
  applyOverride,
  cycleSkillState,
  nextState,
  parseSettings,
  readSkillOverrides,
  stateFromLiteral,
} from '@/renderer/hooks/agent/skillOverrides';

// ADR-0003 §1/§2: skill-state model + the load-bearing write-safety guards.

describe('stateFromLiteral', () => {
  /** Absent override = the `on` default; never stored as a literal. */
  it('maps absence to on', () => {
    expect(stateFromLiteral(undefined)).toBe('on');
  });

  /** CC literals map to their UI states; user-only persists as user-invocable-only. */
  it('maps the three CC literals', () => {
    expect(stateFromLiteral('name-only')).toBe('name-only');
    expect(stateFromLiteral('user-invocable-only')).toBe('user-only');
    expect(stateFromLiteral('off')).toBe('off');
  });

  /** An unknown/future literal is shown as on, not misrepresented as disabled. */
  it('treats an unrecognised literal as on', () => {
    expect(stateFromLiteral('something-new')).toBe('on');
  });
});

describe('nextState', () => {
  /** Click cycles on → name-only → user-only → off → on, mirroring the CLI. */
  it('cycles through all four states and wraps', () => {
    expect(nextState('on')).toBe('name-only');
    expect(nextState('name-only')).toBe('user-only');
    expect(nextState('user-only')).toBe('off');
    expect(nextState('off')).toBe('on');
  });
});

describe('parseSettings', () => {
  /** Missing/empty file is treated as an empty object — first write creates it. */
  it('treats null and empty as {}', () => {
    expect(parseSettings(null)).toEqual({ ok: true, value: {} });
    expect(parseSettings('   ')).toEqual({ ok: true, value: {} });
  });

  /** Valid JSON object parses through. */
  it('parses a JSON object', () => {
    expect(parseSettings('{"a":1}')).toEqual({ ok: true, value: { a: 1 } });
  });

  /** Unparseable JSON is NOT ok — caller must refuse to overwrite it. */
  it('refuses malformed JSON', () => {
    expect(parseSettings('{ not json')).toEqual({ ok: false });
  });

  /** A non-object (array/primitive) is not a settings object — also not ok. */
  it('refuses a JSON array or primitive', () => {
    expect(parseSettings('[1,2,3]')).toEqual({ ok: false });
    expect(parseSettings('42')).toEqual({ ok: false });
  });
});

describe('applyOverride', () => {
  /** Setting a disabled state preserves every unrelated key (data-loss guard). */
  it('preserves unrelated keys when setting an override', () => {
    const before = { env: { FOO: 'bar' }, formatter: 'oxfmt', skillOverrides: { keep: 'off' } };
    const after = applyOverride(before, 'demo', 'name-only');
    expect(after.env).toEqual({ FOO: 'bar' });
    expect(after.formatter).toBe('oxfmt');
    expect(after.skillOverrides).toEqual({ keep: 'off', demo: 'name-only' });
  });

  /** user-only persists as the CC literal user-invocable-only. */
  it('writes the user-invocable-only literal for user-only', () => {
    const after = applyOverride({}, 'demo', 'user-only');
    expect(after.skillOverrides).toEqual({ demo: 'user-invocable-only' });
  });

  /** Cycling back to on DELETES the key rather than storing an "on" literal. */
  it('deletes the key on the off→on transition', () => {
    const after = applyOverride({ skillOverrides: { demo: 'off', other: 'off' } }, 'demo', 'on');
    expect(after.skillOverrides).toEqual({ other: 'off' });
  });

  /** Does not mutate the input object (returns a fresh settings object). */
  it('is non-mutating', () => {
    const before = { skillOverrides: { demo: 'off' } };
    applyOverride(before, 'demo', 'on');
    expect(before.skillOverrides).toEqual({ demo: 'off' });
  });

  /** Creates skillOverrides when the file had none. */
  it('creates skillOverrides on a settings object without one', () => {
    const after = applyOverride({ env: {} }, 'demo', 'off');
    expect(after).toEqual({ env: {}, skillOverrides: { demo: 'off' } });
  });
});

describe('readSkillOverrides', () => {
  /** Reads the override map; corrupt input yields {} (no state shown, safe). */
  it('returns the map from valid settings and {} from corrupt', () => {
    expect(readSkillOverrides('{"skillOverrides":{"a":"off"}}')).toEqual({ a: 'off' });
    expect(readSkillOverrides('{ corrupt')).toEqual({});
    expect(readSkillOverrides(null)).toEqual({});
  });
});

describe('cycleSkillState (write path)', () => {
  beforeEach(() => {
    readFileMock.mockReset();
    writeFileMock.mockReset();
    writeFileMock.mockResolvedValue(true);
  });

  /** Mandatory guard (a): a state write preserves every unrelated settings key. */
  it('preserves unrelated keys when persisting a new state', async () => {
    readFileMock.mockResolvedValue(JSON.stringify({ env: { FOO: '1' }, skillOverrides: { other: 'off' } }));
    const next = await cycleSkillState('/ws', 'demo', 'on');
    expect(next).toBe('name-only');
    const written = JSON.parse(writeFileMock.mock.calls[0][0].data as string);
    expect(written.env).toEqual({ FOO: '1' });
    expect(written.skillOverrides).toEqual({ other: 'off', demo: 'name-only' });
  });

  /** Mandatory guard (b): a corrupt settings file is NOT clobbered — write refused. */
  it('aborts (throws, no write) when settings.local.json is unparseable', async () => {
    readFileMock.mockResolvedValue('{ this is : not json');
    await expect(cycleSkillState('/ws', 'demo', 'on')).rejects.toThrow(/not valid JSON/);
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  /** Missing file → created; first override written into a fresh skillOverrides. */
  it('creates the file with a fresh override when missing', async () => {
    readFileMock.mockResolvedValue(null);
    const next = await cycleSkillState('/ws', 'demo', 'on'); // on → name-only
    expect(next).toBe('name-only');
    const written = JSON.parse(writeFileMock.mock.calls[0][0].data as string);
    expect(written.skillOverrides).toEqual({ demo: 'name-only' });
  });

  /** off → on deletes the key (never stores an "on" literal). */
  it('deletes the override on the off→on transition', async () => {
    readFileMock.mockResolvedValue(JSON.stringify({ skillOverrides: { demo: 'off', keep: 'off' } }));
    const next = await cycleSkillState('/ws', 'demo', 'off'); // off → on
    expect(next).toBe('on');
    const written = JSON.parse(writeFileMock.mock.calls[0][0].data as string);
    expect(written.skillOverrides).toEqual({ keep: 'off' });
  });
});
