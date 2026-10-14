import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true, maxlength: 140 },
    body: { type: String, required: true, maxlength: 500 },
    link: { type: String, default: '' },
    readAt: Date,
    emailStatus: { type: String, enum: ['pending', 'sent', 'skipped', 'failed'], default: 'skipped' },
    dedupeKey: { type: String },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

export const Notification = mongoose.model('Notification', notificationSchema);
