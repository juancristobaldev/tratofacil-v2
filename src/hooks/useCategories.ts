import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useLazyQuery } from '@apollo/client/react';
import {
  GET_MAIN_CATEGORIES,
  GET_CATEGORIES,
  GET_CATEGORY_BY_SLUG,
  GET_SERVICES_BY_CATEGORY,
} from '../graphql/operations/categories';
import type {
  Category,
  Service,
} from '../graphql/generated';
import { buildCategoryTree, type TreeNode } from '../utils/categoryTree';
import { EMPTY_ARRAY } from '../utils/emptyArray';

export interface ServicesFilters {
  slug: string;
  city?: string;
  includeProvidersOnly?: boolean;
  skip?: number;
  take?: number;
}

export interface UseCategoriesReturn {
  mainCategories: Array<{ id: number; name: string; slug: string }>;
  mainLoading: boolean;
  mainError: any;
  categories: Category[];
  categoriesLoading: boolean;
  categoriesError: any;
  servicesByCategory: Service[];
  servicesLoading: boolean;
  servicesError: any;
  fetchServicesByCategory: (params: ServicesFilters) => void;
  refetchServicesByCategory: () => void;
  categoryBySlug: Category | null;
  slugLoading: boolean;
  fetchCategoryBySlug: (slug: string | null) => void;
  categoryTree: TreeNode[];
}

type MainCategory = { id: number; name: string; slug: string };

export function useCategories(): UseCategoriesReturn {
  const [serviceFilters, setServiceFilters] = useState<ServicesFilters>({
    slug: '__all__',
    includeProvidersOnly: true,
  });
  const [categorySlug, setCategorySlug] = useState<string | null>(null);

  const {
    data: mainData,
    loading: mainLoading,
    error: mainError,
  } = useQuery<{ mainCategories: MainCategory[] }>(GET_MAIN_CATEGORIES);

  const {
    data: categoriesData,
    loading: categoriesLoading,
    error: categoriesError,
  } = useQuery<{ categories: Category[] }>(GET_CATEGORIES);

  const {
    data: servicesData,
    loading: servicesLoading,
    error: servicesError,
    refetch: refetchServices,
  } = useQuery<{ servicesByCategory: Service[] }>(GET_SERVICES_BY_CATEGORY, {
    variables: serviceFilters,
    skip: false,
    fetchPolicy: 'network-only',
    pollInterval: 30000,
    notifyOnNetworkStatusChange: true,
    errorPolicy: 'all',
  });

  const {
    data: slugData,
    loading: slugLoading,
  } = useQuery<{ categoryBySlug: Category }>(GET_CATEGORY_BY_SLUG, {
    variables: { slug: categorySlug || '' },
    skip: !categorySlug,
  });

  useEffect(() => {
    const svcs = servicesData?.servicesByCategory || [];
    let total = 0;
    let withCdnUrl = 0;
    svcs.forEach((s: any) => {
      (s.serviceProviders || []).forEach((sp: any) => {
        total++;
        if (sp.provider?.logoImage?.cdnUrl) withCdnUrl++;
      });
    });
    if (__DEV__ && total > 0) {
      console.log('[TRACE:QUERY] GetServicesByCategory | providers:', total, '| withCdnUrl:', withCdnUrl, '| services:', svcs.length);

      svcs.forEach((s: any, si: number) => {
        (s.serviceProviders || []).forEach((sp: any) => {
          const pr = sp.provider;
          if (!pr) return;
          console.log(
            `[APOLLO:RAW] GetServicesByCategory | provider ${pr.id} ${pr.name}`,
            '| logoImage.id:', pr.logoImage?.id,
            '| logoImage.cdnUrl:', pr.logoImage?.cdnUrl?.substring(0, 60) || null,
          );
        });
      });
    }
  }, [servicesData]);

  const categoryTree = useMemo(() => {
    return buildCategoryTree(
      mainData?.mainCategories ?? EMPTY_ARRAY,
      categoriesData?.categories ?? EMPTY_ARRAY,
      (servicesData?.servicesByCategory ?? EMPTY_ARRAY) as Service[],
    );
  }, [mainData, categoriesData, servicesData]);

  // Memoizado: este hook está centralizado en CategoriesContext.tsx y envuelve toda
  // la app. Sin este useMemo, el objeto de retorno sería nuevo en cada render (p.ej.
  // cada vez que el poll de 30s de GET_SERVICES_BY_CATEGORY alterna loading true/false),
  // forzando un re-render de todos los consumidores (HomePage, CategoriesPanelContent,
  // TratoDirectoScreen) aunque nada haya cambiado realmente.
  return useMemo<UseCategoriesReturn>(() => ({
    mainCategories: mainData?.mainCategories ?? EMPTY_ARRAY,
    mainLoading,
    mainError,
    categories: categoriesData?.categories ?? EMPTY_ARRAY,
    categoriesLoading,
    categoriesError,
    servicesByCategory: (servicesData?.servicesByCategory ?? EMPTY_ARRAY) as Service[],
    servicesLoading,
    servicesError,
    fetchServicesByCategory: setServiceFilters,
    refetchServicesByCategory: refetchServices,
    categoryBySlug: slugData?.categoryBySlug || null,
    slugLoading,
    fetchCategoryBySlug: setCategorySlug,
    categoryTree,
  }), [
    mainData,
    mainLoading,
    mainError,
    categoriesData,
    categoriesLoading,
    categoriesError,
    servicesData,
    servicesLoading,
    servicesError,
    refetchServices,
    slugData,
    slugLoading,
    categoryTree,
  ]);
}
