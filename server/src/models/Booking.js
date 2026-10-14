import mongoose from 'mongoose';
import { BOOKING_STATUSES, BUSY_BOOKING_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from '../constants.js';

const historySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, default: Date.now },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, default: '', maxlength: 500 },
  },
  { _id: false }
);

const photoSchema = new mongoose.Schema(
  {
    originalName: String,
    storedName: { type: String, required: true },
    mimeType: String,
    size: Number,
  },
  { _id: true }
);

const addressSchema = new mongoose.Schema(
  {
    line1: String,
    line2: String,
    city: String,
    state: String,
    pincode: String,
    lat: Number,
    lng: Number,
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderProfile', required: true, index: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceListing', required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory' },
    serviceTitle: { type: String, required: true },
    categoryName: { type: String, default: '' },
    providerName: { type: String, default: '' },
    scheduledDate: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    serviceAddress: addressSchema,
    issueDescription: { type: String, required: true, maxlength: 2000 },
    photos: { type: [photoSchema], default: [] },
    status: { type: String, enum: BOOKING_STATUSES, default: 'pending', index: true },
    statusHistory: { type: [historySchema], default: [] },
    serviceAmountPaise: { type: Number, required: true, min: 0 },
    platformFeePaise: { type: Number, required: true, min: 0 },
    taxPaise: { type: Number, required: true, min: 0 },
    gatewayFeePaise: { type: Number, default: 0, min: 0 },
    totalPaise: { type: Number, required: true, min: 0 },
    commissionRateBps: { type: Number, required: true },
    providerSharePaise: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid' },
    cancellation: {
      requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      requestedByRole: String,
      reason: { type: String, default: '' },
      at: Date,
    },
  },
  { timestamps: true }
);

bookingSchema.index({ customer: 1, createdAt: -1 });
bookingSchema.index({ provider: 1, scheduledDate: 1, status: 1 });
bookingSchema.index(
  { provider: 1, scheduledDate: 1, startTime: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: BUSY_BOOKING_STATUSES } },
  }
);

export const Booking = mongoose.model('Booking', bookingSchema);
