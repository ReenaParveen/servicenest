import { asyncHandler, send } from '../utils/asyncHandler.js';
import {
  createDispute,
  createReview,
  myDisputes,
  recentReviews,
  respondToReview,
} from '../services/engagementService.js';
import { listNotifications, markAllRead, markNotificationRead } from '../services/notificationService.js';
import { presentDispute, presentNotification, presentReview } from '../utils/presenters.js';
import { Review } from '../models/Review.js';

export const postReview = asyncHandler(async (req, res) => {
  const review = await createReview(req.user, req.body);
  const populated = await Review.findById(review._id).populate('customer', 'name isDemo');
  send(res, presentReview(populated), 201);
});

export const postResponse = asyncHandler(async (req, res) => {
  const review = await respondToReview(req.user, req.params.id, req.body.response || '');
  const populated = await Review.findById(review._id).populate('customer', 'name isDemo');
  send(res, presentReview(populated));
});

export const homeReviews = asyncHandler(async (_req, res) => {
  const rows = await recentReviews();
  send(res, rows.map((review) => ({
    ...presentReview(review),
    providerName: review.provider?.businessName || '',
  })));
});

export const postDispute = asyncHandler(async (req, res) => {
  const dispute = await createDispute(req.user, req.body);
  send(res, presentDispute(dispute), 201);
});

export const listMine = asyncHandler(async (req, res) => {
  const rows = await myDisputes(req.user);
  send(res, rows.map(presentDispute));
});

export const notifications = asyncHandler(async (req, res) => {
  const rows = await listNotifications(req.user._id);
  send(res, rows.map(presentNotification));
});

export const readOne = asyncHandler(async (req, res) => {
  const row = await markNotificationRead(req.user._id, req.params.id);
  send(res, row ? presentNotification(row) : null);
});

export const readAll = asyncHandler(async (req, res) => {
  await markAllRead(req.user._id);
  send(res, { updated: true });
});
