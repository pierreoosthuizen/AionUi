import { describe, expect, it } from 'vitest';
import { parsePeers, resolvePeerEntry, type PeerEntry } from '@/common/utils/peerRegistry';

/**
 * Unit tests for the shared peers.json resolver — the single matcher both the
 * renderer (usePeerIdentity) and main (peerAutoPickup) route through.
 */
describe('parsePeers', () => {
  it('returns the peers array from well-formed JSON', () => {
    const raw = JSON.stringify({ peers: [{ session_name: 'agora', workspace: '/ws/agora', alias: 'agora' }] });
    expect(parsePeers(raw)).toEqual([{ session_name: 'agora', workspace: '/ws/agora', alias: 'agora' }]);
  });

  it('returns [] for malformed JSON instead of throwing', () => {
    expect(parsePeers('{ not json')).toEqual([]);
  });

  it('returns [] when the peers key is missing', () => {
    expect(parsePeers('{}')).toEqual([]);
  });

  it('returns [] when peers is present but not an array', () => {
    expect(parsePeers(JSON.stringify({ peers: 'nope' }))).toEqual([]);
  });

  it('returns [] for empty input', () => {
    expect(parsePeers('')).toEqual([]);
  });
});

describe('resolvePeerEntry', () => {
  const peers: PeerEntry[] = [
    { session_name: 'agora', workspace: '/Users/p/agora/AionUi', alias: 'agora', colour: 'pink', group: 'Agora' },
    { session_name: 'forge', workspace: '/Users/p/ImproveClaude', alias: 'forge', colour: 'orange' },
    // slate's workspace is a path-prefix of ledger's — the live DiscoveryBank case.
    { session_name: 'slate', workspace: '/WorkSpaces/DiscoveryBank', alias: 'slate' },
    { session_name: 'ledger', workspace: '/WorkSpaces/DiscoveryBank/BTS-2849', alias: 'ledger' },
  ];

  it('returns the entry whose workspace exactly matches', () => {
    expect(resolvePeerEntry('/Users/p/agora/AionUi', peers)?.session_name).toBe('agora');
  });

  it('returns undefined when no workspace matches', () => {
    expect(resolvePeerEntry('/Users/p/unknown', peers)).toBeUndefined();
  });

  it('returns undefined for an empty workspace string', () => {
    expect(resolvePeerEntry('', peers)).toBeUndefined();
  });

  it('resolves a conversation opened in a subdirectory to its ancestor peer', () => {
    // No exact entry for this BTS dir — must fall to slate (its segment ancestor).
    expect(resolvePeerEntry('/WorkSpaces/DiscoveryBank/BTS-9999', peers)?.session_name).toBe('slate');
  });

  it('prefers the longest ancestor when peer workspaces are nested', () => {
    // Under both slate (/DiscoveryBank) and ledger (/DiscoveryBank/BTS-2849) — ledger wins.
    expect(resolvePeerEntry('/WorkSpaces/DiscoveryBank/BTS-2849/sub', peers)?.session_name).toBe('ledger');
  });

  it('exact match wins over a shorter ancestor prefix', () => {
    expect(resolvePeerEntry('/WorkSpaces/DiscoveryBank/BTS-2849', peers)?.session_name).toBe('ledger');
  });

  it('does NOT match a sibling whose name merely shares a string prefix (segment boundary)', () => {
    // Load-bearing: /WorkSpaces/DiscoveryBankXtra must NOT resolve to slate.
    expect(resolvePeerEntry('/WorkSpaces/DiscoveryBankXtra', peers)).toBeUndefined();
    expect(resolvePeerEntry('/WorkSpaces/DiscoveryBankXtra/x', peers)).toBeUndefined();
  });

  it('does not match a parent of a peer workspace (ancestor direction only)', () => {
    // '/Users/p/agora' is a PARENT of agora's workspace, not a child — no match.
    expect(resolvePeerEntry('/Users/p/agora', peers)).toBeUndefined();
  });

  it('returns undefined against an empty registry', () => {
    expect(resolvePeerEntry('/Users/p/agora/AionUi', [])).toBeUndefined();
  });
});
