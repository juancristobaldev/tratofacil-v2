/**
 * @format
 */

import { summarize } from '../src/utils/socketLogger';

describe('summarize (socket logger)', () => {
  it('devuelve cadena vacía para null/undefined', () => {
    expect(summarize(null)).toBe('');
    expect(summarize(undefined)).toBe('');
  });

  it('convierte primitivos a string', () => {
    expect(summarize('hola')).toBe('hola');
    expect(summarize(42)).toBe('42');
  });

  it('extrae status de eventos', () => {
    expect(summarize({ status: 'ACCEPTED' })).toBe('status:ACCEPTED');
  });

  it('extrae orderRealtimeId como orderId', () => {
    expect(summarize({ orderRealtimeId: 7, status: 'IN_PROGRESS' })).toBe(
      'status:IN_PROGRESS orderId:7',
    );
  });

  it('extrae clientId y providerId', () => {
    expect(summarize({ clientId: 1, providerId: 2 })).toBe(
      'client:1 provider:2',
    );
  });

  it('serializa objetos desconocidos truncados', () => {
    const out = summarize({ foo: { bar: 'x'.repeat(200) } });
    expect(out.length).toBeLessThanOrEqual(90);
  });
});
