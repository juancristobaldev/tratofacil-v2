import { useQuery } from '@apollo/client/react';
import { useLocation } from '../context/LocationContext';
import { GET_ADS, GET_DATA_AND_TRANSITIONS } from '../graphql/operations/ads';
import { EMPTY_ARRAY } from '../utils/emptyArray';
import { normalizeHorizontalAds } from '../utils/normalizeHorizontalAds';
import type { HorizontalAd } from '../utils/normalizeHorizontalAds';

export type { HorizontalAd } from '../utils/normalizeHorizontalAds';

export const useAds = (slug?: string | null) => {
  const { location } = useLocation();
  const city = undefined;

  const { data, loading, error }:any = useQuery(GET_ADS, {
    variables: {
      slug,
      city,
    },
  });
  
  const { data: adsTransitions }:any = useQuery(GET_DATA_AND_TRANSITIONS);

  const getAdsData: any = data?.getAds;
  const ads: any[] = getAdsData?.ads ?? EMPTY_ARRAY;
  const marketingHero: any[] = getAdsData?.marketingHero ?? EMPTY_ARRAY;
  const marketingHorizontal: any[] = getAdsData?.marketingHorizontal ?? EMPTY_ARRAY;
  const marketingVertical: any[] = getAdsData?.marketingVertical ?? EMPTY_ARRAY;

  const horizontal: HorizontalAd[] = normalizeHorizontalAds(getAdsData);

  const vertical = [...ads, ...marketingVertical];

  const getTransitionDuration = (
    type: string,
    orientation: string,
    fallback: number,
  ) => {
    const config = adsTransitions?.getAllImageTransition?.find(
      (i: any) => i?.type === type && i?.orientation === orientation,
    );
    return config?.duration ? config.duration : fallback;
  };

  return {
    ads,
    marketingHero,
    marketingHorizontal,
    marketingVertical,
    horizontal,
    vertical,
    getTransitionDuration,
    loading,
    error,
  };
};
