import mongoose from 'mongoose';

const availabilitySlotSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderProfile', required: true, index: true },
    kind: { type: String, enum: ['weekly', 'block'], required: true },
    dayOfWeek: { type: Number, min: 0, max: 6 },
    date: { type: String },
    startTime: { type: String, default: '09:00' },
    endTime: { type: String, default: '17:00' },
    slotMinutes: { type: Number, default: 60, min: 30, max: 240 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

availabilitySlotSchema.index({ provider: 1, kind: 1, dayOfWeek: 1 });
availabilitySlotSchema.index({ provider: 1, kind: 1, date: 1 });

export const AvailabilitySlot = mongoose.model('AvailabilitySlot', availabilitySlotSchema);
