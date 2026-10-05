import { describe, expect, it } from 'vitest';
import { buildWhatsAppLink, normalizePhone } from './phone';

describe('normalizePhone', () => {
  it('normalises a plain Indian mobile number', () => {
    const result = normalizePhone('9876543210');
    expect(result.status).toBe('ok');
    expect(result.normalized).toBe('919876543210');
    expect(result.countryCode).toBe('91');
  });

  it('accepts spaced, dashed and prefixed forms', () => {
    expect(normalizePhone('+91 98765 43210').normalized).toBe('919876543210');
    expect(normalizePhone('098765-43210').normalized).toBe('919876543210');
    expect(normalizePhone('0091 9876543210').normalized).toBe('919876543210');
    expect(normalizePhone('91 9876543210').normalized).toBe('919876543210');
  });

  it('keeps the raw value even when the number is unusable', () => {
    const result = normalizePhone('not available');
    expect(result.status).toBe('contains-text');
    expect(result.raw).toBe('not available');
    expect(result.normalized).toBeNull();
  });

  it('flags landline, short and multiple numbers instead of discarding them', () => {
    expect(normalizePhone('02762 234567').status).toBe('landline');
    expect(normalizePhone('12345').status).toBe('invalid');
    expect(normalizePhone('9876543210 / 9123456780').status).toBe('multiple');
    expect(normalizePhone('').status).toBe('missing');
  });

  it('supports other countries when the number is written internationally', () => {
    const result = normalizePhone('+44 7700900123');
    expect(result.status).toBe('ok');
    expect(result.normalized).toBe('447700900123');
  });

  it('encodes the WhatsApp click-to-chat link', () => {
    const link = buildWhatsAppLink('919876543210', 'Dear Ramesh & family, 10 AM');
    expect(link).toContain('https://wa.me/919876543210?text=');
    expect(link).toContain('%26');
    expect(link).not.toContain(' ');
  });
});
