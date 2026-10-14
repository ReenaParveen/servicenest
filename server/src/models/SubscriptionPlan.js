import mongoose from 'mongoose';
import { PLAN_TIERS } from '../constants.js';

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    tier: { type: String, enum: PLAN_TIERS, required: true },
    pricePaiseMonthly: { type: Number, required: true, min: 0 },
    maxActiveListings: { type: Number, required: true, min: 1 },
    featuredEligible: { type: Boolean, default: false },
    analyticsLevel: { type: String, enum: ['basic', 'advanced'], default: 'basic' },
    isActive: { type: Boolean, default: true },
    features: { type: [String], default: [] },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
