import { describe, expect, it } from 'vitest';
import { summarizeTransport, toMcpItems } from '@/renderer/hooks/agent/useLoadedMcpServers';

describe('summarizeTransport', () => {
  it('summarizes stdio as command + args', () => {
    expect(summarizeTransport({ type: 'stdio', command: 'npx', args: ['-y', 'ollama-mcp'] })).toBe('npx -y ollama-mcp');
  });

  it('summarizes http/sse as type: url', () => {
    expect(summarizeTransport({ type: 'sse', url: 'https://x.test/mcp' })).toBe('sse: https://x.test/mcp');
    expect(summarizeTransport({ url: 'https://x.test/mcp' })).toBe('http: https://x.test/mcp');
  });

  it('returns empty string for junk', () => {
    expect(summarizeTransport(null)).toBe('');
    expect(summarizeTransport({})).toBe('');
  });
});

describe('toMcpItems', () => {
  it('maps a mcpServers map to sorted items', () => {
    const items = toMcpItems({
      zebra: { command: 'a' },
      alpha: { type: 'http', url: 'u' },
    });
    expect(items.map((i) => i.name)).toEqual(['alpha', 'zebra']);
    expect(items[0].description).toBe('http: u');
  });

  it('returns empty array for missing/invalid input', () => {
    expect(toMcpItems(undefined)).toEqual([]);
    expect(toMcpItems('nope')).toEqual([]);
  });
});
