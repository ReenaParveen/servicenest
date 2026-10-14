import { ServiceCategory, ServiceListing, ProviderProfile, ProviderSubscription } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';
import { slugify } from '../utils/text.js';
import { getProviderByUser } from './authService.js';

export async function listCategories({ includeInactive = false } = {}) {
  const filter = includeInactive ? {} : { isActive: true };
  return ServiceCategory.find(filter).sort({ sortOrder: 1, name: 1 });
}

export async function createCategory({ name, description, icon, sortOrder }) {
  const slug = slugify(name);
  if (!slug) throw new ApiError(422, 'Enter a category name.');
  const existing = await ServiceCategory.findOne({ slug });
  if (existing) throw new ApiError(409, 'A category with this name already exists.');
  return ServiceCategory.create({
    name: name.trim(),
    slug,
    description: description || '',
    icon: icon || 'Handyman',
    sortOrder: Number(sortOrder) || 0,
  });
}

export async function updateCategory(id, patch) {
  const category = await ServiceCategory.findById(id);
  if (!category) throw new ApiError(404, 'Category not found.');
  if (patch.name) {
    category.name = patch.name.trim();
    category.slug = slugify(patch.name);
  }
  if (patch.description !== undefined) category.description = patch.description;
  if (patch.icon) category.icon = patch.icon;
  if (patch.sortOrder !== undefined) category.sortOrder = Number(patch.sortOrder) || 0;
  if (patch.isActive !== undefined) category.isActive = Boolean(patch.isActive);
  await category.save();
  return category;
}

async function activeListingLimit(providerId) {
  const subscription = await ProviderSubscription.findOne({ provider: providerId, status: 'active' }).populate('plan');
  if (subscription?.endsAt && subscription.plan?.pricePaiseMonthly > 0 && subscription.endsAt < new Date()) {
    subscription.status = 'expired';
    await subscription.save();
  }
  if (subscription?.status === 'active' && subscription.plan) return subscription.plan.maxActiveListings;
  const freePlan = await SubscriptionPlanFallback();
  return freePlan?.maxActiveListings || 1;
}

async function SubscriptionPlanFallback() {
  const { SubscriptionPlan } = await import('../models/index.js');
  return SubscriptionPlan.findOne({ slug: 'free' });
}

export async function createListing(user, payload) {
  const provider = await getProviderByUser(user._id);
  const category = await ServiceCategory.findOne({ _id: payload.categoryId, isActive: true });
  if (!category) throw new ApiError(422, 'Choose an active service category.');
  const ownsCategory = provider.categories.some((item) => String(item._id || item) === String(category._id));
  if (!ownsCategory) throw new ApiError(422, 'Add this category to your provider profile before creating the listing.');

  const limit = await activeListingLimit(provider._id);
  const activeCount = await ServiceListing.countDocuments({ provider: provider._id, isActive: true });
  if (activeCount >= limit) {
    throw new ApiError(400, `Your current plan allows ${limit} active listing${limit === 1 ? '' : 's'}. Upgrade the plan or deactivate another listing.`);
  }

  return ServiceListing.create({
    provider: provider._id,
    category: category._id,
    title: payload.title.trim(),
    description: payload.description.trim(),
    pricePaise: payload.pricePaise,
    priceUnit: payload.priceUnit || 'visit',
    durationMinutes: payload.durationMinutes || 60,
    isActive: true,
  });
}

export async function updateListing(user, listingId, patch) {
  const provider = await getProviderByUser(user._id);
  const listing = await ServiceListing.findOne({ _id: listingId, provider: provider._id });
  if (!listing) throw new ApiError(404, 'Listing not found.');
  if (patch.title) listing.title = patch.title.trim();
  if (patch.description) listing.description = patch.description.trim();
  if (patch.pricePaise !== undefined) listing.pricePaise = patch.pricePaise;
  if (patch.priceUnit) listing.priceUnit = patch.priceUnit;
  if (patch.durationMinutes) listing.durationMinutes = patch.durationMinutes;
  if (patch.isActive !== undefined) {
    if (patch.isActive && !listing.isActive) {
      const limit = await activeListingLimit(provider._id);
      const activeCount = await ServiceListing.countDocuments({ provider: provider._id, isActive: true });
      if (activeCount >= limit) {
        throw new ApiError(400, `Your current plan allows ${limit} active listing${limit === 1 ? '' : 's'}.`);
      }
    }
    listing.isActive = Boolean(patch.isActive);
  }
  await listing.save();
  return listing.populate('category');
}

export async function listingsForProvider(providerId, { activeOnly = false } = {}) {
  const filter = { provider: providerId };
  if (activeOnly) filter.isActive = true;
  return ServiceListing.find(filter).populate('category').sort({ createdAt: -1 });
}

export async function publicListings(providerId) {
  const provider = await ProviderProfile.findById(providerId);
  if (!provider || provider.verificationStatus === 'suspended') return [];
  return listingsForProvider(providerId, { activeOnly: true });
}
