import Razorpay from 'razorpay';
import { Booking, Payment, ProviderProfile, SubscriptionPlan } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';
import { confirmRazorpayPayment, verifyWebhookSignature } from '../utils/razorpay.js';
import { paymentsMode, razorpayConfigured } from '../config/env.js';
import { getSettings } from './platformService.js';
import { accrueCommission, markPaymentRecordPaid } from './financeService.js';
import { loadBooking } from './bookingService.js';
import { notifyUserId } from './notificationService.js';
import { getProviderByUser } from './authService.js';
import { ProviderSubscription } from '../models/ProviderSubscription.js';

function razorpayClient() {
  if (!razorpayConfigured()) throw new ApiError(503, 'Online payments are not configured.');
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

async function fetchRazorpayPayment(paymentId) {
  const client = razorpayClient();
  return client.payments.fetch(paymentId);
}

export async function createRazorpayOrder({ user, purpose, bookingId, planId }) {
  if (paymentsMode() !== 'razorpay') throw new ApiError(503, 'Online payments are not configured.');
  const intent = await createPaymentIntent({ user, purpose, bookingId, planId, method: 'razorpay' });
  if (intent.razorpayOrderId) {
    return {
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: intent.razorpayOrderId,
      amountPaise: intent.amountPaise,
      paymentId: intent._id,
      purpose,
    };
  }
  const client = razorpayClient();
  const order = await client.orders.create({
    amount: intent.amountPaise,
    currency: 'INR',
    receipt: String(intent._id),
    payment_capture: 1,
  });
  intent.razorpayOrderId = order.id;
  await intent.save();
  return {
    keyId: process.env.RAZORPAY_KEY_ID,
    orderId: order.id,
    amountPaise: intent.amountPaise,
    paymentId: intent._id,
    purpose,
  };
}

async function createPaymentIntent({ user, purpose, bookingId, planId, method }) {
  if (purpose === 'booking') {
    const booking = await loadBooking(bookingId);
    if (String(booking.customer._id || booking.customer) !== String(user._id) && user.role !== 'admin') {
      throw new ApiError(403, 'You cannot pay for this booking.');
    }
    if (booking.paymentStatus === 'paid') throw new ApiError(409, 'This booking is already paid.');
    if (['cancelled', 'rejected'].includes(booking.status)) throw new ApiError(409, 'This booking can no longer be paid.');
    if (booking.paymentMethod !== 'razorpay') {
      throw new ApiError(400, 'This booking is not using an online payment.');
    }
    const existing = await Payment.findOne({ booking: booking._id, purpose: 'booking', status: { $in: ['pending', 'unpaid'] } });
    if (existing) return existing;
    return Payment.create({
      purpose: 'booking',
      booking: booking._id,
      customer: booking.customer._id || booking.customer,
      provider: booking.provider._id || booking.provider,
      amountPaise: booking.totalPaise,
      method,
      status: 'pending',
    });
  }

  const provider = await getProviderByUser(user._id);
  const settings = await getSettings();
  if (purpose === 'subscription') {
    const plan = await SubscriptionPlan.findOne({ _id: planId, isActive: true });
    if (!plan) throw new ApiError(404, 'Plan not found.');
    if (plan.pricePaiseMonthly === 0) throw new ApiError(400, 'The free plan does not need a payment.');
    const current = await ProviderSubscription.findOne({ provider: provider._id }).populate('plan');
    if (current?.status === 'active' && String(current.plan?._id || current.plan) === String(plan._id) && current.endsAt > new Date()) {
      throw new ApiError(409, 'This plan is already active.');
    }
    return Payment.create({
      purpose: 'subscription',
      provider: provider._id,
      customer: user._id,
      plan: plan._id,
      amountPaise: plan.pricePaiseMonthly,
      method,
      status: 'pending',
    });
  }
  if (purpose === 'featured') {
    const subscription = await ProviderSubscription.findOne({ provider: provider._id, status: 'active' }).populate('plan');
    if (!subscription?.plan?.featuredEligible) {
      throw new ApiError(403, 'Your current plan does not include promoted placement.');
    }
    if (provider.isFeatured && provider.featuredUntil > new Date()) {
      throw new ApiError(409, 'A promoted placement is already active.');
    }
    return Payment.create({
      purpose: 'featured',
      provider: provider._id,
      customer: user._id,
      amountPaise: settings.featuredPricePaise,
      method,
      status: 'pending',
    });
  }
  throw new ApiError(422, 'Unknown payment purpose.');
}

export async function verifyRazorpayCheckout({ user, purpose, bookingId, planId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  if (!razorpayConfigured()) throw new ApiError(503, 'Online payments are not configured.');
  const payment = await Payment.findOne({ razorpayOrderId });
  if (!payment) throw new ApiError(404, 'Payment order not found.');
  await assertIntentOwner(user, payment);
  if (payment.status === 'paid') return { duplicate: true, payment };

  await confirmRazorpayPayment({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
    secret: process.env.RAZORPAY_KEY_SECRET,
    expectedAmountPaise: payment.amountPaise,
    fetchPayment: () => fetchRazorpayPayment(razorpayPaymentId),
  });

  const existingPaymentId = await Payment.findOne({ razorpayPaymentId, _id: { $ne: payment._id } });
  if (existingPaymentId) throw new ApiError(409, 'This payment was already used.');
  payment.razorpayPaymentId = razorpayPaymentId;
  await payment.save();
  const result = await markPaymentRecordPaid(payment, { razorpayPaymentId });
  if (!result.duplicate) await applyPaidSideEffects(result.payment);
  return result;
}

async function assertIntentOwner(user, payment) {
  if (user.role === 'admin') return;
  if (payment.customer && String(payment.customer) === String(user._id)) return;
  if (payment.booking) {
    const booking = await Booking.findById(payment.booking);
    if (booking && String(booking.customer) === String(user._id)) return;
  }
  throw new ApiError(403, 'You cannot verify this payment.');
}

export async function simulateDevPayment({ user, purpose, bookingId, planId }) {
  if (paymentsMode() !== 'development') {
    throw new ApiError(403, 'The development payment simulator is disabled.');
  }
  if (purpose === 'booking') {
    const booking = await loadBooking(bookingId);
    if (String(booking.customer._id) !== String(user._id)) throw new ApiError(403, 'You cannot pay for this booking.');
    if (booking.paymentMethod !== 'dev_simulator') {
      throw new ApiError(400, 'This booking was not created with the development payment simulator.');
    }
    let payment = await Payment.findOne({ booking: booking._id, purpose: 'booking' });
    if (payment?.status === 'paid') return { duplicate: true, payment, booking };
    if (!payment) {
      payment = await Payment.create({
        purpose: 'booking',
        booking: booking._id,
        customer: user._id,
        provider: booking.provider._id,
        amountPaise: booking.totalPaise,
        method: 'dev_simulator',
        status: 'pending',
        idempotencyKey: `dev:booking:${booking._id}`,
      });
    }
    const result = await markPaymentRecordPaid(payment);
    if (!result.duplicate) await applyPaidSideEffects(result.payment);
    return { ...result, booking: await loadBooking(booking._id) };
  }

  const intent = await createPaymentIntent({ user, purpose, planId, method: 'dev_simulator' });
  intent.method = 'dev_simulator';
  intent.idempotencyKey = `dev:${purpose}:${intent._id}`;
  await intent.save();
  const result = await markPaymentRecordPaid(intent);
  if (!result.duplicate) await applyPaidSideEffects(result.payment);
  return result;
}

export async function applyPaidSideEffects(payment) {
  if (payment.purpose === 'booking' && payment.booking) {
    const booking = await loadBooking(payment.booking);
    await accrueCommission(booking);
    await notifyUserId(booking.customer._id, {
      type: 'payment_update',
      title: 'Payment received',
      body: `Payment for ${booking.reference} was recorded. No further action is needed unless the status changes.`,
      link: `/dashboard/bookings/${booking._id}`,
      dedupeKey: `payment_paid:${booking._id}:customer`,
    });
    if (booking.provider?.user) {
      await notifyUserId(booking.provider.user._id || booking.provider.user, {
        type: 'payment_update',
        title: 'Customer payment recorded',
        body: `Payment for ${booking.reference} is marked paid.`,
        link: `/provider/jobs/${booking._id}`,
        dedupeKey: `payment_paid:${booking._id}:provider`,
      });
    }
    return;
  }
  if (payment.purpose === 'subscription') {
    await activateSubscription(payment);
  }
  if (payment.purpose === 'featured') {
    await activateFeatured(payment);
  }
}

export async function activateSubscription(payment) {
  const settings = await getSettings();
  const plan = await SubscriptionPlan.findById(payment.plan);
  if (!plan) return;
  const endsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await ProviderSubscription.findOneAndUpdate(
    { provider: payment.provider },
    {
      $set: {
        plan: plan._id,
        status: 'active',
        startsAt: new Date(),
        endsAt,
        source: payment.method === 'dev_simulator' ? 'payment' : 'payment',
        amountPaise: payment.amountPaise,
        paymentRef: String(payment._id),
        method: payment.method,
      },
    },
    { upsert: true }
  );
  const provider = await ProviderProfile.findById(payment.provider);
  if (provider) {
    await notifyUserId(provider.user, {
      type: 'payment_update',
      title: 'Subscription active',
      body: `${plan.name} is active until ${endsAt.toDateString()}. Recurring autopay is not enabled in this version.`,
      link: '/provider/subscription',
      dedupeKey: `subscription:${payment._id}`,
    });
  }
  return settings;
}

export async function activateFeatured(payment) {
  const settings = await getSettings();
  const provider = await ProviderProfile.findById(payment.provider);
  if (!provider) return;
  const until = new Date(Date.now() + (settings.featuredDurationDays || 30) * 24 * 60 * 60 * 1000);
  provider.isFeatured = true;
  provider.featuredUntil = until;
  await provider.save();
  await notifyUserId(provider.user, {
    type: 'payment_update',
    title: 'Promoted placement active',
    body: `Your listing is labelled Promoted until ${until.toDateString()}. This does not change verification status.`,
    link: '/provider',
    dedupeKey: `featured:${payment._id}`,
  });
}

export async function selectFreePlan(user) {
  const provider = await getProviderByUser(user._id);
  const plan = await SubscriptionPlan.findOne({ slug: 'free', isActive: true });
  if (!plan) throw new ApiError(404, 'The free plan is not configured.');
  await ProviderSubscription.findOneAndUpdate(
    { provider: provider._id },
    {
      $set: {
        plan: plan._id,
        status: 'active',
        startsAt: new Date(),
        endsAt: null,
        source: 'free',
        amountPaise: 0,
        method: '',
      },
    },
    { upsert: true }
  );
  return ProviderSubscription.findOne({ provider: provider._id }).populate('plan');
}

export async function handleRazorpayWebhook(rawBody, signature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new ApiError(503, 'Webhook secret is not configured.');
  if (!verifyWebhookSignature({ rawBody, signature, secret })) {
    throw new ApiError(400, 'Webhook signature verification failed.');
  }
  const event = JSON.parse(rawBody.toString('utf8'));
  if (event.event !== 'payment.captured') return { ignored: true };
  const entity = event.payload?.payment?.entity;
  if (!entity?.order_id || !entity?.id) return { ignored: true };
  const payment = await Payment.findOne({ razorpayOrderId: entity.order_id });
  if (!payment) return { ignored: true };
  if (Number(entity.amount) !== payment.amountPaise) {
    throw new ApiError(400, 'Webhook amount does not match the stored order.');
  }
  if (payment.status === 'paid') return { duplicate: true };
  const duplicateId = await Payment.findOne({ razorpayPaymentId: entity.id, _id: { $ne: payment._id } });
  if (duplicateId) return { duplicate: true };
  payment.razorpayPaymentId = entity.id;
  await payment.save();
  const result = await markPaymentRecordPaid(payment, { razorpayPaymentId: entity.id });
  if (!result.duplicate) await applyPaidSideEffects(result.payment);
  return { duplicate: result.duplicate };
}
