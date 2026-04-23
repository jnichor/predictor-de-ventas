import { describe, it, expect, vi, afterEach } from 'vitest';
import { logInfo, logWarn, logError } from './logger';

describe('logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logInfo emite JSON válido con level=info', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logInfo('test message', { user: 'x' });
    expect(spy).toHaveBeenCalledOnce();
    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload.level).toBe('info');
    expect(payload.message).toBe('test message');
    expect(payload.context).toEqual({ user: 'x' });
    expect(payload.timestamp).toBeTruthy();
  });

  it('logWarn usa console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logWarn('slow query');
    expect(spy).toHaveBeenCalledOnce();
    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload.level).toBe('warn');
  });

  it('logError serializa Error con stack', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('boom');
    logError('something exploded', err, { orderId: 42 });
    expect(spy).toHaveBeenCalledOnce();
    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload.level).toBe('error');
    expect(payload.error.name).toBe('Error');
    expect(payload.error.message).toBe('boom');
    expect(payload.error.stack).toBeTruthy();
    expect(payload.context).toEqual({ orderId: 42 });
  });

  it('logError maneja non-Error thrown', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logError('weird throw', 'string error');
    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload.error.name).toBe('UnknownError');
    expect(payload.error.message).toBe('string error');
  });

  it('logError sin error no incluye campo error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logError('manual error log');
    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload.error).toBeUndefined();
  });
});
