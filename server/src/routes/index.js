import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { handleValidation } from '../middleware/validate.js';
import { bookingPhotoUpload, documentUpload, portfolioUpload } from '../middleware/upload.js';
import {
  addressRules,
  availabilityRules,
  bookingRules,
  dateQuery,
  disputeRules,
  listingRules,
  loginRules,
  passwordRules,
  profileRules,
  providerRules,
  registerRules,
  reviewRules,
  settingsRules,
  transitionRules,
} from '../middleware/validators.js';
import * as auth from '../controllers/authController.js';
import * as catalog from '../controllers/catalogController.js';
import * as provider from '../controllers/providerController.js';
import * as booking from '../controllers/bookingController.js';
import * as payment from '../controllers/paymentController.js';
import * as engagement from '../controllers/engagementController.js';
import * as admin from '../controllers/adminController.js';
import { publicConfig } from '../services/platformService.js';
import { searchPlaces } from '../services/geoService.js';
import { asyncHandler, send } from '../utils/asyncHandler.js';
import { body } from 'express-validator';

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, message: 'Too many attempts. Please try again later.' },
});
const geoLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, message: 'Too many location searches. Please wait a moment.' },
});

router.get('/health', (_req, res) => send(res, { status: 'ok' }));
router.get('/config/public', asyncHandler(async (_req, res) => send(res, await publicConfig())));
router.get('/geo/search', geoLimiter, asyncHandler(async (req, res) => send(res, await searchPlaces(req.query.q))));

router.post('/auth/register', authLimiter, registerRules, handleValidation, auth.register);
router.post('/auth/login', authLimiter, loginRules, handleValidation, auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', requireAuth, auth.me);
router.patch('/auth/profile', requireAuth, profileRules, handleValidation, auth.updateProfile);
router.patch('/auth/password', requireAuth, passwordRules, handleValidation, auth.updatePassword);

router.get('/categories', catalog.getCategories);
router.get('/plans', payment.plans);
router.get('/providers/search', provider.searchProvidersHandler);
router.get('/providers/featured', provider.featured);
router.get('/providers/me', requireAuth, requireRole('provider'), provider.myProfile);
router.get('/providers/:id/slots', dateQuery, handleValidation, provider.slots);
router.get('/providers/:id/reviews', provider.providerReviews);
router.get('/providers/:id', provider.publicProfile);
router.get('/listings', catalog.getListings);
router.get('/reviews/recent', engagement.homeReviews);

router.get('/customers/me', requireAuth, requireRole('customer'), booking.me);
router.get('/customers/me/summary', requireAuth, requireRole('customer'), booking.summary);
router.post('/customers/me/addresses', requireAuth, requireRole('customer'), addressRules, handleValidation, booking.postAddress);
router.patch('/customers/me/addresses/:addressId', requireAuth, requireRole('customer'), booking.patchAddress);
router.delete('/customers/me/addresses/:addressId', requireAuth, requireRole('customer'), booking.removeAddress);

router.patch('/providers/me', requireAuth, requireRole('provider'), providerRules, handleValidation, provider.patchMe);
router.get('/providers/me/summary', requireAuth, requireRole('provider'), provider.summary);
router.get('/providers/me/earnings', requireAuth, requireRole('provider'), provider.earnings);
router.get('/providers/me/listings', requireAuth, requireRole('provider'), catalog.getMyListings);
router.get('/providers/me/availability', requireAuth, requireRole('provider'), provider.getMyAvailability);
router.put('/providers/me/availability', requireAuth, requireRole('provider'), availabilityRules, handleValidation, provider.putAvailability);
router.post('/providers/me/availability/blocks', requireAuth, requireRole('provider'), body('date').matches(/^\d{4}-\d{2}-\d{2}$/), handleValidation, provider.postBlock);
router.delete('/providers/me/availability/blocks/:blockId', requireAuth, requireRole('provider'), provider.deleteBlock);
router.post('/providers/me/documents', requireAuth, requireRole('provider'), documentUpload, provider.postDocument);
router.delete('/providers/me/documents/:docId', requireAuth, requireRole('provider'), provider.deleteDocument);
router.get('/providers/documents/:docId', requireAuth, provider.downloadDocument);
router.post('/providers/me/portfolio', requireAuth, requireRole('provider'), portfolioUpload, provider.postPortfolio);
router.delete('/providers/me/portfolio/:imageId', requireAuth, requireRole('provider'), provider.deletePortfolio);
router.get('/providers/me/reviews', requireAuth, requireRole('provider'), provider.myReviews);
router.post('/providers/me/subscription/free', requireAuth, requireRole('provider'), payment.freePlan);

router.post('/listings', requireAuth, requireRole('provider'), listingRules, handleValidation, catalog.postListing);
router.patch('/listings/:id', requireAuth, requireRole('provider'), catalog.patchListing);

router.post('/bookings/quote', requireAuth, body('listingId').isMongoId(), handleValidation, booking.quote);
router.post('/bookings', requireAuth, requireRole('customer'), bookingRules, handleValidation, booking.create);
router.get('/bookings', requireAuth, booking.list);
router.get('/bookings/:id', requireAuth, booking.detail);
router.post('/bookings/:id/photos', requireAuth, requireRole('customer'), bookingPhotoUpload, booking.uploadPhotos);
router.post('/bookings/:id/transition', requireAuth, transitionRules, handleValidation, booking.transition);
router.post('/bookings/:id/collect-cash', requireAuth, requireRole('provider', 'admin'), booking.collectCash);
router.get('/bookings/:id/photos/:photoId', requireAuth, booking.photo);

router.post('/payments/razorpay/order', requireAuth, payment.razorpayOrder);
router.post('/payments/verify', requireAuth, payment.verify);
router.post('/payments/dev-simulate', requireAuth, payment.devSimulate);

router.post('/reviews', requireAuth, requireRole('customer'), reviewRules, handleValidation, engagement.postReview);
router.post('/reviews/:id/response', requireAuth, requireRole('provider'), body('response').trim().isLength({ min: 2, max: 1000 }), handleValidation, engagement.postResponse);
router.post('/disputes', requireAuth, disputeRules, handleValidation, engagement.postDispute);
router.get('/disputes/mine', requireAuth, engagement.listMine);
router.get('/notifications', requireAuth, engagement.notifications);
router.patch('/notifications/:id/read', requireAuth, engagement.readOne);
router.post('/notifications/read-all', requireAuth, engagement.readAll);

const adminOnly = [requireAuth, requireRole('admin')];
router.get('/admin/overview', ...adminOnly, admin.overview);
router.get('/admin/reports', ...adminOnly, admin.reports);
router.get('/admin/users', ...adminOnly, admin.users);
router.patch('/admin/users/:id/status', ...adminOnly, admin.setUserStatus);
router.get('/admin/providers', ...adminOnly, admin.providers);
router.patch('/admin/providers/:id/verification', ...adminOnly, admin.setVerification);
router.patch('/admin/providers/:id/featured', ...adminOnly, admin.setFeatured);
router.get('/admin/bookings', ...adminOnly, admin.bookings);
router.get('/admin/disputes', ...adminOnly, admin.disputes);
router.patch('/admin/disputes/:id', ...adminOnly, admin.patchDispute);
router.get('/admin/settings', ...adminOnly, admin.getSettingsHandler);
router.patch('/admin/settings', ...adminOnly, settingsRules, handleValidation, admin.patchSettings);
router.get('/admin/categories', ...adminOnly, admin.categories);
router.post('/admin/categories', ...adminOnly, admin.postCategoryHandler);
router.patch('/admin/categories/:id', ...adminOnly, admin.patchCategoryHandler);
router.get('/admin/plans', ...adminOnly, admin.plans);
router.post('/admin/plans', ...adminOnly, admin.postPlan);
router.patch('/admin/plans/:id', ...adminOnly, admin.patchPlan);
router.post('/admin/subscriptions/assign', ...adminOnly, admin.assignSubscription);
router.get('/admin/payouts', ...adminOnly, admin.payouts);
router.post('/admin/payouts/generate', ...adminOnly, admin.createPayout);
router.patch('/admin/payouts/:id/paid', ...adminOnly, admin.payPayout);
router.get('/admin/payments', ...adminOnly, admin.payments);
router.post('/admin/payments/:id/refund', ...adminOnly, admin.refund);

export default router;
