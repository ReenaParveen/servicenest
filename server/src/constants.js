export const ROLES = ['customer', 'provider', 'admin'];
export const BOOKING_STATUSES = ['pending', 'accepted', 'in_progress', 'completed', 'rejected', 'cancelled'];
export const BUSY_BOOKING_STATUSES = ['pending', 'accepted', 'in_progress', 'completed'];
export const CONTACT_OPEN_STATUSES = ['accepted', 'in_progress', 'completed'];
export const PAYMENT_STATUSES = ['unpaid', 'pending', 'paid', 'failed', 'refunded', 'partially_refunded'];
export const PAYMENT_METHODS = ['cod', 'razorpay', 'dev_simulator'];
export const PAYMENT_PURPOSES = ['booking', 'subscription', 'featured'];
export const VERIFICATION_STATUSES = ['pending', 'approved', 'rejected', 'suspended'];
export const PRICE_UNITS = ['fixed', 'hourly', 'visit'];
export const PLAN_TIERS = ['free', 'basic', 'premium'];
export const DOC_TYPES = ['id_proof', 'address_proof', 'license', 'other'];

export const TRANSITIONS = {
  customer: {
    pending: ['cancelled'],
    accepted: ['cancelled'],
  },
  provider: {
    pending: ['accepted', 'rejected'],
    accepted: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
  },
  admin: {
    pending: ['cancelled'],
    accepted: ['cancelled'],
    in_progress: ['cancelled'],
  },
};
