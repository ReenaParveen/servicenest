import { body, param, query } from 'express-validator';

export const registerRules = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Enter your name.'),
  body('email').isEmail().withMessage('Enter a valid email.').normalizeEmail(),
  body('phone').matches(/^[6-9]\d{9}$/).withMessage('Enter a 10-digit mobile number.'),
  body('password')
    .isLength({ min: 8, max: 72 })
    .withMessage('Use at least 8 characters.')
    .matches(/[A-Za-z]/)
    .withMessage('Include a letter in your password.')
    .matches(/\d/)
    .withMessage('Include a number in your password.'),
  body('role').isIn(['customer', 'provider']).withMessage('Choose a customer or provider account.'),
  body('businessName').optional().trim().isLength({ min: 2, max: 120 }),
];

export const loginRules = [
  body('email').isEmail().withMessage('Enter a valid email.').normalizeEmail(),
  body('password').notEmpty().withMessage('Enter your password.'),
];

export const passwordRules = [
  body('currentPassword').notEmpty().withMessage('Enter your current password.'),
  body('newPassword')
    .isLength({ min: 8, max: 72 })
    .matches(/[A-Za-z]/)
    .matches(/\d/)
    .withMessage('Use at least 8 characters with a letter and a number.'),
];

export const profileRules = [
  body('name').optional().trim().isLength({ min: 2, max: 80 }),
  body('phone').optional().matches(/^[6-9]\d{9}$/).withMessage('Enter a 10-digit mobile number.'),
];

export const addressRules = [
  body('line1').trim().isLength({ min: 3, max: 160 }).withMessage('Enter the address.'),
  body('line2').optional().trim().isLength({ max: 160 }),
  body('city').trim().isLength({ min: 2, max: 80 }).withMessage('Enter the city.'),
  body('state').trim().isLength({ min: 2, max: 80 }).withMessage('Enter the state.'),
  body('pincode').trim().isLength({ min: 4, max: 12 }).withMessage('Enter the PIN code.'),
  body('label').optional().trim().isLength({ max: 40 }),
];

export const providerRules = [
  body('businessName').optional().trim().isLength({ min: 2, max: 120 }),
  body('bio').optional().isLength({ max: 2000 }),
  body('experienceYears').optional().isInt({ min: 0, max: 60 }),
  body('city').optional().trim().isLength({ max: 80 }),
  body('state').optional().trim().isLength({ max: 80 }),
  body('serviceRadiusKm').optional().isFloat({ min: 1, max: 100 }),
  body('whatsappNumber').optional().matches(/^$|^[6-9]\d{9}$/).withMessage('Enter a 10-digit WhatsApp number or leave it blank.'),
  body('categoryIds').optional().isArray({ max: 12 }),
  body('lat').optional({ nullable: true }).isFloat({ min: -90, max: 90 }),
  body('lng').optional({ nullable: true }).isFloat({ min: -180, max: 180 }),
];

export const listingRules = [
  body('categoryId').isMongoId().withMessage('Choose a category.'),
  body('title').trim().isLength({ min: 3, max: 120 }).withMessage('Enter a service title.'),
  body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Describe the service.'),
  body('pricePaise').isInt({ min: 100, max: 100000000 }).withMessage('Enter a price of at least ₹1.'),
  body('priceUnit').optional().isIn(['fixed', 'hourly', 'visit']),
  body('durationMinutes').optional().isInt({ min: 30, max: 480 }),
];

export const availabilityRules = [
  body('rules').isArray({ max: 14 }),
  body('rules.*.dayOfWeek').isInt({ min: 0, max: 6 }),
  body('rules.*.startTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body('rules.*.endTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/),
  body('rules.*.slotMinutes').optional().isInt({ min: 30, max: 240 }),
];

export const bookingRules = [
  body('listingId').isMongoId(),
  body('scheduledDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Choose a date.'),
  body('startTime').matches(/^([01]\d|2[0-3]):[0-5]\d$/).withMessage('Choose a time slot.'),
  body('issueDescription').trim().isLength({ min: 10, max: 2000 }).withMessage('Describe the issue in at least 10 characters.'),
  body('paymentMethod').isIn(['cod', 'razorpay', 'dev_simulator']),
  body('address.line1').trim().isLength({ min: 3, max: 160 }),
  body('address.city').trim().isLength({ min: 2, max: 80 }),
  body('address.state').trim().isLength({ min: 2, max: 80 }),
  body('address.pincode').trim().isLength({ min: 4, max: 12 }),
];

export const transitionRules = [
  body('toStatus').isIn(['accepted', 'rejected', 'in_progress', 'completed', 'cancelled']),
  body('note').optional().isLength({ max: 500 }),
  body('collectCash').optional().isBoolean(),
];

export const reviewRules = [
  body('bookingId').isMongoId(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().isLength({ max: 1000 }),
];

export const disputeRules = [
  body('bookingId').isMongoId(),
  body('reason').trim().isLength({ min: 3, max: 120 }),
  body('description').trim().isLength({ min: 10, max: 2000 }),
];

export const settingsRules = [
  body('platformName').optional().trim().isLength({ min: 2, max: 60 }),
  body('commissionRateBps').optional().isInt({ min: 0, max: 10000 }),
  body('taxRateBps').optional().isInt({ min: 0, max: 10000 }),
  body('codEnabled').optional().isBoolean(),
  body('supportEmail').optional({ values: 'falsy' }).isEmail(),
  body('supportPhone').optional().isLength({ max: 20 }),
  body('featuredPricePaise').optional().isInt({ min: 0 }),
  body('featuredDurationDays').optional().isInt({ min: 1, max: 365 }),
  body('reminderLeadHours').optional().isInt({ min: 1, max: 168 }),
];

export const idParam = [param('id').isMongoId()];
export const dateQuery = [query('date').matches(/^\d{4}-\d{2}-\d{2}$/)];
