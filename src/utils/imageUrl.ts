import { Platform } from 'react-native';
import { API_BASE_URL, MEDIA_ENDPOINT } from '../config/endpoints';

const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/(.*)$/;

export function mediaUrl(key: string, extension = 'jpg'): string {
  if (!key) return '';
  return `${MEDIA_ENDPOINT}files/${key}.${extension}`;
}

type MediaSource = {
  cdnUrl?: string | null;
  compressedKey?: string | null;
  key?: string | null;
  extension?: string | null;
};

export function resolveMediaUrl(source: MediaSource | string | null | undefined): string {
  if (!source) return '';

  if (typeof source === 'string') {
    return getImageUrl(source);
  }

  const { cdnUrl, compressedKey, key, extension } = source;
  const normalizedExtension = extension || undefined;

  return (
    getImageUrl(cdnUrl) ||
    (compressedKey ? mediaUrl(compressedKey, normalizedExtension) : '') ||
    (key ? mediaUrl(key, normalizedExtension) : '')
  );
}

export function getImageUrl(url: string | null | undefined): string {
  if (!url) {
    if (__DEV__) console.log('[getImageUrl] entrada vacía, retornando ""');
    return '';
  }

  const localMatch = url.match(LOCALHOST_RE);
  if (localMatch) {
    const scheme = url.startsWith('https://') ? 'https://' : 'http://';
    const port = localMatch[2] ? localMatch[2].slice(1) : '';
    const path = localMatch[3];
    const host = port ? `${DEV_HOST}:${port}` : DEV_HOST;
    const result = `${scheme}${host}/${path}`;
    if (__DEV__) console.log('[getImageUrl] rewrite localhost:', url, '→', result);
    return result;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (__DEV__) console.log('[getImageUrl] URL absoluta:', url);
    return url;
  }

  if (url.startsWith('/')) {
    const result = `${API_BASE_URL}${url}`;
    if (__DEV__) console.log('[getImageUrl] path relativo:', url, '→', result);
    return result;
  }

  const result = mediaUrl(url);
  if (__DEV__) console.log('[getImageUrl] key → mediaUrl:', url, '→', result);
  return result;
}
