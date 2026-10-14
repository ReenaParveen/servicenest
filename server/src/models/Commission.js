import mongoose from 'mongoose';

const commissionSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'ProviderProfile', required: true, index: true },
    serviceAmountPaise: { type: Number, required: true, min: 0 },
    rateBps: { type: Number, required: true },
    commissionPaise: { type: Number, required: true, min: 0 },
    providerSharePaise: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['accrued', 'reversed'], default: 'accrued' },
    payout: { type: mongoose.Schema.Types.ObjectId, ref: 'Payout', default: null },
  },
  { timestamps: true }
);

commissionSchema.index({ provider: 1, status: 1, payout: 1 });

export const Commission = mongoose.model('Commission', commissionSchema);
