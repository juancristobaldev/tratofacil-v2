import { API_BASE_URL } from '../config/endpoints';

interface PickedAsset {
  uri?: string;
  fileName?: string;
  type?: string;
  fileSize?: number;
}

export async function uploadImage(
  asset: PickedAsset,
  type = 'PRODUCT'
): Promise<string> {
  if (!asset.uri) {
    throw new Error('No se pudo leer la imagen seleccionada.');
  }
  const mimeType = asset.type || 'image/jpeg';
  const fileName = asset.fileName || `photo-${Date.now()}.jpg`;
  const extension = fileName.split('.').pop()?.toLowerCase() || 'jpg';

  const presignRes = await fetch(`${API_BASE_URL}/images/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mimeType, extension }),
  });
  if (!presignRes.ok) {
    throw new Error('No se pudo iniciar la subida de la imagen.');
  }
  const { url, key } = await presignRes.json();

  const putRes = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    // React Native acepta {uri, type, name} como body de fetch.
    body: { uri: asset.uri, type: mimeType, name: fileName } as any,
  });
  if (!putRes.ok) {
    throw new Error('No se pudo subir la imagen.');
  }

  const registerRes = await fetch(`${API_BASE_URL}/images/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      key,
      type,
      mimeType,
      originalSize: asset.fileSize || 0,
      extension,
    }),
  });
  if (!registerRes.ok) {
    throw new Error('No se pudo registrar la imagen.');
  }

  return key;
}
