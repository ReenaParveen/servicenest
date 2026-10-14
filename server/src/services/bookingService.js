import {
  Booking,
  Payment,
  ProviderProfile,
  Review,
  Dispute,
  ServiceListing,
  CustomerProfile,
} from '../models/index.js';
import { ApiError } from '../utils/apiError.js';
import { quoteAmounts } from '../utils/money.js';
import { isDateString } from '../utils/dates.js';
import { makeBookingReference } from '../utils/text.js';
import { getSettings } from './platformService.js';
import { slotsForDate } from './providerService.js';
import { getCustomerByUser, getProviderByUser } from './authService.js';
import { notifyBookingParties, notifyUserId } from './notificationService.js';
import { accrueCommission } from './financeService.js';
import { parsePage } from '../utils/pagination.js';
import { presentBooking } from '../utils/presenters.js';
import { TRANSITIONS, BUSY_BOOKING_STATUSES } from '../constants.js';
import { paymentsMode } from '../config/env.js';
import { addDays, formatDateInTz } from '../utils/dates.js';
import { assertFileSignature, removeFileQuietly } from '../utils/files.js';
import path from 'path';

const POPULATE = [
  { path: 'customer', select: 'name phone email isDemo' },
  { path: 'provider', populate: { path: 'user', select: 'name phone' } },
  { path: 'listing', select: 'title priceUnit' },
  { path: 'category', select: 'name' },
];

export async function quoteListing(listingId) {
  const listing = await ServiceListing.findOne({ _id: listingId, isActive: true }).populate('category');
  if (!listing) throw new ApiError(404, 'Service listing not found.');
  const provider = await ProviderProfile.findById(listing.provider);
  if (!provider || provider.verificationStatus !== 'approved') {
    throw new ApiError(400, 'This provider is not available for booking.');
  }
  const settings = await getSettings();
  return {
    listingId: listing._id,
    title: listing.title,
    priceUnit: listing.priceUnit,
    providerName: provider.businessName,
    ...quoteAmounts(listing.pricePaise, settings),
  };
}

function assertPaymentMethod(method, settings) {
  const mode = paymentsMode();
  if (method === 'cod') {
    if (settings.codEnabled === false) throw new ApiError(400, 'Cash after service is not available.');
    return;
  }
  if (method === 'dev_simulator') {
    if (mode !== 'development') throw new ApiError(403, 'The development payment simulator is not available.');
    return;
  }
  if (method === 'razorpay') {
    if (mode !== 'razorpay') throw new ApiError(503, 'Online payments are not configured.');
    return;
  }
  throw new ApiError(422, 'Choose a payment method.');
}

export async function releaseStalePaymentHolds() {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000);
  const stale = await Booking.find({
    paymentMethod: { $in: ['razorpay', 'dev_simulator'] },
    paymentStatus: { $in: ['pending', 'unpaid'] },
    status: 'pending',
    createdAt: { $lt: cutoff },
  });
  for (const booking of stale) {
    booking.status = 'cancelled';
    booking.cancellation = {
      reason: 'Payment was not completed in time.',
      at: new Date(),
    };
    booking.statusHistory.push({ status: 'cancelled', at: new Date(), note: 'Unpaid booking released.' });
    await booking.save();
    await Payment.updateMany(
      { booking: booking._id, status: { $in: ['pending', 'unpaid'] } },
      { $set: { status: 'failed' } }
    );
  }
  return stale.length;
}

export async function addBookingPhotos(user, bookingId, files) {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found.');
  if (String(booking.customer) !== String(user._id)) throw new ApiError(403, 'You cannot update this booking.');
  if (booking.status !== 'pending') throw new ApiError(409, 'Photos can only be added while the request is pending.');
  if ((booking.photos?.length || 0) + files.length > 4) {
    for (const file of files) await removeFileQuietly(file.path);
    throw new ApiError(400, 'You can attach up to 4 photos.');
  }
  await attachPhotos(booking, files);
  return getBookingForUser(user, booking._id);
}

export async function createBooking(user, payload) {
  await releaseStalePaymentHolds();
  const customerProfile = await getCustomerByUser(user._id);
  const listing = await ServiceListing.findOne({ _id: payload.listingId, isActive: true }).populate('category');
  if (!listing) throw new ApiError(404, 'Service listing not found.');
  const provider = await ProviderProfile.findById(listing.provider);
  if (!provider || provider.verificationStatus !== 'approved') {
    throw new ApiError(400, 'This provider is not currently accepting bookings.');
  }
  if (!isDateString(payload.scheduledDate)) throw new ApiError(422, 'Choose a valid date.');

  const settings = await getSettings();
  assertPaymentMethod(payload.paymentMethod, settings);
  const slots = await slotsForDate(provider._id, payload.scheduledDate);
  const slot = slots.find((item) => item.startTime === payload.startTime && item.available);
  if (!slot) throw new ApiError(409, 'That time slot is not available.');

  const address = payload.address || {};
  if (!address.line1 || !address.city || !address.state || !address.pincode) {
    throw new ApiError(422, 'Enter the full service address.');
  }
  if (payload.saveAddress) {
    if (customerProfile.addresses.length >= 8) {
      throw new ApiError(400, 'You can save up to 8 addresses.');
    }
    if (payload.address.isDefault) {
      customerProfile.addresses.forEach((item) => {
        item.isDefault = false;
      });
    }
    customerProfile.addresses.push({
      label: address.label || 'Home',
      line1: address.line1,
      line2: address.line2 || '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      lat: address.lat,
      lng: address.lng,
      isDefault: Boolean(address.isDefault) || customerProfile.addresses.length === 0,
    });
    await customerProfile.save();
  }

  const amounts = quoteAmounts(listing.pricePaise, settings);
  const today = formatDateInTz(new Date(), settings.timezone || 'Asia/Kolkata');
  let booking;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      booking = await Booking.create({
        reference: makeBookingReference(today),
        customer: user._id,
        provider: provider._id,
        listing: listing._id,
        category: listing.category?._id,
        serviceTitle: listing.title,
        categoryName: listing.category?.name || '',
        providerName: provider.businessName,
        scheduledDate: payload.scheduledDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
        serviceAddress: {
          line1: address.line1.trim(),
          line2: address.line2?.trim() || '',
          city: address.city.trim(),
          state: address.state.trim(),
          pincode: address.pincode.trim(),
          lat: address.lat,
          lng: address.lng,
        },
        issueDescription: payload.issueDescription.trim(),
        status: 'pending',
        statusHistory: [{ status: 'pending', at: new Date(), by: user._id, note: 'Booking requested.' }],
        ...amounts,
        paymentMethod: payload.paymentMethod,
        paymentStatus: payload.paymentMethod === 'cod' ? 'unpaid' : 'pending',
      });
      break;
    } catch (error) {
      if (error.code === 11000 && String(error.message).includes('reference') && attempt < 2) continue;
      if (error.code === 11000) throw new ApiError(409, 'That time slot was just booked. Choose another slot.');
      throw error;
    }
  }

  await Payment.create({
    purpose: 'booking',
    booking: booking._id,
    customer: user._id,
    provider: provider._id,
    amountPaise: booking.totalPaise,
    method: payload.paymentMethod,
    status: payload.paymentMethod === 'cod' ? 'unpaid' : 'pending',
    idempotencyKey: `${payload.paymentMethod}:${booking._id}`,
  });

  const populated = await loadBooking(booking._id);
  await notifyBookingParties(populated, {
    type: 'booking_created',
    customerTitle: 'Booking requested',
    providerTitle: 'New booking request',
    customerBody: `Your request ${populated.reference} for ${populated.serviceTitle} was sent.`,
    providerBody: `New request ${populated.reference} for ${populated.serviceTitle} on ${populated.scheduledDate} at ${populated.startTime}.`,
  });
  return populated;
}

async function attachPhotos(booking, files) {
  const photos = [];
  for (const file of files) {
    try {
      await assertFileSignature(file.path, file.mimetype);
      photos.push({
        originalName: String(file.originalname || 'photo').slice(0, 140),
        storedName: path.basename(file.filename),
        mimeType: file.mimetype,
        size: file.size,
      });
    } catch (error) {
      await removeFileQuietly(file.path);
      throw error;
    }
  }
  booking.photos.push(...photos);
  await booking.save();
}

export async function loadBooking(id) {
  const booking = await Booking.findById(id).populate(POPULATE);
  if (!booking) throw new ApiError(404, 'Booking not found.');
  const [review, dispute] = await Promise.all([
    Review.findOne({ booking: booking._id }).select('rating'),
    Dispute.findOne({ booking: booking._id }).sort({ createdAt: -1 }).select('status reason'),
  ]);
  booking.reviewSummary = review ? { id: review._id, rating: review.rating } : null;
  booking.disputeSummary = dispute ? { id: dispute._id, status: dispute.status, reason: dispute.reason } : null;
  return booking;
}

export function assertBookingAccess(booking, user) {
  const customerId = booking.customer?._id || booking.customer;
  const providerUserId = booking.provider?.user?._id || booking.provider?.user;
  const allowed = user.role === 'admin'
    || String(customerId) === String(user._id)
    || (providerUserId && String(providerUserId) === String(user._id));
  if (!allowed) throw new ApiError(403, 'You do not have access to this booking.');
}

export async function getBookingForUser(user, id) {
  const booking = await loadBooking(id);
  assertBookingAccess(booking, user);
  return presentBooking(booking, user);
}

export async function listBookings(user, query) {
  const { page, limit, skip } = parsePage(query, 10);
  const filter = {};
  if (user.role === 'customer') filter.customer = user._id;
  else if (user.role === 'provider') {
    const provider = await getProviderByUser(user._id);
    filter.provider = provider._id;
  } else if (user.role !== 'admin') throw new ApiError(403, 'You do not have access to these bookings.');

  if (query.status) filter.status = query.status;
  if (query.when === 'today') {
    const settings = await getSettings();
    filter.scheduledDate = formatDateInTz(new Date(), settings.timezone || 'Asia/Kolkata');
  }
  const [rows, total] = await Promise.all([
    Booking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate(POPULATE),
    Booking.countDocuments(filter),
  ]);
  return {
    items: rows.map((booking) => presentBooking(booking, user)),
    total,
    page,
    limit,
  };
}

export async function transitionBooking(user, bookingId, { toStatus, note = '', collectCash = false }) {
  const booking = await loadBooking(bookingId);
  assertBookingAccess(booking, user);
  const allowed = TRANSITIONS[user.role]?.[booking.status] || [];
  if (!allowed.includes(toStatus)) {
    throw new ApiError(403, 'You cannot move this booking to that status.');
  }
  if (['cancelled', 'rejected'].includes(toStatus) && String(note).trim().length < 3) {
    throw new ApiError(422, 'Add a short reason.');
  }
  if (toStatus === 'accepted') {
    if (booking.provider.verificationStatus !== 'approved') {
      throw new ApiError(403, 'Only verified providers can accept bookings.');
    }
    if (booking.paymentMethod !== 'cod' && booking.paymentStatus !== 'paid') {
      throw new ApiError(409, 'Online payment must be completed before this booking can be accepted.');
    }
  }

  booking.status = toStatus;
  booking.statusHistory.push({ status: toStatus, at: new Date(), by: user._id, note: note || '' });
  if (['cancelled', 'rejected'].includes(toStatus)) {
    booking.cancellation = {
      requestedBy: user._id,
      requestedByRole: user.role,
      reason: note.trim(),
      at: new Date(),
    };
  }
  await booking.save();

  if (toStatus === 'completed' && collectCash) {
    await collectCashForBooking(user, booking._id);
  } else if (toStatus === 'completed') {
    const fresh = await loadBooking(booking._id);
    await accrueCommission(fresh);
  }

  const updated = await loadBooking(booking._id);
  const labels = {
    accepted: ['Booking accepted', 'You accepted a booking'],
    rejected: ['Booking declined', 'You declined a booking'],
    in_progress: ['Job started', 'Job marked in progress'],
    completed: ['Job completed', 'Job marked completed'],
    cancelled: ['Booking cancelled', 'Booking cancelled'],
  };
  const [customerTitle, providerTitle] = labels[toStatus] || ['Booking updated', 'Booking updated'];
  await notifyBookingParties(updated, {
    type: `booking_${toStatus}`,
    customerTitle,
    providerTitle,
    customerBody: `${updated.reference} is now ${toStatus.replaceAll('_', ' ')}.`,
    providerBody: `${updated.reference} is now ${toStatus.replaceAll('_', ' ')}.`,
  });
  return presentBooking(updated, user);
}

export async function collectCashForBooking(user, bookingId) {
  const booking = await loadBooking(bookingId);
  assertBookingAccess(booking, user);
  if (user.role !== 'provider' && user.role !== 'admin') {
    throw new ApiError(403, 'Only the assigned provider can confirm cash collection.');
  }
  if (booking.paymentMethod !== 'cod') throw new ApiError(400, 'This booking is not a cash payment.');
  if (!['in_progress', 'completed'].includes(booking.status)) {
    throw new ApiError(409, 'Cash can be confirmed once the job is in progress or completed.');
  }
  const payment = await Payment.findOneAndUpdate(
    { booking: booking._id, method: 'cod', status: 'unpaid' },
    { $set: { status: 'paid', verifiedAt: new Date() } },
    { new: true }
  );
  if (!payment) {
    const existing = await Payment.findOne({ booking: booking._id, method: 'cod', status: 'paid' });
    if (!existing) throw new ApiError(409, 'Cash collection could not be recorded.');
  } else {
    booking.paymentStatus = 'paid';
    await booking.save();
    await notifyUserId(booking.customer._id, {
      type: 'payment_update',
      title: 'Cash payment recorded',
      body: `Cash collection was recorded for ${booking.reference}.`,
      link: `/dashboard/bookings/${booking._id}`,
      dedupeKey: `payment_paid:${booking._id}:customer`,
    });
  }
  const fresh = await loadBooking(booking._id);
  await accrueCommission(fresh);
  return presentBooking(await loadBooking(booking._id), user);
}

export async function customerSummary(user) {
  const profile = await getCustomerByUser(user._id);
  const settings = await getSettings();
  const today = formatDateInTz(new Date(), settings.timezone || 'Asia/Kolkata');
  const bookings = await Booking.find({ customer: user._id }).sort({ scheduledDate: 1, startTime: 1 }).populate(POPULATE);
  const upcoming = bookings.filter((booking) => ['pending', 'accepted', 'in_progress'].includes(booking.status) && booking.scheduledDate >= today);
  return {
    addresses: profile.addresses,
    counts: {
      upcoming: upcoming.length,
      completed: bookings.filter((booking) => booking.status === 'completed').length,
      cancelled: bookings.filter((booking) => booking.status === 'cancelled' || booking.status === 'rejected').length,
    },
    upcoming: upcoming.slice(0, 5).map((booking) => presentBooking(booking, user)),
    recent: [...bookings].reverse().slice(0, 6).map((booking) => presentBooking(booking, user)),
  };
}

export async function saveAddress(user, address) {
  const profile = await getCustomerByUser(user._id);
  if (profile.addresses.length >= 8) throw new ApiError(400, 'You can save up to 8 addresses.');
  if (address.isDefault) profile.addresses.forEach((item) => { item.isDefault = false; });
  profile.addresses.push({
    label: address.label || 'Home',
    line1: address.line1,
    line2: address.line2 || '',
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    lat: address.lat,
    lng: address.lng,
    isDefault: Boolean(address.isDefault) || profile.addresses.length === 0,
  });
  await profile.save();
  return profile;
}

export async function updateAddress(user, addressId, patch) {
  const profile = await getCustomerByUser(user._id);
  const address = profile.addresses.id(addressId);
  if (!address) throw new ApiError(404, 'Address not found.');
  ['label', 'line1', 'line2', 'city', 'state', 'pincode'].forEach((key) => {
    if (patch[key] !== undefined) address[key] = patch[key];
  });
  if (patch.lat !== undefined) address.lat = patch.lat;
  if (patch.lng !== undefined) address.lng = patch.lng;
  if (patch.isDefault) {
    profile.addresses.forEach((item) => { item.isDefault = false; });
    address.isDefault = true;
  }
  await profile.save();
  return profile;
}

export async function deleteAddress(user, addressId) {
  const profile = await getCustomerByUser(user._id);
  const address = profile.addresses.id(addressId);
  if (!address) throw new ApiError(404, 'Address not found.');
  address.deleteOne();
  if (!profile.addresses.some((item) => item.isDefault) && profile.addresses[0]) {
    profile.addresses[0].isDefault = true;
  }
  await profile.save();
  return profile;
}

export function bookingWindow() {
  return addDays;
}

export { BUSY_BOOKING_STATUSES };
