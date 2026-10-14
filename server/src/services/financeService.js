import { Booking, Commission, Payment, Payout, ProviderSubscription } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';
import { sessionOpts, withTxn } from '../config/db.js';
import { notifyUserId } from './notificationService.js';

export async function accrueCommission(booking) {
  if (!booking || booking.status !== 'completed' || booking.paymentStatus !== 'paid') return null;
  if (['refunded', 'partially_refunded'].includes(booking.paymentStatus)) return null;
  try {
    return await Commission.create({
      booking: booking._id,
      provider: booking.provider?._id || booking.provider,
      serviceAmountPaise: booking.serviceAmountPaise,
      rateBps: booking.commissionRateBps,
      commissionPaise: booking.platformFeePaise,
      providerSharePaise: booking.providerSharePaise,
      status: 'accrued',
    });
  } catch (error) {
    if (error.code === 11000) return Commission.findOne({ booking: booking._id });
    throw error;
  }
}

export async function markPaymentRecordPaid(payment, extra = {}) {
  return withTxn(async (session) => {
    const updated = await Payment.findOneAndUpdate(
      { _id: payment._id, status: { $in: ['pending', 'unpaid'] } },
      { $set: { status: 'paid', verifiedAt: new Date(), ...extra } },
      sessionOpts(session, { new: true })
    );
    if (!updated) {
      const existing = await Payment.findById(payment._id);
      if (existing?.status === 'paid') return { payment: existing, duplicate: true };
      throw new ApiError(409, 'This payment can no longer be completed.');
    }
    if (updated.booking) {
      await Booking.updateOne(
        { _id: updated.booking },
        { $set: { paymentStatus: 'paid' } },
        sessionOpts(session)
      );
    }
    return { payment: updated, duplicate: false };
  });
}

export async function earningsForProvider(providerId, { includeSeries = false } = {}) {
  const [groups, payouts, recent] = await Promise.all([
    Commission.aggregate([
      { $match: { provider: providerId } },
      {
        $group: {
          _id: '$status',
          gross: { $sum: '$serviceAmountPaise' },
          commission: { $sum: '$commissionPaise' },
          net: { $sum: '$providerSharePaise' },
          count: { $sum: 1 },
        },
      },
    ]),
    Payout.find({ provider: providerId }).sort({ createdAt: -1 }),
    Commission.find({ provider: providerId }).sort({ createdAt: -1 }).limit(20).populate('booking', 'reference scheduledDate serviceTitle'),
  ]);
  const accrued = groups.find((row) => row._id === 'accrued') || { gross: 0, commission: 0, net: 0, count: 0 };
  const pendingPayoutPaise = payouts.filter((row) => row.status === 'pending' || row.status === 'processing')
    .reduce((sum, row) => sum + row.netPaise, 0);
  const paidPayoutPaise = payouts.filter((row) => row.status === 'paid').reduce((sum, row) => sum + row.netPaise, 0);

  let series = [];
  if (includeSeries) {
    series = await Commission.aggregate([
      { $match: { provider: providerId, status: 'accrued' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
          netPaise: { $sum: '$providerSharePaise' },
          commissionPaise: { $sum: '$commissionPaise' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  return {
    grossPaise: accrued.gross,
    commissionPaise: accrued.commission,
    netPaise: accrued.net,
    completedJobs: accrued.count,
    pendingPayoutPaise,
    paidPayoutPaise,
    payouts,
    commissions: recent,
    series: series.map((row) => ({ date: row._id, netPaise: row.netPaise, commissionPaise: row.commissionPaise })),
  };
}

export async function providerSummary(user, provider, subscription) {
  const { formatDateInTz } = await import('../utils/dates.js');
  const { getSettings } = await import('./platformService.js');
  const { presentBooking } = await import('../utils/presenters.js');
  const settings = await getSettings();
  const today = formatDateInTz(new Date(), settings.timezone || 'Asia/Kolkata');
  const analyticsLevel = subscription?.status === 'active' ? subscription.plan?.analyticsLevel : 'basic';
  const [counts, todayBookings, pendingBookings, earnings] = await Promise.all([
    Booking.aggregate([
      { $match: { provider: provider._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Booking.find({ provider: provider._id, scheduledDate: today, status: { $in: ['pending', 'accepted', 'in_progress'] } })
      .sort({ startTime: 1 })
      .populate([
        { path: 'customer', select: 'name phone' },
        { path: 'provider' },
      ]),
    Booking.find({ provider: provider._id, status: 'pending' }).sort({ createdAt: -1 }).limit(8).populate([
      { path: 'customer', select: 'name phone' },
      { path: 'provider' },
    ]),
    earningsForProvider(provider._id, { includeSeries: analyticsLevel === 'advanced' }),
  ]);
  const countMap = Object.fromEntries(counts.map((row) => [row._id, row.count]));
  return {
    counts: {
      today: todayBookings.length,
      pending: countMap.pending || 0,
      accepted: countMap.accepted || 0,
      inProgress: countMap.in_progress || 0,
      completed: countMap.completed || 0,
      cancelled: (countMap.cancelled || 0) + (countMap.rejected || 0),
    },
    todayBookings: todayBookings.map((booking) => presentBooking(booking, user)),
    pendingBookings: pendingBookings.map((booking) => presentBooking(booking, user)),
    earnings: {
      grossPaise: earnings.grossPaise,
      commissionPaise: earnings.commissionPaise,
      netPaise: earnings.netPaise,
      pendingPayoutPaise: earnings.pendingPayoutPaise,
      paidPayoutPaise: earnings.paidPayoutPaise,
      series: earnings.series,
      analyticsLevel,
    },
  };
}

export async function generatePayout(providerId, adminId) {
  const payout = await Payout.create({
    provider: providerId,
    grossPaise: 0,
    commissionPaise: 0,
    netPaise: 0,
    status: 'pending',
    createdBy: adminId,
  });
  const result = await Commission.updateMany(
    { provider: providerId, status: 'accrued', payout: null },
    { $set: { payout: payout._id } }
  );
  if (!result.modifiedCount) {
    await payout.deleteOne();
    throw new ApiError(400, 'No unpaid earnings are waiting for a payout.');
  }
  const rows = await Commission.find({ payout: payout._id });
  payout.grossPaise = rows.reduce((sum, row) => sum + row.serviceAmountPaise, 0);
  payout.commissionPaise = rows.reduce((sum, row) => sum + row.commissionPaise, 0);
  payout.netPaise = rows.reduce((sum, row) => sum + row.providerSharePaise, 0);
  payout.commissionIds = rows.map((row) => row._id);
  await payout.save();
  return payout;
}

export async function markPayoutPaid(payoutId, adminId, referenceNote) {
  const payout = await Payout.findById(payoutId);
  if (!payout) throw new ApiError(404, 'Payout not found.');
  if (payout.status === 'paid') return payout;
  payout.status = 'paid';
  payout.paidAt = new Date();
  payout.referenceNote = referenceNote || '';
  payout.createdBy = payout.createdBy || adminId;
  await payout.save();
  const provider = payout.provider;
  const { ProviderProfile } = await import('../models/index.js');
  const profile = await ProviderProfile.findById(provider);
  if (profile) {
    await notifyUserId(profile.user, {
      type: 'payment_update',
      title: 'Payout marked paid',
      body: 'An administrator marked a payout as paid. Check your earnings page for the reference.',
      link: '/provider/earnings',
      dedupeKey: `payout_paid:${payout._id}`,
    });
  }
  return payout;
}

export async function refundPayment(paymentId, admin, { amountPaise, reason }) {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new ApiError(404, 'Payment not found.');
  if (payment.status !== 'paid' && payment.status !== 'partially_refunded') {
    throw new ApiError(409, 'Only a collected payment can be refunded.');
  }
  const remaining = payment.amountPaise - (payment.refundPaise || 0);
  const refundPaise = amountPaise || remaining;
  if (!Number.isInteger(refundPaise) || refundPaise <= 0 || refundPaise > remaining) {
    throw new ApiError(422, 'Enter a refund amount that does not exceed the amount still collected.');
  }
  payment.refundPaise = (payment.refundPaise || 0) + refundPaise;
  payment.refundReason = reason || '';
  payment.refundedAt = new Date();
  payment.status = payment.refundPaise >= payment.amountPaise ? 'refunded' : 'partially_refunded';
  await payment.save();

  if (payment.booking) {
    const booking = await Booking.findById(payment.booking);
    if (booking) {
      booking.paymentStatus = payment.status;
      if (!['completed', 'cancelled', 'rejected'].includes(booking.status)) {
        booking.status = 'cancelled';
        booking.cancellation = {
          requestedBy: admin._id,
          requestedByRole: 'admin',
          reason: reason || 'Refunded',
          at: new Date(),
        };
        booking.statusHistory.push({ status: 'cancelled', at: new Date(), by: admin._id, note: 'Refunded by administrator.' });
      }
      await booking.save();
      await Commission.updateOne({ booking: booking._id, status: 'accrued' }, { $set: { status: 'reversed' } });
      await notifyUserId(booking.customer, {
        type: 'payment_update',
        title: 'Refund recorded',
        body: `A refund of the collected amount was recorded for ${booking.reference}.`,
        link: `/dashboard/bookings/${booking._id}`,
        dedupeKey: `refund:${payment._id}:${payment.refundPaise}`,
      });
    }
  }
  if (payment.purpose === 'subscription') {
    await ProviderSubscription.updateOne({ provider: payment.provider }, { $set: { status: 'cancelled' } });
  }
  return payment;
}

export async function reportRange(from, to) {
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ApiError(422, 'Enter a valid date range.');
  }
  end.setHours(23, 59, 59, 999);
  const created = { $gte: start, $lte: end };

  const [commissionSeries, bookingCounts, refunds, subscriptions, statusCounts] = await Promise.all([
    Commission.aggregate([
      { $match: { status: 'accrued', createdAt: created } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
          grossPaise: { $sum: '$serviceAmountPaise' },
          commissionPaise: { $sum: '$commissionPaise' },
          bookings: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Booking.countDocuments({ createdAt: created }),
    Payment.aggregate([
      { $match: { status: { $in: ['refunded', 'partially_refunded'] }, refundedAt: created } },
      { $group: { _id: null, refundPaise: { $sum: '$refundPaise' }, count: { $sum: 1 } } },
    ]),
    Payment.aggregate([
      { $match: { purpose: 'subscription', status: 'paid', verifiedAt: created, method: { $ne: 'dev_simulator' } } },
      { $group: { _id: null, amountPaise: { $sum: '$amountPaise' }, count: { $sum: 1 } } },
    ]),
    Booking.aggregate([
      { $match: { createdAt: created } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const grossPaise = commissionSeries.reduce((sum, row) => sum + row.grossPaise, 0);
  const commissionPaise = commissionSeries.reduce((sum, row) => sum + row.commissionPaise, 0);
  return {
    from: start.toISOString(),
    to: end.toISOString(),
    grossBookingPaise: grossPaise,
    commissionPaise,
    subscriptionPaise: subscriptions[0]?.amountPaise || 0,
    subscriptionCount: subscriptions[0]?.count || 0,
    refundPaise: refunds[0]?.refundPaise || 0,
    refundCount: refunds[0]?.count || 0,
    bookingsCreated: bookingCounts,
    statuses: Object.fromEntries(statusCounts.map((row) => [row._id, row.count])),
    series: commissionSeries.map((row) => ({
      date: row._id,
      grossPaise: row.grossPaise,
      commissionPaise: row.commissionPaise,
      bookings: row.bookings,
    })),
  };
}
