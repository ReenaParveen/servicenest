import mongoose from 'mongoose';
import { DOC_TYPES, VERIFICATION_STATUSES } from '../constants.js';

const documentSchema = new mongoose.Schema(
  {
    docType: { type: String, enum: DOC_TYPES, required: true },
    originalName: { type: String, required: true, maxlength: 140 },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const portfolioSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    storedName: { type: String, required: true },
    caption: { type: String, default: '', maxlength: 140 },
  },
  { _id: true }
);

const providerProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, required: true, trim: true, maxlength: 120 },
    bio: { type: String, default: '', maxlength: 2000 },
    experienceYears: { type: Number, default: 0, min: 0, max: 60 },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory' }],
    city: { type: String, default: '', trim: true, maxlength: 80 },
    state: { type: String, default: '', trim: true, maxlength: 80 },
    serviceRadiusKm: { type: Number, default: 10, min: 1, max: 100 },
    location: {
      type: { type: String, enum: ['Point'] },
      coordinates: { type: [Number] },
    },
    verificationStatus: { type: String, enum: VERIFICATION_STATUSES, default: 'pending', index: true },
    verificationNote: { type: String, default: '', maxlength: 500 },
    documents: { type: [documentSchema], default: [] },
    isFeatured: { type: Boolean, default: false },
    featuredUntil: Date,
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    portfolio: { type: [portfolioSchema], default: [] },
    whatsappNumber: { type: String, default: '' },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

providerProfileSchema.index({ location: '2dsphere' });
providerProfileSchema.index({ verificationStatus: 1, city: 1 });
providerProfileSchema.index({ categories: 1 });
providerProfileSchema.index({ isFeatured: 1, featuredUntil: 1 });

export const ProviderProfile = mongoose.model('ProviderProfile', providerProfileSchema);
