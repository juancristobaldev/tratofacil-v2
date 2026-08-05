/**
 * @format
 */

import { mediaUrl, getImageUrl } from '../src/utils/imageUrl';

describe('mediaUrl', () => {
  it('devuelve URL del CDN con extensión por defecto', () => {
    expect(mediaUrl('logo')).toBe('http://localhost:3002/files/logo.jpg');
  });

  it('devuelve cadena vacía si no hay key', () => {
    expect(mediaUrl('')).toBe('');
  });
});

describe('getImageUrl', () => {
  it('devuelve cadena vacía ante entrada nula', () => {
    expect(getImageUrl(null)).toBe('');
    expect(getImageUrl(undefined)).toBe('');
  });

  it('mantiene URLs absolutas https', () => {
    expect(getImageUrl('https://cdn.example.com/a.png')).toBe(
      'https://cdn.example.com/a.png',
    );
  });

  it('resuelve rutas relativas contra la API', () => {
    expect(getImageUrl('/files/img.png')).toBe(
      'http://localhost:4000/files/img.png',
    );
  });

  it('trata claves sin esquema como archivos del CDN', () => {
    expect(getImageUrl('banner')).toBe('http://localhost:3002/files/banner.jpg');
  });
});
