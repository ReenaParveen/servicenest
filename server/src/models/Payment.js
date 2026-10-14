import mongoose from 'mongoose';
import { PAYMENT_METHODS, PAYMENT_PURPOSES, PAYMENT_STATUSES } from '../constants.js';

const paymentSchema = new mongoose.Schema(
  {
    purpose: { type: String, enum: PAYMENT_PURPOSES, required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderProfile' },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
    amountPaise: { type: Number, required: true, min: 0 },
    method: { type: String, enum: PAYMENT_METHODS, required: true },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'pending' },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    idempotencyKey: { type: String },
    verifiedAt: Date,
    refundPaise: { type: Number, default: 0, min: 0 },
    refundReason: { type: String, default: '' },
    refundedAt: Date,
  },
  { timestamps: true }
);

paymentSchema.index({ booking: 1 });
paymentSchema.index({ provider: 1, createdAt: -1 });
paymentSchema.index({ razorpayOrderId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ razorpayPaymentId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

export const Payment = mongoose.model('Payment', paymentSchema);
