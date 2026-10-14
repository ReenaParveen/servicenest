import crypto from 'crypto';
import { ApiError } from './apiError.js';

export function verifyRazorpaySignature({ orderId, paymentId, signature, secret }) {
  if (!orderId || !paymentId || !signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  const actual = Buffer.from(String(signature));
  const known = Buffer.from(expected);
  if (actual.length !== known.length) return false;
  return crypto.timingSafeEqual(actual, known);
}

export function verifyWebhookSignature({ rawBody, signature, secret }) {
  if (!rawBody || !signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const actual = Buffer.from(String(signature));
  const known = Buffer.from(expected);
  if (actual.length !== known.length) return false;
  return crypto.timingSafeEqual(actual, known);
}

export async function confirmRazorpayPayment({
  orderId,
  paymentId,
  signature,
  secret,
  expectedAmountPaise,
  fetchPayment,
}) {
  if (!verifyRazorpaySignature({ orderId, paymentId, signature, secret })) {
    throw new ApiError(400, 'Payment verification failed.');
  }
  const remote = await fetchPayment();
  if (!remote || remote.order_id !== orderId || Number(remote.amount) !== expectedAmountPaise) {
    throw new ApiError(400, 'Payment amount does not match this order.');
  }
  if (!['captured', 'authorized'].includes(remote.status)) {
    throw new ApiError(400, 'Payment was not captured.');
  }
  return { amountPaise: Number(remote.amount) };
}
