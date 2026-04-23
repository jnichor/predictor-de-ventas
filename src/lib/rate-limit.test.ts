import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimit, getClientKey } from './rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-23T00:00:00Z'));
  });

  it('permite hasta max dentro de la ventana', () => {
    const limit = rateLimit({ windowMs: 1000, max: 3 });
    expect(limit.check('x').ok).toBe(true);
    expect(limit.check('x').ok).toBe(true);
    expect(limit.check('x').ok).toBe(true);
  });

  it('bloquea al superar el max', () => {
    const limit = rateLimit({ windowMs: 1000, max: 2 });
    limit.check('y');
    limit.check('y');
    const result = limit.check('y');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it('resetea después de la ventana', () => {
    const limit = rateLimit({ windowMs: 1000, max: 1 });
    expect(limit.check('z').ok).toBe(true);
    expect(limit.check('z').ok).toBe(false);

    vi.advanceTimersByTime(1001);

    expect(limit.check('z').ok).toBe(true);
  });

  it('separa contadores por key', () => {
    const limit = rateLimit({ windowMs: 1000, max: 1 });
    expect(limit.check('a').ok).toBe(true);
    expect(limit.check('b').ok).toBe(true);
    expect(limit.check('a').ok).toBe(false);
    expect(limit.check('b').ok).toBe(false);
  });

  it('remaining decrece correctamente', () => {
    const limit = rateLimit({ windowMs: 1000, max: 3 });
    const r1 = limit.check('k');
    expect(r1.ok && r1.remaining).toBe(2);
    const r2 = limit.check('k');
    expect(r2.ok && r2.remaining).toBe(1);
    const r3 = limit.check('k');
    expect(r3.ok && r3.remaining).toBe(0);
  });
});

describe('getClientKey', () => {
  it('usa userId si está', () => {
    const req = new Request('http://x.com');
    expect(getClientKey(req, 'abc-123')).toBe('user:abc-123');
  });

  it('fallback a IP desde x-forwarded-for', () => {
    const req = new Request('http://x.com', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientKey(req)).toBe('ip:1.2.3.4');
  });

  it('fallback a unknown si no hay header', () => {
    const req = new Request('http://x.com');
    expect(getClientKey(req)).toBe('ip:unknown');
  });
});
