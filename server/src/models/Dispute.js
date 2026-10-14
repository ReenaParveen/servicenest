import mongoose from 'mongoose';

const disputeSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, maxlength: 120 },
    description: { type: String, required: true, maxlength: 2000 },
    status: { type: String, enum: ['open', 'under_review', 'resolved', 'rejected'], default: 'open' },
    resolution: { type: String, default: '', maxlength: 2000 },
    refundPaise: { type: Number, default: 0, min: 0 },
    adminNote: { type: String, default: '', maxlength: 1000 },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
  },
  { timestamps: true }
);

disputeSchema.index({ booking: 1 }, { name: 'booking_lookup' });
disputeSchema.index(
  { booking: 1 },
  {
    unique: true,
    name: 'one_open_dispute',
    partialFilterExpression: { status: { $in: ['open', 'under_review'] } },
  }
);

export const Dispute = mongoose.model('Dispute', disputeSchema);
