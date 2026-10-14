import { describe, expect, it } from 'vitest';
import { hasErrors, validateBookingDetails, validateRegister } from './validation';
import { formatINR, rupeesToPaise } from './money';
import { buildWhatsAppLink } from './whatsapp';

describe('customer and provider form validation', () => {
  it('requires a valid customer registration', () => {
    const errors = validateRegister({ name: 'A', email: 'bad', phone: '123', password: 'short', role: 'customer' });
    expect(hasErrors(errors)).toBe(true);
    expect(validateRegister({
      name: 'Asha Demo',
      email: 'asha@example.com',
      phone: '9000000001',
      password: 'Secret123',
      role: 'provider',
      businessName: 'Demo Co',
    })).toEqual({});
  });

  it('blocks an incomplete booking', () => {
    const errors = validateBookingDetails({
      scheduledDate: '',
      startTime: '',
      address: { line1: '', city: '', state: '', pincode: '' },
      issueDescription: 'short',
      paymentMethod: 'cod',
    });
    expect(errors.scheduledDate).toBeTruthy();
    expect(errors.issueDescription).toBeTruthy();
    expect(errors.line1).toBeTruthy();
  });
});

describe('display helpers', () => {
  it('formats paise as rupees and builds a WhatsApp link without sending a message', () => {
    expect(rupeesToPaise('800')).toBe(80000);
    expect(formatINR(80000)).toContain('800');
    const link = buildWhatsAppLink('9000000002', 'Booking SN-1');
    expect(link.startsWith('https://wa.me/919000000002?text=')).toBe(true);
    expect(decodeURIComponent(link.split('text=')[1])).toBe('Booking SN-1');
  });
});
