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
