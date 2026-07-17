export const formatCurrency = (val) => {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(val);
};

export const formatShopifyCurrency = (val, currencyCode = 'USD') => {
  if (val === undefined || val === null || isNaN(val)) {
    val = 0;
  }
  const curr = (currencyCode || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: 2
    }).format(val);
  } catch (err) {
    return `${curr} ${parseFloat(val).toFixed(2)}`;
  }
};

export const formatCompact = (val) => {
  if (val === undefined || val === null || isNaN(val)) return '0';
  return new Intl.NumberFormat('en-IN', { notation: 'compact', compactDisplay: 'short' }).format(val);
};
