import { resolveMediaUrl } from './imageUrl';

export type HorizontalAd = {
  id: string;
  imageUrl: string;
  link?: string | null;
  title?: string | null;
  description?: string | null;
  publisherName?: string | null;
  phone?: string | null;
  info?: string | null;
  isMarketing: boolean;
  serviceName?: string | null;
};

type MediaNode = {
  cdnUrl?: string | null;
  compressedKey?: string | null;
  key?: string | null;
  extension?: string | null;
};

type OrderNode = {
  id?: string | number | null;
  image?: string | null;
  imageRelation?: MediaNode | null;
  link?: string | null;
  info?: string | null;
  service?: { name?: string | null } | null;
  category?: { name?: string | null } | null;
  user?: {
    displayName?: string | null;
    phone?: string | null;
    provider?: { name?: string | null } | null;
  } | null;
};

type AdNode = {
  id?: string | number | null;
  orders?: OrderNode[] | null;
};

type MarketingNode = {
  id?: string | number | null;
  key?: string | null;
  image?: MediaNode | null;
};

type AdsPayload = {
  ads?: AdNode[] | null;
  marketingHorizontal?: MarketingNode[] | null;
};

const uniqueByIdAndUrl = (ads: HorizontalAd[]): HorizontalAd[] => {
  const seen = new Set<string>();
  return ads.filter((ad) => {
    const fingerprint = `${ad.id}:${ad.imageUrl}`;
    if (seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  });
};

export const normalizeHorizontalAds = (payload?: AdsPayload | null): HorizontalAd[] => {
  const ads = payload?.ads ?? [];
  const marketingHorizontal = payload?.marketingHorizontal ?? [];

  const normalizedAds = ads.flatMap((ad) => {
    const orders = ad.orders ?? [];
    return orders.flatMap((order, orderIndex) => {
      const imageUrl =
        resolveMediaUrl(order.imageRelation) ||
        resolveMediaUrl(order.image);

      if (!imageUrl) return [];

      const user = order.user;
      return [{
        id: `ad-${ad.id ?? 'unknown'}-${order.id ?? orderIndex}`,
        imageUrl,
        link: order.link,
        publisherName: user?.provider?.name || user?.displayName || null,
        info: order.info,
        description: order.info,
        phone: user?.phone,
        isMarketing: false,
        serviceName: order.service?.name || order.category?.name || null,
        title: order.service?.name || order.category?.name || null,
      }];
    });
  });

  const normalizedMarketing = marketingHorizontal.flatMap((ad) => {
    const imageUrl =
      resolveMediaUrl(ad.image) ||
      resolveMediaUrl(ad.key);

    if (!imageUrl) return [];

    return [{
      id: `mkt-${ad.id ?? ad.key ?? imageUrl}`,
      imageUrl,
      link: null,
      publisherName: 'TratoDirecto',
      info: 'Publicidad',
      description: 'Publicidad',
      phone: null,
      isMarketing: true,
      serviceName: 'Publicidad',
      title: 'Publicidad',
    }];
  });

  const horizontal: HorizontalAd[] = [];
  const maxLen = Math.max(normalizedAds.length, normalizedMarketing.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < normalizedAds.length) horizontal.push(normalizedAds[i]);
    if (i < normalizedMarketing.length) horizontal.push(normalizedMarketing[i]);
  }

  return uniqueByIdAndUrl(horizontal);
};
