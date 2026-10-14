export function buildWhatsAppLink(phone, message) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`;
}
