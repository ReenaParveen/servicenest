export function formatINR(paise) {
  const rupees = (Number(paise) || 0) / 100;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(rupees);
}

export function rupeesToPaise(value) {
  if (value === '' || value === null || value === undefined) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * 100);
}
