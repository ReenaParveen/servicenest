import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'Home', trim: true, maxlength: 40 },
    line1: { type: String, required: true, trim: true, maxlength: 160 },
    line2: { type: String, default: '', trim: true, maxlength: 160 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    state: { type: String, required: true, trim: true, maxlength: 80 },
    pincode: { type: String, required: true, trim: true, maxlength: 12 },
    lat: Number,
    lng: Number,
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const customerProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    addresses: { type: [addressSchema], default: [] },
  },
  { timestamps: true }
);

export const CustomerProfile = mongoose.model('CustomerProfile', customerProfileSchema);
