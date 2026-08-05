import type { Category, Service } from '../types/graphql';

export type TreeNode = {
  id: number;
  name: string;
  slug: string;
  type: 'category' | 'subcategory';
  parentName?: string;
  services: Service[];
  providerCount: number;
  onlineProviderCount: number;
};

export function buildCategoryTree(
  mainCategories: Array<{ id: number; name: string; slug: string }>,
  allCategories: Category[],
  services: Service[],
): TreeNode[] {
  const servicesByCategoryId = new Map<number, Service[]>();

  for (const service of services) {
    if (service.category?.id) {
      const list = servicesByCategoryId.get(service.category.id) || [];
      list.push(service);
      servicesByCategoryId.set(service.category.id, list);
    }
  }

  const nodes: TreeNode[] = [];

  for (const root of mainCategories) {
    const fullRoot = allCategories.find((c) => c.id === root.id);
    if (!fullRoot) continue;

    const subs = fullRoot.subCategories || [];
    const subsWithServices = subs.filter((sub) => {
      const count = (servicesByCategoryId.get(sub.id) || []).length;
      return count > 0;
    });

    if (subsWithServices.length > 0) {
      for (const sub of subsWithServices) {
        const nodeServices = servicesByCategoryId.get(sub.id) || [];
        const sortedServices = [...nodeServices].sort((a, b) => {
          const aOnline = (a.serviceProviders || []).some(
            (sp: any) => sp.provider?.isRealtimeActive,
          );
          const bOnline = (b.serviceProviders || []).some(
            (sp: any) => sp.provider?.isRealtimeActive,
          );
          if (aOnline !== bOnline) return bOnline ? 1 : -1;
          return a.name.localeCompare(b.name);
        });
        const allProviders = sortedServices.flatMap(
          (s) => s.serviceProviders || [],
        );
        nodes.push({
          id: sub.id,
          name: sub.name,
          slug: sub.slug,
          type: 'subcategory',
          parentName: root.name,
          services: sortedServices,
          providerCount: allProviders.length,
          onlineProviderCount: allProviders.filter(
            (p) => p.provider?.isRealtimeActive,
          ).length,
        });
      }
    } else {
      const directServices = servicesByCategoryId.get(root.id) || [];
      if (directServices.length > 0) {
        const sortedServices = [...directServices].sort((a, b) => {
          const aOnline = (a.serviceProviders || []).some(
            (sp: any) => sp.provider?.isRealtimeActive,
          );
          const bOnline = (b.serviceProviders || []).some(
            (sp: any) => sp.provider?.isRealtimeActive,
          );
          if (aOnline !== bOnline) return bOnline ? 1 : -1;
          return a.name.localeCompare(b.name);
        });
        const allProviders = sortedServices.flatMap(
          (s) => s.serviceProviders || [],
        );
        nodes.push({
          id: root.id,
          name: root.name,
          slug: root.slug,
          type: 'category',
          services: sortedServices,
          providerCount: allProviders.length,
          onlineProviderCount: allProviders.filter(
            (p) => p.provider?.isRealtimeActive,
          ).length,
        });
      }
    }
  }

  nodes.sort((a, b) => {
    if (a.onlineProviderCount !== b.onlineProviderCount)
      return b.onlineProviderCount - a.onlineProviderCount;
    if (a.providerCount !== b.providerCount)
      return b.providerCount - a.providerCount;
    return a.name.localeCompare(b.name);
  });

  return nodes;
}

export function resolveCategorySlugs(
  allCategories: Category[],
  selectedSlug: string,
): string[] {
  const slugs: string[] = [];

  function collectDescendants(cat: Category) {
    slugs.push(cat.slug);
    for (const child of cat.subCategories || []) {
      collectDescendants(child);
    }
  }

  function searchAndCollect(cat: Category): boolean {
    if (cat.slug === selectedSlug) {
      collectDescendants(cat);
      return true;
    }
    for (const child of cat.subCategories || []) {
      if (searchAndCollect(child)) return true;
    }
    return false;
  }

  for (const root of allCategories) {
    if (searchAndCollect(root)) break;
  }

  return slugs.length > 0 ? slugs : [selectedSlug];
}
