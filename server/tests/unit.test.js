import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { calculateCommission, calculateTax, quoteAmounts } from '../src/utils/money.js';
import { generateSlots } from '../src/utils/slots.js';
import { confirmRazorpayPayment, verifyRazorpaySignature, verifyWebhookSignature } from '../src/utils/razorpay.js';
import { TRANSITIONS } from '../src/constants.js';
import { ApiError } from '../src/utils/apiError.js';

describe('commission math', () => {
  it('calculates a 10 percent commission on ₹800 in paise', () => {
    const result = calculateCommission(80000, 1000);
    assert.deepEqual(result, { commissionPaise: 8000, providerSharePaise: 72000 });
  });

  it('keeps tax separate from the provider share', () => {
    const quote = quoteAmounts(80000, { commissionRateBps: 1000, taxRateBps: 1800, currency: 'INR' });
    assert.equal(quote.platformFeePaise, 8000);
    assert.equal(quote.taxPaise, calculateTax(80000, 1800));
    assert.equal(quote.totalPaise, 80000 + quote.taxPaise);
    assert.equal(quote.providerSharePaise, 72000);
    assert.equal(quote.gatewayFeePaise, 0);
  });

  it('rejects non-integer money', () => {
    assert.throws(() => calculateCommission(10.5, 1000));
  });
});

describe('slots', () => {
  const rules = [{ dayOfWeek: 1, startTime: '09:00', endTime: '12:00', slotMinutes: 60, isActive: true }];

  it('hides booked and blocked slots', () => {
    const slots = generateSlots({
      weeklyRules: rules,
      date: '2026-10-19',
      blockedDates: [],
      busyStarts: ['10:00'],
    });
    assert.equal(slots.find((slot) => slot.startTime === '10:00').available, false);
    assert.equal(slots.find((slot) => slot.startTime === '09:00').available, true);
    assert.deepEqual(generateSlots({ weeklyRules: rules, date: '2026-10-19', blockedDates: ['2026-10-19'] }), []);
  });

  it('skips slots that already started today', () => {
    const slots = generateSlots({
      weeklyRules: rules,
      date: '2026-10-19',
      isToday: true,
      nowMinutes: 10 * 60,
    });
    assert.ok(slots.every((slot) => slot.startTime > '10:00'));
  });
});

describe('booking transitions', () => {
  it('lets a provider accept a pending booking and blocks customers from completing one', () => {
    assert.ok(TRANSITIONS.provider.pending.includes('accepted'));
    assert.equal(TRANSITIONS.customer.pending.includes('completed'), false);
    assert.equal(TRANSITIONS.provider.completed, undefined);
  });
});

describe('razorpay verification', () => {
  const secret = 'razorpay-test-secret';
  const orderId = 'order_test';
  const paymentId = 'pay_test';
  const signature = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

  it('accepts a valid signature and rejects a tampered one', () => {
    assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature, secret }), true);
    const bad = signature.replace(/.$/, signature.endsWith('a') ? 'b' : 'a');
    assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature: bad, secret }), false);
  });

  it('rejects a captured payment whose amount does not match', async () => {
    await assert.rejects(
      () => confirmRazorpayPayment({
        orderId,
        paymentId,
        signature,
        secret,
        expectedAmountPaise: 80000,
        fetchPayment: async () => ({ order_id: orderId, amount: 100, status: 'captured' }),
      }),
      (error) => error instanceof ApiError && error.status === 400
    );
  });

  it('verifies webhook signatures against the raw body', () => {
    const rawBody = Buffer.from('{"event":"payment.captured"}');
    const webhookSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    assert.equal(verifyWebhookSignature({ rawBody, signature: webhookSignature, secret }), true);
    assert.equal(verifyWebhookSignature({ rawBody, signature: 'nope', secret }), false);
  });
});
