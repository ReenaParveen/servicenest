import fs from 'fs';
import path from 'path';
import { asyncHandler, send } from '../utils/asyncHandler.js';
import {
  addBlockedDate,
  addDocument,
  addPortfolioImage,
  featuredProviders,
  getAvailability,
  getPrivateProvider,
  getPublicProvider,
  removeBlockedDate,
  removeDocument,
  removePortfolioImage,
  replaceAvailability,
  searchProviders,
  slotsForDate,
  updateProviderProfile,
} from '../services/providerService.js';
import { getProviderByUser } from '../services/authService.js';
import { presentProviderPrivate, presentProviderPublic } from '../utils/presenters.js';
import { providerSummary, earningsForProvider } from '../services/financeService.js';
import { reviewsForProvider } from '../services/engagementService.js';
import { presentReview } from '../utils/presenters.js';
import { resolveStoredFile, uploadPaths } from '../utils/files.js';
import { ApiError } from '../utils/apiError.js';
import { ProviderProfile } from '../models/ProviderProfile.js';

export const search = asyncHandler(async (req, res) => {
  const result = await searchProviders(req.query);
  send(res, result.items, 200);
  res.json = undefined;
});

export const searchProvidersHandler = asyncHandler(async (req, res) => {
  const result = await searchProviders(req.query);
  res.json({
    success: true,
    data: result.items,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      pages: Math.ceil(result.total / result.limit) || 0,
    },
  });
});

export const featured = asyncHandler(async (_req, res) => {
  send(res, await featuredProviders());
});

export const publicProfile = asyncHandler(async (req, res) => {
  send(res, await getPublicProvider(req.params.id));
});

export const slots = asyncHandler(async (req, res) => {
  send(res, await slotsForDate(req.params.id, req.query.date));
});

export const myProfile = asyncHandler(async (req, res) => {
  const { provider, subscription } = await getPrivateProvider(req.user);
  send(res, presentProviderPrivate(provider, req.user, subscription));
});

export const patchMe = asyncHandler(async (req, res) => {
  const provider = await updateProviderProfile(req.user, req.body);
  const { subscription } = await getPrivateProvider(req.user);
  send(res, presentProviderPrivate(provider, req.user, subscription));
});

export const postDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Choose a document to upload.');
  const provider = await addDocument(req.user, req.file, req.body.docType);
  const { subscription } = await getPrivateProvider(req.user);
  send(res, presentProviderPrivate(provider, req.user, subscription));
});

export const deleteDocument = asyncHandler(async (req, res) => {
  await removeDocument(req.user, req.params.docId);
  const { provider, subscription } = await getPrivateProvider(req.user);
  send(res, presentProviderPrivate(provider, req.user, subscription));
});

export const downloadDocument = asyncHandler(async (req, res) => {
  const docId = req.params.docId;
  let provider;
  if (req.user.role === 'admin') {
    provider = await ProviderProfile.findOne({ 'documents._id': docId });
  } else {
    provider = await getProviderByUser(req.user._id);
  }
  const doc = provider?.documents.id(docId);
  if (!doc) throw new ApiError(404, 'Document not found.');
  const filePath = resolveStoredFile(uploadPaths.documents, doc.storedName);
  if (!fs.existsSync(filePath)) throw new ApiError(404, 'Document file not found.');
  res.download(filePath, path.basename(doc.originalName));
});

export const postPortfolio = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Choose an image to upload.');
  const provider = await addPortfolioImage(req.user, req.file, req.body.caption);
  const { subscription } = await getPrivateProvider(req.user);
  send(res, presentProviderPrivate(provider, req.user, subscription));
});

export const deletePortfolio = asyncHandler(async (req, res) => {
  await removePortfolioImage(req.user, req.params.imageId);
  const { provider, subscription } = await getPrivateProvider(req.user);
  send(res, presentProviderPrivate(provider, req.user, subscription));
});

export const getMyAvailability = asyncHandler(async (req, res) => {
  const provider = await getProviderByUser(req.user._id);
  send(res, await getAvailability(provider._id));
});

export const putAvailability = asyncHandler(async (req, res) => {
  send(res, await replaceAvailability(req.user, req.body.rules));
});

export const postBlock = asyncHandler(async (req, res) => {
  send(res, await addBlockedDate(req.user, req.body.date), 201);
});

export const deleteBlock = asyncHandler(async (req, res) => {
  await removeBlockedDate(req.user, req.params.blockId);
  send(res, { removed: true });
});

export const summary = asyncHandler(async (req, res) => {
  const { provider, subscription } = await getPrivateProvider(req.user);
  const data = await providerSummary(req.user, provider, subscription);
  send(res, {
    profile: presentProviderPrivate(provider, req.user, subscription),
    ...data,
  });
});

export const earnings = asyncHandler(async (req, res) => {
  const { provider, subscription } = await getPrivateProvider(req.user);
  const advanced = subscription?.status === 'active' && subscription.plan?.analyticsLevel === 'advanced';
  const data = await earningsForProvider(provider._id, { includeSeries: advanced });
  send(res, {
    ...data,
    analyticsLevel: advanced ? 'advanced' : 'basic',
    payouts: data.payouts.map((payout) => ({
      id: payout._id,
      grossPaise: payout.grossPaise,
      commissionPaise: payout.commissionPaise,
      netPaise: payout.netPaise,
      status: payout.status,
      paidAt: payout.paidAt,
      referenceNote: payout.referenceNote,
      createdAt: payout.createdAt,
    })),
    commissions: data.commissions.map((row) => ({
      id: row._id,
      status: row.status,
      serviceAmountPaise: row.serviceAmountPaise,
      commissionPaise: row.commissionPaise,
      providerSharePaise: row.providerSharePaise,
      reference: row.booking?.reference,
      serviceTitle: row.booking?.serviceTitle,
      createdAt: row.createdAt,
    })),
  });
});

export const myReviews = asyncHandler(async (req, res) => {
  const provider = await getProviderByUser(req.user._id);
  const result = await reviewsForProvider(provider._id, req.query);
  res.json({
    success: true,
    data: result.items.map(presentReview),
    pagination: { page: result.page, limit: result.limit, total: result.total, pages: Math.ceil(result.total / result.limit) || 0 },
  });
});

export const providerReviews = asyncHandler(async (req, res) => {
  const provider = await ProviderProfile.findById(req.params.id);
  if (!provider || provider.verificationStatus !== 'approved') throw new ApiError(404, 'Provider not found.');
  const result = await reviewsForProvider(provider._id, req.query);
  res.json({
    success: true,
    data: result.items.map(presentReview),
    pagination: { page: result.page, limit: result.limit, total: result.total, pages: Math.ceil(result.total / result.limit) || 0 },
  });
});

export { presentProviderPublic };
