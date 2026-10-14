export function calculateCommission(serviceAmountPaise, rateBps) {
  if (!Number.isInteger(serviceAmountPaise) || serviceAmountPaise < 0) {
    throw new Error('Service amount must be a non-negative integer in paise.');
  }
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > 10000) {
    throw new Error('Commission rate must be an integer from 0 to 10000 basis points.');
  }
  const commissionPaise = Math.round((serviceAmountPaise * rateBps) / 10000);
  return {
    commissionPaise,
    providerSharePaise: serviceAmountPaise - commissionPaise,
  };
}

export function calculateTax(serviceAmountPaise, taxRateBps) {
  if (!Number.isInteger(serviceAmountPaise) || serviceAmountPaise < 0) {
    throw new Error('Service amount must be a non-negative integer in paise.');
  }
  if (!Number.isInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > 10000) {
    throw new Error('Tax rate must be an integer from 0 to 10000 basis points.');
  }
  return Math.round((serviceAmountPaise * taxRateBps) / 10000);
}

export function quoteAmounts(serviceAmountPaise, settings) {
  const { commissionPaise, providerSharePaise } = calculateCommission(serviceAmountPaise, settings.commissionRateBps);
  const taxPaise = calculateTax(serviceAmountPaise, settings.taxRateBps || 0);
  return {
    serviceAmountPaise,
    platformFeePaise: commissionPaise,
    taxPaise,
    totalPaise: serviceAmountPaise + taxPaise,
    providerSharePaise,
    commissionRateBps: settings.commissionRateBps,
    taxRateBps: settings.taxRateBps || 0,
    gatewayFeePaise: 0,
    currency: settings.currency || 'INR',
  };
}
