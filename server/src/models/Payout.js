import mongoose from 'mongoose';

const payoutSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderProfile', required: true, index: true },
    grossPaise: { type: Number, required: true, min: 0 },
    commissionPaise: { type: Number, required: true, min: 0 },
    netPaise: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'processing', 'paid', 'failed'], default: 'pending' },
    commissionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Commission' }],
    paidAt: Date,
    referenceNote: { type: String, default: '', maxlength: 200 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Payout = mongoose.model('Payout', payoutSchema);
