import { describe, expect, it } from 'vitest';
import { detectDelimiter, parseCsv, toCsv } from './csv';

describe('parseCsv', () => {
  it('reads a simple file', () => {
    expect(parseCsv('Name,Phone\nRamesh,9876543210')).toEqual([
      ['Name', 'Phone'],
      ['Ramesh', '9876543210'],
    ]);
  });

  it('keeps commas and quotes inside quoted fields', () => {
    const rows = parseCsv('Name,Notes\n"Patel, Ramesh","He said ""yes"""');
    expect(rows[1]).toEqual(['Patel, Ramesh', 'He said "yes"']);
  });

  it('handles newlines inside a quoted field', () => {
    const rows = parseCsv('Name,Notes\nRamesh,"line one\nline two"');
    expect(rows[1]?.[1]).toBe('line one\nline two');
  });

  it('handles CRLF, a byte order mark and a trailing newline', () => {
    const rows = parseCsv('\uFEFFName,Phone\r\nRamesh,98765\r\n');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.[0]).toBe('Name');
  });

  it('detects semicolon and tab files', () => {
    expect(detectDelimiter('Name;Phone;Village')).toBe(';');
    expect(detectDelimiter('Name\tPhone')).toBe('\t');
    expect(parseCsv('Name;Phone\nRamesh;98765')[1]).toEqual(['Ramesh', '98765']);
  });

  it('writes CSV back out with escaping', () => {
    expect(toCsv([['Row', 'Reason'], [3, 'Phone: not "ok", check']])).toBe(
      'Row,Reason\r\n3,"Phone: not ""ok"", check"'
    );
  });
});
