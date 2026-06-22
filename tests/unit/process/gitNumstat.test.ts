import { describe, expect, it } from 'vitest';
import { sumNumstat } from '@process/utils/gitNumstat';

describe('sumNumstat', () => {
  it('sums added/removed across files', () => {
    expect(sumNumstat('10\t2\tsrc/a.ts\n0\t5\tsrc/b.ts')).toEqual({ added: 10, removed: 7 });
  });

  it('skips binary files (- markers) and empty lines', () => {
    expect(sumNumstat('3\t1\ta.ts\n-\t-\timg.png\n')).toEqual({ added: 3, removed: 1 });
  });

  it('returns zero for empty output', () => {
    expect(sumNumstat('')).toEqual({ added: 0, removed: 0 });
  });
});
