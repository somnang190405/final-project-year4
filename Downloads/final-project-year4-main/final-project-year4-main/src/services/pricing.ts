export const normalizePromotionPercent = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
};

export const calcDiscountedUnitPrice = (price: number, promotionPercent?: unknown): number => {
  const p = normalizePromotionPercent(promotionPercent);
  if (!Number.isFinite(price)) return 0;
  if (p <= 0) return price;
  return price * (1 - p / 100);
};

export const calcCartTotals = <T extends { price: number; promotionPercent?: unknown; quantity: number }>(
  items: T[]
) => {
  const originalSubtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountedSubtotal = items.reduce(
    (sum, i) => sum + calcDiscountedUnitPrice(i.price, i.promotionPercent) * i.quantity,
    0
  );
  const discountTotal = Math.max(0, originalSubtotal - discountedSubtotal);

  return {
    originalSubtotal,
    discountedSubtotal,
    discountTotal,
  };
};

export const FREE_DELIVERY_THRESHOLD = 100;
export const DEFAULT_SHIPPING_FEE = 10;

export const calcShippingFee = (subtotal: number): number => {
  if (!Number.isFinite(subtotal)) return DEFAULT_SHIPPING_FEE;
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DEFAULT_SHIPPING_FEE;
};

export const formatPromotionPercentBadge = (promotionPercent?: unknown): string => {
  const p = normalizePromotionPercent(promotionPercent);
  return String(Math.round(p));
};
