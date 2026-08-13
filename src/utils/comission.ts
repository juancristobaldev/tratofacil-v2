export const PRODUCT_COMMISSION_RULES = [
  { min: 0, max: 49999, rate: 0.0, label: 'Tarifa Estándar' },
  { min: 50000, max: 500000, rate: 0.1, label: 'Tarifa Base' },
  { min: 500001, max: 1000000, rate: 0.05, label: 'Tarifa Preferencial' },
  { min: 1000001, max: Infinity, rate: 0.0, label: 'Sin Comisión' },
];

export function getProductCommission(total: number) {
  const rule = PRODUCT_COMMISSION_RULES.find(
    (r) => total >= r.min && total <= r.max,
  );
  const rate = rule?.rate ?? 0;
  const label = rule?.label ?? 'Tarifa Estándar';
  const basePrice = Math.round(total / (1 + rate));
  const commissionAmount = total - basePrice;
  return { rate, label, basePrice, commissionAmount };
}

export const PLAN_CONFIG = {
  FREE: {
    name: 'GRATIS',
    commissionRate: 0.2,
    maxServices: 2,
    maxCategories: 1,
    priority: 1,
  },
  TRATOFACIL_SRV_PRO: {
    name: 'PRO',
    commissionRate: 0.1,
    maxServices: Infinity,
    maxCategories: 3,
    priority: 2,
  },
  TRATOFACIL_SRV_PREMIUM: {
    name: 'PREMIUM',
    commissionRate: 0.02,
    maxServices: Infinity,
    maxCategories: Infinity,
    priority: 3,
  },
} as const;

export function getServiceRate(plan: string): number {
  const normalized =
    plan === 'PRO'
      ? 'TRATOFACIL_SRV_PRO'
      : plan === 'PREMIUM'
        ? 'TRATOFACIL_SRV_PREMIUM'
        : plan;
  const config = PLAN_CONFIG[normalized as keyof typeof PLAN_CONFIG];
  return config?.commissionRate ?? PLAN_CONFIG.FREE.commissionRate;
}

export const MARKETPLACE_LIMITS = {
  FREE: { maxPublications: 2, maxPhotos: 5 },
  TRATOFACIL_MP_BASIC: { maxPublications: 10, maxPhotos: 10 },
  TRATOFACIL_MP_PRO: { maxPublications: 50, maxPhotos: 10 },
  TRATOFACIL_MP_ENTERPRISE: { maxPublications: 200, maxPhotos: 20 },
  TRATOFACIL_MP_UNLIMITED: { maxPublications: Infinity, maxPhotos: 20 },
} as const;

export const JOB_COMMISSION_RATE = 0.15;

export function getProductPriceBreakdown(price: number) {
  const rule = PRODUCT_COMMISSION_RULES.find(
    (r) => price >= r.min && price <= r.max,
  );
  const rate = rule ? rule.rate : 0.05;
  const label = rule ? rule.label : 'Comisión base';
  const commission = Math.round(price * rate);
  const total = price + commission;
  return { commission, total, rate, label };
}
