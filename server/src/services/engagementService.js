import { Dispute, Review, ProviderProfile, Booking } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';
import { loadBooking, assertBookingAccess } from './bookingService.js';
import { notifyUserId } from './notificationService.js';
import { getProviderByUser } from './authService.js';
import { parsePage } from '../utils/pagination.js';

export async function createReview(user, { bookingId, rating, comment }) {
  const booking = await loadBooking(bookingId);
  if (String(booking.customer._id) !== String(user._id)) throw new ApiError(403, 'Only the customer can review this booking.');
  if (booking.status !== 'completed') throw new ApiError(409, 'Reviews are available after the job is completed.');
  const existing = await Review.findOne({ booking: booking._id });
  if (existing) throw new ApiError(409, 'This booking already has a review.');
  const review = await Review.create({
    booking: booking._id,
    customer: user._id,
    provider: booking.provider._id,
    rating: Number(rating),
    comment: comment || '',
  });
  await refreshRating(booking.provider._id);
  await notifyUserId(booking.provider.user._id || booking.provider.user, {
    type: 'review_received',
    title: 'New customer review',
    body: `You received a ${rating}-star review for ${booking.reference}.`,
    link: '/provider/reviews',
    dedupeKey: `review:${review._id}`,
  });
  return review;
}

export async function respondToReview(user, reviewId, response) {
  const provider = await getProviderByUser(user._id);
  const review = await Review.findOne({ _id: reviewId, provider: provider._id });
  if (!review) throw new ApiError(404, 'Review not found.');
  if (review.providerResponse) throw new ApiError(409, 'You already responded to this review.');
  review.providerResponse = response.trim();
  review.providerRespondedAt = new Date();
  await review.save();
  return review;
}

async function refreshRating(providerId) {
  const rows = await Review.aggregate([
    { $match: { provider: providerId } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avg = rows[0] ? Math.round(rows[0].avg * 10) / 10 : 0;
  const count = rows[0]?.count || 0;
  await ProviderProfile.updateOne({ _id: providerId }, { $set: { ratingAvg: avg, ratingCount: count } });
}

export async function reviewsForProvider(providerId, query) {
  const { page, limit, skip } = parsePage(query, 8);
  const [items, total] = await Promise.all([
    Review.find({ provider: providerId }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('customer', 'name isDemo'),
    Review.countDocuments({ provider: providerId }),
  ]);
  return { items, total, page, limit };
}

export async function recentReviews() {
  return Review.find().sort({ createdAt: -1 }).limit(6).populate('customer', 'name isDemo').populate('provider', 'businessName isDemo');
}

export async function createDispute(user, { bookingId, reason, description }) {
  const booking = await loadBooking(bookingId);
  assertBookingAccess(booking, user);
  if (user.role === 'admin') throw new ApiError(400, 'Administrators resolve disputes from the admin dashboard.');
  if (!['completed', 'cancelled'].includes(booking.status)) {
    throw new ApiError(409, 'Disputes can be raised after a job is completed or cancelled.');
  }
  try {
    const dispute = await Dispute.create({
      booking: booking._id,
      raisedBy: user._id,
      reason: reason.trim(),
      description: description.trim(),
    });
    const providerUserId = booking.provider.user._id || booking.provider.user;
    const recipient = String(user._id) === String(booking.customer._id) ? providerUserId : booking.customer._id;
    await notifyUserId(recipient, {
      type: 'dispute_update',
      title: 'A dispute was opened',
      body: `A dispute was opened for ${booking.reference}.`,
      link: user.role === 'customer' ? `/provider/jobs/${booking._id}` : `/dashboard/bookings/${booking._id}`,
      dedupeKey: `dispute_open:${dispute._id}:${recipient}`,
    });
    return dispute;
  } catch (error) {
    if (error.code === 11000) throw new ApiError(409, 'This booking already has an open dispute.');
    throw error;
  }
}

export async function myDisputes(user) {
  const bookingFilter = user.role === 'customer'
    ? { customer: user._id }
    : { provider: (await getProviderByUser(user._id))._id };
  const bookings = await Booking.find(bookingFilter).select('_id');
  return Dispute.find({ booking: { $in: bookings.map((booking) => booking._id) } })
    .sort({ createdAt: -1 })
    .populate('booking', 'reference');
}

export async function resolveDispute(admin, disputeId, { status, resolution, refundPaise, adminNote }) {
  const dispute = await Dispute.findById(disputeId).populate('booking');
  if (!dispute) throw new ApiError(404, 'Dispute not found.');
  if (!['under_review', 'resolved', 'rejected', 'open'].includes(status)) {
    throw new ApiError(422, 'Choose a valid dispute status.');
  }
  dispute.status = status === 'open' ? 'under_review' : status;
  if (resolution !== undefined) dispute.resolution = resolution;
  if (adminNote !== undefined) dispute.adminNote = adminNote;
  if (refundPaise !== undefined) dispute.refundPaise = refundPaise;
  if (['resolved', 'rejected'].includes(dispute.status)) {
    dispute.resolvedAt = new Date();
    dispute.resolvedBy = admin._id;
  }
  await dispute.save();
  const booking = dispute.booking;
  if (booking) {
    await notifyUserId(booking.customer, {
      type: 'dispute_update',
      title: 'Dispute updated',
      body: `The dispute for ${booking.reference} is now ${dispute.status.replaceAll('_', ' ')}.`,
      link: `/dashboard/bookings/${booking._id}`,
      dedupeKey: `dispute:${dispute._id}:${dispute.status}:customer`,
    });
  }
  return dispute;
}
