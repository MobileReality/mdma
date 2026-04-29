import { describe, it, expect } from 'vitest';
import { serializeFiles } from '../src/core/serialize-files.js';

const makeFile = (name: string, content = 'x', type = 'text/plain') =>
  new File([content], name, { type, lastModified: 1700000000000 });

describe('serializeFiles', () => {
  it('passes primitives through unchanged', () => {
    expect(serializeFiles('hello')).toBe('hello');
    expect(serializeFiles(42)).toBe(42);
    expect(serializeFiles(true)).toBe(true);
    expect(serializeFiles(null)).toBe(null);
    expect(serializeFiles(undefined)).toBe(undefined);
  });

  it('converts a File to a JSON-safe descriptor', () => {
    const file = makeFile('report.pdf', 'pdf-content', 'application/pdf');
    expect(serializeFiles(file)).toEqual({
      name: 'report.pdf',
      size: file.size,
      type: 'application/pdf',
      lastModified: 1700000000000,
    });
  });

  it('converts a File[] field-changed payload', () => {
    const payload = {
      field: 'attachments',
      value: [makeFile('a.txt'), makeFile('b.txt')],
    };
    const out = serializeFiles(payload) as { field: string; value: unknown[] };
    expect(out.field).toBe('attachments');
    expect(out.value).toHaveLength(2);
    expect(out.value[0]).toMatchObject({ name: 'a.txt', type: 'text/plain' });
    expect(out.value[1]).toMatchObject({ name: 'b.txt' });
  });

  it('survives JSON.stringify after serialization', () => {
    const file = makeFile('photo.png', 'binary', 'image/png');
    const before = JSON.stringify({ value: file });
    const after = JSON.stringify({ value: serializeFiles(file) });
    expect(before).toBe('{"value":{}}');
    expect(after).toContain('"name":"photo.png"');
    expect(after).toContain('"type":"image/png"');
  });

  it('walks nested objects', () => {
    const file = makeFile('cv.pdf');
    const out = serializeFiles({
      outer: { inner: { upload: file, label: 'CV' } },
    }) as { outer: { inner: { upload: { name: string }; label: string } } };
    expect(out.outer.inner.label).toBe('CV');
    expect(out.outer.inner.upload.name).toBe('cv.pdf');
  });
});
