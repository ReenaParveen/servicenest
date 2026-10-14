import { asyncHandler, send } from '../utils/asyncHandler.js';
import {
  createRazorpayOrder,
  handleRazorpayWebhook,
  selectFreePlan,
  simulateDevPayment,
  verifyRazorpayCheckout,
} from '../services/paymentService.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { presentPlan } from '../utils/presenters.js';

export const plans = asyncHandler(async (_req, res) => {
  const rows = await SubscriptionPlan.find({ isActive: true }).sort({ sortOrder: 1 });
  send(res, rows.map(presentPlan));
});

export const razorpayOrder = asyncHandler(async (req, res) => {
  send(res, await createRazorpayOrder({ user: req.user, ...req.body }));
});

export const verify = asyncHandler(async (req, res) => {
  const result = await verifyRazorpayCheckout({ user: req.user, ...req.body });
  send(res, { paid: true, duplicate: Boolean(result.duplicate) });
});

export const devSimulate = asyncHandler(async (req, res) => {
  const result = await simulateDevPayment({ user: req.user, ...req.body });
  send(res, {
    paid: true,
    duplicate: Boolean(result.duplicate),
    mode: 'development',
    notice: 'Development payment simulator. No real charge was made.',
  });
});

export const webhook = asyncHandler(async (req, res) => {
  const signature = req.get('x-razorpay-signature');
  const result = await handleRazorpayWebhook(req.body, signature);
  send(res, result);
});

export const freePlan = asyncHandler(async (req, res) => {
  const subscription = await selectFreePlan(req.user);
  send(res, subscription);
});
