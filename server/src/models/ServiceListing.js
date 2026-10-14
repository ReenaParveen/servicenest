import mongoose from 'mongoose';
import { PRICE_UNITS } from '../constants.js';

const serviceListingSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderProfile', required: true, index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory', required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    pricePaise: { type: Number, required: true, min: 100, max: 100000000 },
    priceUnit: { type: String, enum: PRICE_UNITS, default: 'visit' },
    durationMinutes: { type: Number, default: 60, min: 30, max: 480 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

serviceListingSchema.index({ provider: 1, isActive: 1 });
serviceListingSchema.index({ category: 1, isActive: 1, pricePaise: 1 });

export const ServiceListing = mongoose.model('ServiceListing', serviceListingSchema);
