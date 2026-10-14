import { asyncHandler, send } from '../utils/asyncHandler.js';
import { createCategory, listCategories, updateCategory, createListing, updateListing, listingsForProvider, publicListings } from '../services/catalogService.js';
import { getProviderByUser } from '../services/authService.js';
import { presentCategory, presentListing } from '../utils/presenters.js';

export const getCategories = asyncHandler(async (req, res) => {
  const includeInactive = req.user?.role === 'admin' && req.query.all === 'true';
  const categories = await listCategories({ includeInactive });
  send(res, categories.map(presentCategory));
});

export const postCategory = asyncHandler(async (req, res) => {
  const category = await createCategory(req.body);
  send(res, presentCategory(category), 201);
});

export const patchCategory = asyncHandler(async (req, res) => {
  const category = await updateCategory(req.params.id, req.body);
  send(res, presentCategory(category));
});

export const getListings = asyncHandler(async (req, res) => {
  const listings = await publicListings(req.query.providerId);
  send(res, listings.map(presentListing));
});

export const getMyListings = asyncHandler(async (req, res) => {
  const provider = await getProviderByUser(req.user._id);
  const listings = await listingsForProvider(provider._id);
  send(res, listings.map(presentListing));
});

export const postListing = asyncHandler(async (req, res) => {
  const listing = await createListing(req.user, req.body);
  send(res, presentListing(await listing.populate('category')), 201);
});

export const patchListing = asyncHandler(async (req, res) => {
  const listing = await updateListing(req.user, req.params.id, req.body);
  send(res, presentListing(listing));
});
