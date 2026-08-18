import { normalizeHorizontalAds } from './normalizeHorizontalAds';

describe('normalizeHorizontalAds', () => {
  it('uses ad imageRelation cdnUrl when available', () => {
    const result = normalizeHorizontalAds({
      ads: [{
        id: 4,
        orders: [{
          id: 9,
          imageRelation: {
            cdnUrl: 'https://media.example.com/files/compressed/a.jpg',
            compressedKey: 'compressed-key',
            key: 'raw-key',
            extension: 'webp',
          },
        }],
      }],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'ad-4-9',
      imageUrl: 'https://media.example.com/files/compressed/a.jpg',
      isMarketing: false,
    });
  });

  it('falls back to ad image key when cdnUrl is missing', () => {
    const result = normalizeHorizontalAds({
      ads: [{
        id: 4,
        orders: [{ id: 9, image: 'raw-key' }],
      }],
    });

    expect(result).toHaveLength(1);
    expect(result[0].imageUrl).toContain('/files/raw-key.jpg');
  });

  it('uses marketingHorizontal image cdnUrl when available', () => {
    const result = normalizeHorizontalAds({
      marketingHorizontal: [{
        id: 42,
        key: 'marketing-key',
        image: { cdnUrl: 'https://media.example.com/files/marketing.png' },
      }],
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'mkt-42',
      imageUrl: 'https://media.example.com/files/marketing.png',
      isMarketing: true,
    });
  });

  it('falls back to marketingHorizontal key when image is null', () => {
    const result = normalizeHorizontalAds({
      marketingHorizontal: [{ id: 42, key: 'marketing-key', image: null }],
    });

    expect(result).toHaveLength(1);
    expect(result[0].imageUrl).toContain('/files/marketing-key.jpg');
  });

  it('prefers compressedKey over key when cdnUrl is missing', () => {
    const result = normalizeHorizontalAds({
      marketingHorizontal: [{
        id: 42,
        key: 'raw-key',
        image: { cdnUrl: null, compressedKey: 'compressed-key', key: 'image-key', extension: 'webp' },
      }],
    });

    expect(result).toHaveLength(1);
    expect(result[0].imageUrl).toContain('/files/compressed-key.webp');
  });

  it('uses key when cdnUrl and compressedKey are null', () => {
    const result = normalizeHorizontalAds({
      marketingHorizontal: [{
        id: 42,
        key: 'fallback-key',
        image: { cdnUrl: null, compressedKey: null, key: 'image-key', extension: 'png' },
      }],
    });

    expect(result).toHaveLength(1);
    expect(result[0].imageUrl).toContain('/files/image-key.png');
  });

  it('drops only items without any media source', () => {
    const result = normalizeHorizontalAds({
      ads: [
        { id: 1, orders: [{ id: 1, imageRelation: null, image: null }] },
        { id: 2, orders: [{ id: 2, image: 'valid-key' }] },
      ],
      marketingHorizontal: [{ id: 3, key: null, image: null }],
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ad-2-2');
  });

  it('handles multiple ads and empty lists deterministically', () => {
    expect(normalizeHorizontalAds(null)).toEqual([]);
    expect(normalizeHorizontalAds({ ads: [], marketingHorizontal: [] })).toEqual([]);

    const result = normalizeHorizontalAds({
      ads: [{ id: 1, orders: [{ id: 1, image: 'ad-key' }] }],
      marketingHorizontal: [{ id: 2, key: 'mkt-key', image: null }],
    });

    expect(result.map((ad) => ad.id)).toEqual(['ad-1-1', 'mkt-2']);
  });

  it('deduplicates by id and resolved imageUrl', () => {
    const result = normalizeHorizontalAds({
      marketingHorizontal: [
        { id: 2, key: 'mkt-key', image: null },
        { id: 2, key: 'mkt-key', image: null },
      ],
    });

    expect(result).toHaveLength(1);
  });
});
