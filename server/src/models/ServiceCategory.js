import mongoose from 'mongoose';

const serviceCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: '', maxlength: 300 },
    icon: { type: String, default: 'Handyman' },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ServiceCategory = mongoose.model('ServiceCategory', serviceCategorySchema);
