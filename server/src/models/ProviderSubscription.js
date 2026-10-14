import mongoose from 'mongoose';

const providerSubscriptionSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderProfile', required: true, unique: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
    startsAt: { type: Date, default: Date.now },
    endsAt: Date,
    source: { type: String, enum: ['admin_grant', 'payment', 'seed', 'free'], default: 'free' },
    amountPaise: { type: Number, default: 0, min: 0 },
    paymentRef: { type: String, default: '' },
    method: { type: String, default: '' },
  },
  { timestamps: true }
);

export const ProviderSubscription = mongoose.model('ProviderSubscription', providerSubscriptionSchema);
