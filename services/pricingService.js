export const DELIVERY_CHARGE = 120;

export const PROFIT_RATES = {
  producerBulkToSupersaler: 5,
  supersalerBulkToWholesaler: 2,
  retailToConsumer: 2,
};

const toNumber = (value) => {
  const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

export const calculateProfitPrice = (basePrice, ratePercent) => {
  const base = toNumber(basePrice);
  const rate = toNumber(ratePercent);
  const adminProfit = roundMoney((base * rate) / 100);
  const finalPrice = roundMoney(base + adminProfit);

  return {
    basePrice: roundMoney(base),
    adminProfit,
    profitRate: rate,
    finalPrice,
  };
};

export const buildPricingBreakdown = ({ basePrice, quantity = 1, ratePercent }) => {
  const unit = calculateProfitPrice(basePrice, ratePercent);
  const qty = Math.max(1, toNumber(quantity) || 1);
  const baseSubtotal = roundMoney(unit.basePrice * qty);
  const adminProfit = roundMoney(unit.adminProfit * qty);
  const subtotal = roundMoney(unit.finalPrice * qty);

  return {
    ...unit,
    quantity: qty,
    baseSubtotal,
    adminProfit,
    subtotal,
    deliveryFee: DELIVERY_CHARGE,
    totalAmount: roundMoney(subtotal + DELIVERY_CHARGE),
  };
};

export const applyPricingToProduct = (product = {}, ratePercent) => {
  const source = typeof product.toObject === "function" ? product.toObject() : { ...product };
  const effectiveRate = source.adminProfitRate ?? ratePercent;
  const pricing = calculateProfitPrice(source.price ?? source.pricePerKg ?? 0, effectiveRate);

  return {
    ...source,
    basePrice: pricing.basePrice,
    adminProfit: pricing.adminProfit,
    profitRate: pricing.profitRate,
    finalPrice: pricing.finalPrice,
    displayPrice: pricing.finalPrice,
    price: pricing.finalPrice,
  };
};

export const applyPricingToSellPost = (post = {}, ratePercent) => {
  const source = typeof post.toObject === "function" ? post.toObject() : { ...post };
  const basePrice =
    source.sellingPricePerKg ??
    source.pricePerUnit ??
    source.unitPrice ??
    source.product?.price ??
    0;
  const pricing = calculateProfitPrice(basePrice, ratePercent);

  return {
    ...source,
    basePrice: pricing.basePrice,
    adminProfit: pricing.adminProfit,
    profitRate: pricing.profitRate,
    finalPrice: pricing.finalPrice,
    displayPrice: pricing.finalPrice,
    pricePerUnit: pricing.finalPrice,
    unitPrice: pricing.finalPrice,
    sellingPricePerKg: pricing.finalPrice,
  };
};
