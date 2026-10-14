import { asyncHandler, send } from '../utils/asyncHandler.js';
import {
  Booking,
  Commission,
  Dispute,
  Payment,
  Payout,
  ProviderProfile,
  ProviderSubscription,
  SubscriptionPlan,
  User,
} from '../models/index.js';
import { updateCategory, createCategory, listCategories } from '../services/catalogService.js';
import { getSettings, updateSettings } from '../services/platformService.js';
import { generatePayout, markPayoutPaid, refundPayment, reportRange } from '../services/financeService.js';
import { resolveDispute } from '../services/engagementService.js';
import { notifyUserId } from '../services/notificationService.js';
import { presentBooking, presentCategory, presentDispute, presentPayment, presentPayout, presentPlan, presentProviderPrivate, presentUser } from '../utils/presenters.js';
import { ApiError } from '../utils/apiError.js';
import { parsePage } from '../utils/pagination.js';
import { escapeRegex, slugify } from '../utils/text.js';

export const overview = asyncHandler(async (_req, res) => {
  const start = new Date();
  start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);
  const [
    customers,
    providers,
    verifiedProviders,
    pendingProviders,
    bookings,
    completedBookings,
    cancelledBookings,
    openDisputes,
    gross,
    commission,
    subscriptions,
    refunds,
    recent,
    queue,
    series,
  ] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    ProviderProfile.countDocuments(),
    ProviderProfile.countDocuments({ verificationStatus: 'approved' }),
    ProviderProfile.countDocuments({ verificationStatus: 'pending' }),
    Booking.countDocuments(),
    Booking.countDocuments({ status: 'completed' }),
    Booking.countDocuments({ status: { $in: ['cancelled', 'rejected'] } }),
    Dispute.countDocuments({ status: { $in: ['open', 'under_review'] } }),
    Commission.aggregate([
      { $match: { status: 'accrued' } },
      { $group: { _id: null, gross: { $sum: '$serviceAmountPaise' }, commission: { $sum: '$commissionPaise' } } },
    ]),
    Commission.aggregate([
      { $match: { status: 'accrued' } },
      { $group: { _id: null, commission: { $sum: '$commissionPaise' } } },
    ]),
    Payment.aggregate([
      { $match: { purpose: 'subscription', status: 'paid', method: { $ne: 'dev_simulator' } } },
      { $group: { _id: null, amount: { $sum: '$amountPaise' } } },
    ]),
    Payment.aggregate([
      { $match: { status: { $in: ['refunded', 'partially_refunded'] } } },
      { $group: { _id: null, amount: { $sum: '$refundPaise' } } },
    ]),
    Booking.find().sort({ createdAt: -1 }).limit(8).populate([
      { path: 'customer', select: 'name phone' },
      { path: 'provider' },
    ]),
    ProviderProfile.find({ verificationStatus: 'pending' }).sort({ createdAt: 1 }).limit(8).populate('user', 'name email phone'),
    Commission.aggregate([
      { $match: { status: 'accrued', createdAt: { $gte: start } } },
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
  ]);

  send(res, {
    customers,
    providers,
    verifiedProviders,
    pendingProviders,
    bookings,
    completedBookings,
    cancelledBookings,
    openDisputes,
    grossBookingPaise: gross[0]?.gross || 0,
    commissionPaise: commission[0]?.commission || 0,
    subscriptionPaise: subscriptions[0]?.amount || 0,
    refundPaise: refunds[0]?.amount || 0,
    recentBookings: recent.map((booking) => presentBooking(booking, { role: 'admin', _id: 'admin' })),
    approvalQueue: queue.map((provider) => ({
      id: provider._id,
      businessName: provider.businessName,
      city: provider.city,
      documentCount: provider.documents.length,
      ownerName: provider.user?.name,
      createdAt: provider.createdAt,
      isDemo: provider.isDemo,
    })),
    series: series.map((row) => ({
      date: row._id,
      grossPaise: row.grossPaise,
      commissionPaise: row.commissionPaise,
      bookings: row.bookings,
    })),
  });
});

export const reports = asyncHandler(async (req, res) => {
  const from = req.query.from || new Date(Date.now() - 29 * 86400000).toISOString();
  const to = req.query.to || new Date().toISOString();
  send(res, await reportRange(from, to));
});

export const users = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query, 20);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.q) {
    const safe = escapeRegex(String(req.query.q).slice(0, 80));
    filter.$or = [
      { name: new RegExp(safe, 'i') },
      { email: new RegExp(safe, 'i') },
    ];
  }
  const [rows, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: rows.map(presentUser),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 0 },
  });
});

export const setUserStatus = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    throw new ApiError(400, 'You cannot change your own account status.');
  }
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  user.isActive = Boolean(req.body.isActive);
  await user.save();
  send(res, presentUser(user));
});

export const providers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query, 20);
  const filter = {};
  if (req.query.status) filter.verificationStatus = req.query.status;
  const [rows, total] = await Promise.all([
    ProviderProfile.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('user', 'name email phone isActive').populate('categories', 'name slug icon description isActive sortOrder'),
    ProviderProfile.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: rows.map((provider) => ({
      ...presentProviderPrivate(provider, provider.user, null),
      owner: provider.user ? presentUser(provider.user) : null,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 0 },
  });
});

export const setVerification = asyncHandler(async (req, res) => {
  const provider = await ProviderProfile.findById(req.params.id).populate('user');
  if (!provider) throw new ApiError(404, 'Provider not found.');
  const { status, note } = req.body;
  if (!['approved', 'rejected', 'suspended', 'pending'].includes(status)) {
    throw new ApiError(422, 'Choose a valid verification status.');
  }
  if (['rejected', 'suspended'].includes(status) && String(note || '').trim().length < 3) {
    throw new ApiError(422, 'Add a note explaining this decision.');
  }
  if (status === 'approved' && provider.documents.length === 0) {
    throw new ApiError(400, 'This provider has not uploaded verification documents.');
  }
  provider.verificationStatus = status;
  provider.verificationNote = note || '';
  await provider.save();
  await notifyUserId(provider.user._id, {
    type: 'verification_decision',
    title: `Verification ${status}`,
    body: note || `Your provider profile is now ${status}.`,
    link: '/provider/verification',
    dedupeKey: `verification:${provider._id}:${status}:${Date.now()}`,
  });
  send(res, presentProviderPrivate(provider, provider.user, null));
});

export const setFeatured = asyncHandler(async (req, res) => {
  const provider = await ProviderProfile.findById(req.params.id);
  if (!provider) throw new ApiError(404, 'Provider not found.');
  const enabled = Boolean(req.body.enabled);
  const days = Number(req.body.days || 30);
  provider.isFeatured = enabled;
  provider.featuredUntil = enabled ? new Date(Date.now() + days * 86400000) : null;
  await provider.save();
  send(res, { id: provider._id, promoted: enabled, featuredUntil: provider.featuredUntil });
});

export const bookings = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePage(req.query, 20);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const [rows, total] = await Promise.all([
    Booking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate([
      { path: 'customer', select: 'name phone' },
      { path: 'provider' },
    ]),
    Booking.countDocuments(filter),
  ]);
  res.json({
    success: true,
    data: rows.map((booking) => presentBooking(booking, req.user)),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) || 0 },
  });
});

export const disputes = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const rows = await Dispute.find(filter).sort({ createdAt: -1 }).limit(100).populate('booking', 'reference');
  send(res, rows.map(presentDispute));
});

export const patchDispute = asyncHandler(async (req, res) => {
  const dispute = await resolveDispute(req.user, req.params.id, req.body);
  send(res, presentDispute(dispute));
});

export const getSettingsHandler = asyncHandler(async (_req, res) => {
  send(res, await getSettings());
});

export const patchSettings = asyncHandler(async (req, res) => {
  send(res, await updateSettings(req.body));
});

export const categories = asyncHandler(async (_req, res) => {
  const rows = await listCategories({ includeInactive: true });
  send(res, rows.map(presentCategory));
});

export const postCategoryHandler = asyncHandler(async (req, res) => {
  send(res, presentCategory(await createCategory(req.body)), 201);
});

export const patchCategoryHandler = asyncHandler(async (req, res) => {
  send(res, presentCategory(await updateCategory(req.params.id, req.body)));
});

export const plans = asyncHandler(async (_req, res) => {
  const rows = await SubscriptionPlan.find().sort({ sortOrder: 1 });
  send(res, rows.map(presentPlan));
});

export const postPlan = asyncHandler(async (req, res) => {
  const plan = await SubscriptionPlan.create({
    ...req.body,
    slug: slugify(req.body.slug || req.body.name),
  });
  send(res, presentPlan(plan), 201);
});

export const patchPlan = asyncHandler(async (req, res) => {
  const plan = await SubscriptionPlan.findById(req.params.id);
  if (!plan) throw new ApiError(404, 'Plan not found.');
  Object.assign(plan, req.body);
  if (req.body.name && !req.body.slug) plan.slug = slugify(req.body.name);
  await plan.save();
  send(res, presentPlan(plan));
});

export const assignSubscription = asyncHandler(async (req, res) => {
  const plan = await SubscriptionPlan.findById(req.body.planId);
  const provider = await ProviderProfile.findById(req.body.providerId);
  if (!plan || !provider) throw new ApiError(404, 'Provider or plan not found.');
  const endsAt = plan.pricePaiseMonthly > 0 ? new Date(Date.now() + 30 * 86400000) : null;
  const subscription = await ProviderSubscription.findOneAndUpdate(
    { provider: provider._id },
    { $set: { plan: plan._id, status: 'active', startsAt: new Date(), endsAt, source: 'admin_grant', amountPaise: 0, method: 'admin_grant' } },
    { upsert: true, new: true }
  ).populate('plan');
  send(res, subscription);
});

export const payouts = asyncHandler(async (_req, res) => {
  const rows = await Payout.find().sort({ createdAt: -1 }).limit(100).populate('provider', 'businessName');
  send(res, rows.map(presentPayout));
});

export const createPayout = asyncHandler(async (req, res) => {
  const payout = await generatePayout(req.body.providerId, req.user._id);
  send(res, presentPayout(payout), 201);
});

export const payPayout = asyncHandler(async (req, res) => {
  const payout = await markPayoutPaid(req.params.id, req.user._id, req.body.referenceNote);
  send(res, presentPayout(payout));
});

export const payments = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  const rows = await Payment.find(filter).sort({ createdAt: -1 }).limit(100);
  send(res, rows.map(presentPayment));
});

export const refund = asyncHandler(async (req, res) => {
  const payment = await refundPayment(req.params.id, req.user, req.body);
  send(res, presentPayment(payment));
});
