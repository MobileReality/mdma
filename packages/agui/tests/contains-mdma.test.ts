import { describe, it, expect } from 'vitest';
import { containsMdma } from '../src/contains-mdma.js';

const FENCE = '```';

describe('containsMdma', () => {
  it('detects a backtick mdma fence', () => {
    expect(containsMdma(`intro\n\n${FENCE}mdma\nid: a\ntype: button\n${FENCE}`)).toBe(true);
  });

  it('detects a tilde mdma fence', () => {
    expect(containsMdma('~~~mdma\nid: a\ntype: button\n~~~')).toBe(true);
  });

  it('detects an indented fence inside a list', () => {
    expect(containsMdma(`- item\n  ${FENCE}mdma\n  id: a\n`)).toBe(true);
  });

  it('ignores plain prose', () => {
    expect(containsMdma('Here is some ordinary text about mdma without a fence.')).toBe(false);
  });

  it('ignores a non-mdma fenced block', () => {
    expect(containsMdma(`${FENCE}json\n{"a":1}\n${FENCE}`)).toBe(false);
  });
});
