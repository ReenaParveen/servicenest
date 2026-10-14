import {
  AvailabilitySlot,
  Booking,
  ProviderProfile,
  ProviderSubscription,
  ServiceCategory,
  ServiceListing,
} from '../models/index.js';
import { ApiError } from '../utils/apiError.js';
import { geoPoint, escapeRegex } from '../utils/text.js';
import { generateSlots } from '../utils/slots.js';
import { addDays, formatDateInTz, formatTimeInTz, isDateString, minutesFromTime } from '../utils/dates.js';
import { BUSY_BOOKING_STATUSES } from '../constants.js';
import { getProviderByUser } from './authService.js';
import { getSettings } from './platformService.js';
import { parsePage } from '../utils/pagination.js';
import { presentListing, presentProviderPublic, isPromoted } from '../utils/presenters.js';
import { assertFileSignature, removeFileQuietly, uploadPaths } from '../utils/files.js';
import path from 'path';

export async function updateProviderProfile(user, patch) {
  const provider = await getProviderByUser(user._id);
  if (patch.businessName) provider.businessName = patch.businessName.trim();
  if (patch.bio !== undefined) provider.bio = patch.bio;
  if (patch.experienceYears !== undefined) provider.experienceYears = Number(patch.experienceYears) || 0;
  if (patch.city !== undefined) provider.city = patch.city.trim();
  if (patch.state !== undefined) provider.state = patch.state.trim();
  if (patch.serviceRadiusKm !== undefined) provider.serviceRadiusKm = Number(patch.serviceRadiusKm);
  if (patch.whatsappNumber !== undefined) provider.whatsappNumber = patch.whatsappNumber;
  if (patch.categoryIds) {
    const categories = await ServiceCategory.find({ _id: { $in: patch.categoryIds }, isActive: true });
    if (categories.length !== patch.categoryIds.length) throw new ApiError(422, 'One or more categories are unavailable.');
    provider.categories = categories.map((category) => category._id);
  }
  if (patch.lat !== undefined || patch.lng !== undefined) {
    const point = geoPoint(patch.lat, patch.lng);
    if (!point) provider.location = undefined;
    else provider.location = point;
  }
  await provider.save();
  return provider.populate('categories');
}

export async function addDocument(user, file, docType) {
  const provider = await getProviderByUser(user._id);
  if (provider.documents.length >= 6) {
    await removeFileQuietly(file.path);
    throw new ApiError(400, 'You can upload up to 6 verification documents.');
  }
  try {
    await assertFileSignature(file.path, file.mimetype);
  } catch (error) {
    await removeFileQuietly(file.path);
    throw error;
  }
  provider.documents.push({
    docType,
    originalName: String(file.originalname || 'document').slice(0, 140),
    storedName: path.basename(file.filename),
    mimeType: file.mimetype,
    size: file.size,
  });
  if (provider.verificationStatus === 'rejected') {
    provider.verificationStatus = 'pending';
    provider.verificationNote = '';
  }
  await provider.save();
  return provider;
}

export async function removeDocument(user, documentId) {
  const provider = await getProviderByUser(user._id);
  const doc = provider.documents.id(documentId);
  if (!doc) throw new ApiError(404, 'Document not found.');
  await removeFileQuietly(path.join(uploadPaths.documents, doc.storedName));
  doc.deleteOne();
  await provider.save();
  return provider;
}

export async function addPortfolioImage(user, file, caption) {
  const provider = await getProviderByUser(user._id);
  if (provider.portfolio.length >= 8) {
    await removeFileQuietly(file.path);
    throw new ApiError(400, 'You can upload up to 8 portfolio images.');
  }
  try {
    await assertFileSignature(file.path, file.mimetype);
  } catch (error) {
    await removeFileQuietly(file.path);
    throw error;
  }
  const storedName = path.basename(file.filename);
  provider.portfolio.push({
    storedName,
    url: `/uploads/public/portfolio/${storedName}`,
    caption: caption || '',
  });
  await provider.save();
  return provider;
}

export async function removePortfolioImage(user, imageId) {
  const provider = await getProviderByUser(user._id);
  const image = provider.portfolio.id(imageId);
  if (!image) throw new ApiError(404, 'Image not found.');
  await removeFileQuietly(path.join(uploadPaths.portfolio, image.storedName));
  image.deleteOne();
  await provider.save();
  return provider;
}

export async function replaceAvailability(user, rules) {
  const provider = await getProviderByUser(user._id);
  await AvailabilitySlot.deleteMany({ provider: provider._id, kind: 'weekly' });
  if (rules?.length) {
    await AvailabilitySlot.insertMany(
      rules.map((rule) => ({
        provider: provider._id,
        kind: 'weekly',
        dayOfWeek: Number(rule.dayOfWeek),
        startTime: rule.startTime,
        endTime: rule.endTime,
        slotMinutes: Number(rule.slotMinutes || 60),
        isActive: rule.isActive !== false,
      }))
    );
  }
  return AvailabilitySlot.find({ provider: provider._id, kind: 'weekly' }).sort({ dayOfWeek: 1 });
}

export async function addBlockedDate(user, date) {
  const provider = await getProviderByUser(user._id);
  if (!isDateString(date)) throw new ApiError(422, 'Enter a valid date.');
  const existing = await AvailabilitySlot.findOne({ provider: provider._id, kind: 'block', date });
  if (existing) return existing;
  return AvailabilitySlot.create({
    provider: provider._id,
    kind: 'block',
    date,
    startTime: '00:00',
    endTime: '23:59',
    isActive: true,
  });
}

export async function removeBlockedDate(user, blockId) {
  const provider = await getProviderByUser(user._id);
  const block = await AvailabilitySlot.findOneAndDelete({ _id: blockId, provider: provider._id, kind: 'block' });
  if (!block) throw new ApiError(404, 'Blocked date not found.');
  return block;
}

export async function getAvailability(providerId) {
  const [weekly, blocks] = await Promise.all([
    AvailabilitySlot.find({ provider: providerId, kind: 'weekly' }).sort({ dayOfWeek: 1 }),
    AvailabilitySlot.find({ provider: providerId, kind: 'block' }).sort({ date: 1 }),
  ]);
  return { weekly, blocks };
}

export async function slotsForDate(providerId, date) {
  if (!isDateString(date)) throw new ApiError(422, 'Enter a valid date.');
  const settings = await getSettings();
  const timezone = settings.timezone || 'Asia/Kolkata';
  const today = formatDateInTz(new Date(), timezone);
  if (date < today || date > addDays(today, 60)) return [];
  const { weekly, blocks } = await getAvailability(providerId);
  const bookings = await Booking.find({
    provider: providerId,
    scheduledDate: date,
    status: { $in: BUSY_BOOKING_STATUSES },
  }).select('startTime');
  return generateSlots({
    weeklyRules: weekly,
    date,
    blockedDates: blocks.map((block) => block.date),
    busyStarts: bookings.map((booking) => booking.startTime),
    isToday: date === today,
    nowMinutes: minutesFromTime(formatTimeInTz(new Date(), timezone)) || 0,
  });
}

async function hasOpenSlot(providerId, rules, blocks, bookings, timezone) {
  const today = formatDateInTz(new Date(), timezone);
  const blocked = new Set(blocks.filter((block) => String(block.provider) === String(providerId)).map((block) => block.date));
  const weekly = rules.filter((rule) => String(rule.provider) === String(providerId));
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(today, offset);
    const busy = bookings
      .filter((booking) => String(booking.provider) === String(providerId) && booking.scheduledDate === date)
      .map((booking) => booking.startTime);
    const slots = generateSlots({
      weeklyRules: weekly,
      date,
      blockedDates: [...blocked],
      busyStarts: busy,
      isToday: date === today,
      nowMinutes: minutesFromTime(formatTimeInTz(new Date(), timezone)) || 0,
    });
    if (slots.some((slot) => slot.available)) return true;
  }
  return false;
}

export async function searchProviders(query) {
  const { page, limit, skip } = parsePage(query);
  const settings = await getSettings();
  const category = query.category
    ? await ServiceCategory.findOne({ slug: String(query.category).toLowerCase(), isActive: true })
    : null;
  if (query.category && !category) {
    return { items: [], total: 0, page, limit };
  }

  const base = { verificationStatus: 'approved' };
  if (category) base.categories = category._id;
  if (query.q) base.businessName = new RegExp(escapeRegex(String(query.q).trim()), 'i');
  if (query.minRating) base.ratingAvg = { $gte: Number(query.minRating) };

  const lat = Number(query.lat);
  const lng = Number(query.lng);
  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);
  const searchRadiusKm = Math.min(100, Math.max(1, Number(query.radius) || 25));
  let providers = [];

  if (hasGeo) {
    providers = await ProviderProfile.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [lng, lat] },
          distanceField: 'distanceMeters',
          spherical: true,
          maxDistance: searchRadiusKm * 1000,
          query: base,
        },
      },
      { $limit: 200 },
    ]);
    providers = providers.filter((provider) => provider.distanceMeters <= (provider.serviceRadiusKm || 10) * 1000);
  } else {
    if (query.city) base.city = new RegExp(`^${escapeRegex(String(query.city).trim())}$`, 'i');
    providers = await ProviderProfile.find(base).limit(200).lean();
  }

  await ProviderProfile.populate(providers, { path: 'categories', select: 'name slug icon description isActive sortOrder' });
  const ids = providers.map((provider) => provider._id);
  const listings = await ServiceListing.find({ provider: { $in: ids }, isActive: true }).populate('category').lean();
  const listingsByProvider = new Map();
  for (const listing of listings) {
    const key = String(listing.provider);
    if (!listingsByProvider.has(key)) listingsByProvider.set(key, []);
    listingsByProvider.get(key).push(listing);
  }

  let items = providers.map((provider) => {
    const ownListings = (listingsByProvider.get(String(provider._id)) || []).filter((listing) => {
      if (!category) return true;
      return String(listing.category?._id || listing.category) === String(category._id);
    });
    const startingPricePaise = ownListings.length ? Math.min(...ownListings.map((listing) => listing.pricePaise)) : null;
    return {
      provider,
      startingPricePaise,
      services: ownListings.map((listing) => presentListing(listing)),
      distanceMeters: provider.distanceMeters,
    };
  }).filter((item) => item.startingPricePaise !== null);

  const minPrice = Number(query.minPricePaise);
  const maxPrice = Number(query.maxPricePaise);
  if (Number.isInteger(minPrice)) items = items.filter((item) => item.startingPricePaise >= minPrice);
  if (Number.isInteger(maxPrice)) items = items.filter((item) => item.startingPricePaise <= maxPrice);

  if (query.available === 'true' && items.length) {
    const providerIds = items.map((item) => item.provider._id);
    const today = formatDateInTz(new Date(), settings.timezone || 'Asia/Kolkata');
    const dates = Array.from({ length: 7 }, (_, index) => addDays(today, index));
    const [rules, blocks, bookings] = await Promise.all([
      AvailabilitySlot.find({ provider: { $in: providerIds }, kind: 'weekly', isActive: true }).lean(),
      AvailabilitySlot.find({ provider: { $in: providerIds }, kind: 'block', date: { $in: dates } }).lean(),
      Booking.find({
        provider: { $in: providerIds },
        scheduledDate: { $in: dates },
        status: { $in: BUSY_BOOKING_STATUSES },
      }).select('provider scheduledDate startTime').lean(),
    ]);
    const flags = await Promise.all(items.map((item) => hasOpenSlot(item.provider._id, rules, blocks, bookings, settings.timezone || 'Asia/Kolkata')));
    items = items.filter((_, index) => flags[index]);
  }

  const sort = query.sort || 'relevance';
  items.sort((a, b) => {
    if (sort === 'price_asc') return a.startingPricePaise - b.startingPricePaise;
    if (sort === 'price_desc') return b.startingPricePaise - a.startingPricePaise;
    if (sort === 'rating') return (b.provider.ratingAvg || 0) - (a.provider.ratingAvg || 0);
    const promoted = Number(isPromoted(b.provider)) - Number(isPromoted(a.provider));
    if (promoted) return promoted;
    const rating = (b.provider.ratingAvg || 0) - (a.provider.ratingAvg || 0);
    if (rating) return rating;
    return (a.distanceMeters || 0) - (b.distanceMeters || 0);
  });

  const total = items.length;
  const pageItems = items.slice(skip, skip + limit).map((item) => presentProviderPublic(item.provider, {
    startingPricePaise: item.startingPricePaise,
    services: item.services,
    distanceMeters: item.distanceMeters,
  }));
  return { items: pageItems, total, page, limit };
}

export async function featuredProviders() {
  const providers = await ProviderProfile.find({
    verificationStatus: 'approved',
    isFeatured: true,
    featuredUntil: { $gt: new Date() },
  })
    .populate('categories')
    .limit(8)
    .lean();
  return hydrateCards(providers);
}

async function hydrateCards(providers) {
  const ids = providers.map((provider) => provider._id);
  const listings = await ServiceListing.find({ provider: { $in: ids }, isActive: true }).populate('category').lean();
  return providers.map((provider) => {
    const own = listings.filter((listing) => String(listing.provider) === String(provider._id));
    const startingPricePaise = own.length ? Math.min(...own.map((listing) => listing.pricePaise)) : null;
    return presentProviderPublic(provider, {
      startingPricePaise,
      services: own.slice(0, 3).map((listing) => presentListing(listing)),
    });
  }).filter((provider) => provider.startingPricePaise !== null);
}

export async function getPublicProvider(id) {
  const provider = await ProviderProfile.findById(id).populate('categories');
  if (!provider || provider.verificationStatus !== 'approved') {
    throw new ApiError(404, 'Provider not found.');
  }
  const listings = await ServiceListing.find({ provider: provider._id, isActive: true }).populate('category');
  const card = presentProviderPublic(provider, {
    startingPricePaise: listings.length ? Math.min(...listings.map((listing) => listing.pricePaise)) : null,
    services: listings.map((listing) => presentListing(listing)),
  });
  return card;
}

export async function getPrivateProvider(user) {
  const provider = await getProviderByUser(user._id);
  const subscription = await ProviderSubscription.findOne({ provider: provider._id }).populate('plan');
  return { provider, subscription };
}
