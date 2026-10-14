import mongoose from 'mongoose';

const platformSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    platformName: { type: String, default: 'ServiceNest' },
    commissionRateBps: { type: Number, default: 1000, min: 0, max: 10000 },
    currency: { type: String, default: 'INR' },
    supportEmail: { type: String, default: '' },
    supportPhone: { type: String, default: '' },
    codEnabled: { type: Boolean, default: true },
    taxRateBps: { type: Number, default: 0, min: 0, max: 10000 },
    timezone: { type: String, default: 'Asia/Kolkata' },
    reminderLeadHours: { type: Number, default: 24, min: 1, max: 168 },
    featuredPricePaise: { type: Number, default: 49900, min: 0 },
    featuredDurationDays: { type: Number, default: 30, min: 1, max: 365 },
  },
  { timestamps: true }
);

export const PlatformSettings = mongoose.model('PlatformSettings', platformSettingsSchema);
