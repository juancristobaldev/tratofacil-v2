import { useQuery } from '@apollo/client/react';
import { useLocation } from '../context/LocationContext';
import { GET_ADS, GET_DATA_AND_TRANSITIONS } from '../graphql/operations/ads';

export const useAds = (slug?: string | null) => {
  const { location } = useLocation();
  // LocationContext in v2 provides coords (latitude, longitude). The Next.js web app's `useMe` has `location.city`.
  // Here we'll pass undefined for city for now since the graphql expects string city name, unless we reverse geocode.
  const city = undefined;

  const { data, loading, error }:any = useQuery(GET_ADS, {
    variables: {
      slug,
      city,
    },
  });
  
  const { data: adsTransitions }:any = useQuery(GET_DATA_AND_TRANSITIONS);

  const getAdsData: any = data?.getAds;
  const ads: any[] = getAdsData?.ads || [];
  const marketingHero: any[] = getAdsData?.marketingHero || [];
  const marketingHorizontal: any[] = getAdsData?.marketingHorizontal || [];
  const marketingVertical: any[] = getAdsData?.marketingVertical || [];

  const horizontal = [...ads, ...marketingHorizontal];
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
