import '../config/loadEnv.js';
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import {
  AvailabilitySlot,
  Booking,
  Commission,
  CustomerProfile,
  Dispute,
  Notification,
  Payment,
  Payout,
  ProviderProfile,
  ProviderSubscription,
  Review,
  ServiceCategory,
  ServiceListing,
  SubscriptionPlan,
  User,
} from '../models/index.js';
import { hashPassword } from '../services/authService.js';
import { quoteAmounts } from '../utils/money.js';
import { addDays, formatDateInTz } from '../utils/dates.js';
import { getSettings } from '../services/platformService.js';
import fs from 'fs/promises';
import path from 'path';
import { uploadPaths, ensureUploadDirs } from '../utils/files.js';

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
  console.error('Refusing to seed while NODE_ENV=production. Set ALLOW_SEED=true only for a disposable database.');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is required.');
  process.exit(1);
}

const demoPassword = process.env.SEED_DEMO_PASSWORD || 'DemoPass123!';
if (demoPassword.length < 8) {
  console.error('SEED_DEMO_PASSWORD must be at least 8 characters.');
  process.exit(1);
}

const categories = [
  ['Electrician', 'electrician', 'ElectricalServices', 'Wiring, fittings, and electrical repairs.'],
  ['Plumber', 'plumber', 'Plumbing', 'Leaks, fittings, and plumbing repairs.'],
  ['AC Repair', 'ac-repair', 'AcUnit', 'AC installation, service, and repair.'],
  ['Home Cleaning', 'home-cleaning', 'CleaningServices', 'Home and deep cleaning visits.'],
  ['Appliance Repair', 'appliance-repair', 'Kitchen', 'Repair for common home appliances.'],
  ['Painter', 'painter', 'FormatPaint', 'Interior and exterior painting.'],
  ['Carpenter', 'carpenter', 'Construction', 'Furniture and woodwork repairs.'],
  ['Tutor', 'tutor', 'School', 'At-home tutoring sessions.'],
  ['Pest Control', 'pest-control', 'BugReport', 'Inspection and pest treatment.'],
];

const plans = [
  {
    name: 'Free',
    slug: 'free',
    tier: 'free',
    pricePaiseMonthly: 0,
    maxActiveListings: 1,
    featuredEligible: false,
    analyticsLevel: 'basic',
    features: ['1 active service listing', 'Booking inbox', 'Basic earnings totals'],
    sortOrder: 1,
  },
  {
    name: 'Basic',
    slug: 'basic',
    tier: 'basic',
    pricePaiseMonthly: 49900,
    maxActiveListings: 5,
    featuredEligible: false,
    analyticsLevel: 'basic',
    features: ['5 active service listings', 'Booking inbox', 'Basic earnings totals'],
    sortOrder: 2,
  },
  {
    name: 'Premium',
    slug: 'premium',
    tier: 'premium',
    pricePaiseMonthly: 149900,
    maxActiveListings: 20,
    featuredEligible: true,
    analyticsLevel: 'advanced',
    features: ['20 active service listings', 'Promoted placement eligibility', 'Earnings chart'],
    sortOrder: 3,
  },
];

await connectDb(process.env.MONGODB_URI);
await ensureUploadDirs();
const settings = await getSettings();
if (!settings.platformName) {
  settings.platformName = process.env.PLATFORM_NAME || 'ServiceNest';
  await settings.save();
}

for (const [name, slug, icon, description] of categories) {
  await ServiceCategory.findOneAndUpdate(
    { slug },
    { name, slug, icon, description, isActive: true },
    { upsert: true, new: true }
  );
}
for (const plan of plans) {
  await SubscriptionPlan.findOneAndUpdate({ slug: plan.slug }, plan, { upsert: true });
}

const passwordHash = await hashPassword(demoPassword);
const categoryDocs = await ServiceCategory.find();
const bySlug = Object.fromEntries(categoryDocs.map((category) => [category.slug, category]));
const plansBySlug = Object.fromEntries((await SubscriptionPlan.find()).map((plan) => [plan.slug, plan]));

const customers = [
  ['Demo Customer', 'customer@demo.servicenest.local', '9000000001', '221 Demo Residency, Sample Nagar', '411001', 18.5204, 73.8567],
  ['Demo Meera', 'meera@demo.servicenest.local', '9000000102', '14 Dummy Colony, Trial Layout', '411004', 18.531, 73.85],
  ['Demo Rohan', 'rohan@demo.servicenest.local', '9000000103', '88 Sample Heights, Mock Nagar', '411038', 18.508, 73.842],
  ['Demo Anita', 'anita@demo.servicenest.local', '9000000104', '5 Practice Park, Example Road', '411001', 18.526, 73.862],
];

const providerSeeds = [
  ['electrician@demo.servicenest.local', 'Demo Electrician', '9000000002', 'Demo Spark Electrical', 'electrician', 18.5204, 73.8567, true, 'approved', 'premium', 11, 49900, 'Fan and fitting repair'],
  ['wirepro@demo.servicenest.local', 'Demo WirePro', '9000000202', 'Demo WirePro Electrical', 'electrician', 18.536, 73.868, false, 'approved', 'basic', 7, 69900, 'Switchboard visit'],
  ['plumber@demo.servicenest.local', 'Demo Plumber', '9000000003', 'Demo ClearFlow Plumbing', 'plumber', 18.531, 73.844, true, 'approved', 'basic', 9, 59900, 'Leak inspection'],
  ['leakfix@demo.servicenest.local', 'Demo LeakFix', '9000000203', 'Demo LeakFix Plumbing', 'plumber', 18.512, 73.851, false, 'approved', 'free', 4, 44900, 'Tap and pipe visit'],
  ['ac@demo.servicenest.local', 'Demo AC Technician', '9000000004', 'Demo Breeze AC Care', 'ac-repair', 18.507, 73.87, true, 'approved', 'premium', 8, 89900, 'AC service visit'],
  ['coolair@demo.servicenest.local', 'Demo CoolAir', '9000000204', 'Demo CoolAir Service', 'ac-repair', 18.548, 73.833, false, 'approved', 'free', 3, 79900, 'AC gas check'],
  ['cleaning@demo.servicenest.local', 'Demo Cleaner', '9000000005', 'Demo FreshHome Cleaning', 'home-cleaning', 18.545, 73.83, true, 'approved', 'premium', 6, 129900, '2 BHK cleaning'],
  ['shine@demo.servicenest.local', 'Demo Shine', '9000000205', 'Demo Shine Squad Cleaning', 'home-cleaning', 18.519, 73.839, false, 'approved', 'basic', 5, 99900, 'Kitchen deep clean'],
  ['appliance@demo.servicenest.local', 'Demo Appliance', '9000000206', 'Demo HomeAppliance Care', 'appliance-repair', 18.528, 73.859, false, 'approved', 'basic', 10, 54900, 'Washing machine visit'],
  ['kitchenfix@demo.servicenest.local', 'Demo KitchenFix', '9000000207', 'Demo KitchenFix Repairs', 'appliance-repair', 18.503, 73.847, true, 'approved', 'free', 6, 64900, 'Mixer and oven visit'],
  ['painter@demo.servicenest.local', 'Demo Painter', '9000000006', 'Demo Colourwall Painting', 'painter', 18.516, 73.856, false, 'pending', 'free', 8, 149900, 'One room painting'],
  ['brush@demo.servicenest.local', 'Demo Brushline', '9000000208', 'Demo Brushline Painters', 'painter', 18.54, 73.861, false, 'approved', 'basic', 12, 179900, 'Wall painting visit'],
  ['carpenter@demo.servicenest.local', 'Demo Carpenter', '9000000209', 'Demo Timberworks', 'carpenter', 18.522, 73.872, false, 'pending', 'free', 9, 89900, 'Furniture repair'],
  ['wood@demo.servicenest.local', 'Demo Woodlane', '9000000210', 'Demo Woodlane Carpentry', 'carpenter', 18.509, 73.828, true, 'approved', 'basic', 14, 109900, 'Door and hinge repair'],
  ['tutor@demo.servicenest.local', 'Demo Tutor', '9000000211', 'Demo StudyNest Tutors', 'tutor', 18.534, 73.855, true, 'approved', 'premium', 6, 49900, 'Maths session'],
  ['maths@demo.servicenest.local', 'Demo MathsAtHome', '9000000212', 'Demo MathsAtHome', 'tutor', 18.517, 73.866, false, 'approved', 'free', 4, 39900, 'Science session'],
  ['pest@demo.servicenest.local', 'Demo Pest Control', '9000000213', 'Demo SafeHome Pest Control', 'pest-control', 18.541, 73.848, true, 'approved', 'premium', 7, 89900, 'Home inspection'],
  ['bugfree@demo.servicenest.local', 'Demo BugFree', '9000000214', 'Demo BugFree Inspection', 'pest-control', 18.505, 73.863, false, 'approved', 'free', 5, 74900, 'Kitchen treatment'],
];

const jobs = [
  ['customer@demo.servicenest.local', 'electrician@demo.servicenest.local', -12, '10:00', 'completed', 5],
  ['customer@demo.servicenest.local', 'electrician@demo.servicenest.local', -5, '11:00', 'completed', 4],
  ['customer@demo.servicenest.local', 'cleaning@demo.servicenest.local', -9, '09:00', 'completed', 5],
  ['customer@demo.servicenest.local', 'plumber@demo.servicenest.local', 2, '11:00', 'pending', 0],
  ['customer@demo.servicenest.local', 'ac@demo.servicenest.local', 1, '15:00', 'accepted', 0],
  ['customer@demo.servicenest.local', 'tutor@demo.servicenest.local', 3, '16:00', 'accepted', 0],
  ['customer@demo.servicenest.local', 'pest@demo.servicenest.local', 4, '10:00', 'pending', 0],
  ['customer@demo.servicenest.local', 'appliance@demo.servicenest.local', 0, '14:00', 'in_progress', 0],
  ['customer@demo.servicenest.local', 'wood@demo.servicenest.local', -7, '10:00', 'completed', 5],
  ['customer@demo.servicenest.local', 'leakfix@demo.servicenest.local', -15, '12:00', 'completed', 3],
  ['customer@demo.servicenest.local', 'shine@demo.servicenest.local', 5, '09:00', 'pending', 0],
  ['customer@demo.servicenest.local', 'wirepro@demo.servicenest.local', -4, '09:00', 'cancelled', 0],
  ['customer@demo.servicenest.local', 'brush@demo.servicenest.local', 6, '10:00', 'rejected', 0],
  ['customer@demo.servicenest.local', 'kitchenfix@demo.servicenest.local', 2, '15:00', 'accepted', 0],
  ['customer@demo.servicenest.local', 'bugfree@demo.servicenest.local', -6, '11:00', 'completed', 4],
  ['customer@demo.servicenest.local', 'maths@demo.servicenest.local', 7, '10:00', 'pending', 0],
  ['meera@demo.servicenest.local', 'electrician@demo.servicenest.local', -20, '09:00', 'completed', 5],
  ['meera@demo.servicenest.local', 'cleaning@demo.servicenest.local', -2, '14:00', 'completed', 4],
  ['meera@demo.servicenest.local', 'plumber@demo.servicenest.local', 1, '10:00', 'pending', 0],
  ['rohan@demo.servicenest.local', 'ac@demo.servicenest.local', -11, '10:00', 'completed', 5],
  ['rohan@demo.servicenest.local', 'pest@demo.servicenest.local', -8, '15:00', 'completed', 4],
  ['rohan@demo.servicenest.local', 'tutor@demo.servicenest.local', 2, '09:00', 'accepted', 0],
  ['anita@demo.servicenest.local', 'wood@demo.servicenest.local', -13, '15:00', 'completed', 5],
  ['anita@demo.servicenest.local', 'shine@demo.servicenest.local', -1, '11:00', 'in_progress', 0],
  ['anita@demo.servicenest.local', 'appliance@demo.servicenest.local', -18, '10:00', 'completed', 4],
  ['anita@demo.servicenest.local', 'brush@demo.servicenest.local', -16, '14:00', 'completed', 5],
];

const reviewComments = [
  'Sample five-star note for the demo. Not a real review.',
  'Demo feedback only. This sample visit is fictional.',
  'Practice review so the profile is not empty. Not a real customer.',
  'Dummy comment for the ServiceNest sample dataset.',
];

function hourLater(startTime) {
  const hour = Number(startTime.slice(0, 2)) + 1;
  return `${String(hour).padStart(2, '0')}:00`;
}

async function clearDemoData() {
  const demoUsers = await User.find({
    $or: [
      { email: /@demo\.servicenest\.local$/i },
      { isDemo: true, role: { $ne: 'admin' } },
    ],
  }).select('_id');
  const userIds = demoUsers.map((user) => user._id);
  const providers = await ProviderProfile.find({
    $or: [{ user: { $in: userIds } }, { isDemo: true }],
  }).select('_id');
  const providerIds = providers.map((provider) => provider._id);
  const bookings = await Booking.find({
    $or: [
      { customer: { $in: userIds } },
      { provider: { $in: providerIds } },
      { reference: /^SN-DEMO-/ },
    ],
  }).select('_id');
  const bookingIds = bookings.map((booking) => booking._id);

  await Review.deleteMany({ $or: [{ booking: { $in: bookingIds } }, { customer: { $in: userIds } }, { provider: { $in: providerIds } }] });
  await Dispute.deleteMany({ $or: [{ booking: { $in: bookingIds } }, { raisedBy: { $in: userIds } }] });
  await Payment.deleteMany({
    $or: [
      { booking: { $in: bookingIds } },
      { customer: { $in: userIds } },
      { provider: { $in: providerIds } },
      { idempotencyKey: /^seed:/ },
    ],
  });
  await Commission.deleteMany({ $or: [{ booking: { $in: bookingIds } }, { provider: { $in: providerIds } }] });
  await Payout.deleteMany({ provider: { $in: providerIds } });
  await Booking.deleteMany({ _id: { $in: bookingIds } });
  await Notification.deleteMany({ $or: [{ user: { $in: userIds } }, { dedupeKey: /^seed:/ }] });
  await ServiceListing.deleteMany({ provider: { $in: providerIds } });
  await AvailabilitySlot.deleteMany({ provider: { $in: providerIds } });
  await ProviderSubscription.deleteMany({ provider: { $in: providerIds } });
  await CustomerProfile.deleteMany({ user: { $in: userIds } });
  await ProviderProfile.deleteMany({ _id: { $in: providerIds } });
}

await clearDemoData();

const sampleDocName = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png';
const samplePng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);
await fs.writeFile(path.join(uploadPaths.documents, sampleDocName), samplePng);

const today = formatDateInTz(new Date(), settings.timezone || 'Asia/Kolkata');
const featuredUntil = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);
const users = {};

for (const [name, email, phone, line1, pincode, lat, lng] of customers) {
  const user = await User.findOneAndUpdate(
    { email },
    { name, email, phone, passwordHash, role: 'customer', isActive: true, isDemo: true },
    { upsert: true, new: true }
  );
  users[email] = user;
  const addresses = [{
    label: 'Home',
    line1,
    line2: '',
    city: 'Pune',
    state: 'Maharashtra',
    pincode,
    lat,
    lng,
    isDefault: true,
  }];
  if (email === 'customer@demo.servicenest.local') {
    addresses.push({
      label: 'Office',
      line1: '12 Demo Business Park',
      line2: 'Sample Wing',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411014',
      lat: 18.55,
      lng: 73.91,
      isDefault: false,
    });
  }
  await CustomerProfile.create({ user: user._id, addresses });
}

const providersByEmail = {};
const listingsByEmail = {};

for (const row of providerSeeds) {
  const [email, name, phone, businessName, categorySlug, lat, lng, featured, status, planSlug, experienceYears, pricePaise, listingTitle] = row;
  const user = await User.findOneAndUpdate(
    { email },
    { name, email, phone, passwordHash, role: 'provider', isActive: true, isDemo: true },
    { upsert: true, new: true }
  );
  users[email] = user;
  const category = bySlug[categorySlug];
  const plan = plansBySlug[planSlug];
  const provider = await ProviderProfile.create({
    user: user._id,
    businessName,
    bio: `${businessName} is a sample profile in the ServiceNest demo. This is not a real business.`,
    experienceYears,
    categories: [category._id],
    city: 'Pune',
    state: 'Maharashtra',
    serviceRadiusKm: 15,
    location: { type: 'Point', coordinates: [lng, lat] },
    verificationStatus: status,
    verificationNote: status === 'approved'
      ? 'Sample approval for the demo. This is not a real identity check.'
      : 'Sample application waiting in the demo queue.',
    documents: status === 'pending' ? [{
      docType: 'id_proof',
      originalName: 'sample-id.png',
      storedName: sampleDocName,
      mimeType: 'image/png',
      size: samplePng.length,
    }] : [],
    isFeatured: Boolean(featured) && status === 'approved',
    featuredUntil: featured && status === 'approved' ? featuredUntil : undefined,
    whatsappNumber: phone,
    isDemo: true,
  });
  providersByEmail[email] = provider;
  await ProviderSubscription.create({
    provider: provider._id,
    plan: plan._id,
    status: 'active',
    endsAt: featuredUntil,
    source: 'seed',
    amountPaise: 0,
  });
  await AvailabilitySlot.insertMany([1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    provider: provider._id,
    kind: 'weekly',
    dayOfWeek,
    startTime: '09:00',
    endTime: '17:00',
    slotMinutes: 60,
    isActive: true,
  })));
  const primary = await ServiceListing.create({
    provider: provider._id,
    category: category._id,
    title: listingTitle,
    description: 'Dummy service for the ServiceNest demo. The price is a sample figure, not a real quote.',
    pricePaise,
    priceUnit: 'visit',
    durationMinutes: 60,
    isActive: true,
  });
  listingsByEmail[email] = primary;
  if (planSlug === 'basic' || planSlug === 'premium') {
    await ServiceListing.create({
      provider: provider._id,
      category: category._id,
      title: `${listingTitle} follow-up`,
      description: 'Extra sample listing so this paid demo plan shows more than one service.',
      pricePaise: Math.max(29900, pricePaise - 10000),
      priceUnit: 'visit',
      durationMinutes: 60,
      isActive: true,
    });
  }
}

let reviewCursor = 0;
let responsesLeft = 2;
const openDisputeBooking = { current: null };
const resolvedDisputeBooking = { current: null };

for (let index = 0; index < jobs.length; index += 1) {
  const [customerEmail, providerEmail, dayOffset, startTime, status, rating] = jobs[index];
  const customer = users[customerEmail];
  const providerUser = users[providerEmail];
  const provider = providersByEmail[providerEmail];
  const listing = listingsByEmail[providerEmail];
  const category = bySlug[providerSeeds.find((row) => row[0] === providerEmail)[4]];
  const profile = await CustomerProfile.findOne({ user: customer._id });
  const address = profile.addresses[0];
  const scheduledDate = addDays(today, dayOffset);
  const when = dayOffset < 0 ? new Date(`${scheduledDate}T04:30:00.000Z`) : new Date();
  const quote = quoteAmounts(listing.pricePaise, settings);
  const booking = await Booking.create({
    reference: `SN-DEMO-${String(index + 1).padStart(4, '0')}`,
    customer: customer._id,
    provider: provider._id,
    listing: listing._id,
    category: category._id,
    serviceTitle: listing.title,
    categoryName: category.name,
    providerName: provider.businessName,
    scheduledDate,
    startTime,
    endTime: hourLater(startTime),
    serviceAddress: {
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      lat: address.lat,
      lng: address.lng,
    },
    issueDescription: 'Sample booking for the ServiceNest demo. No real job was requested.',
    status,
    statusHistory: [{ status, at: when, by: customer._id, note: 'Dummy status for the demo dataset.' }],
    serviceAmountPaise: quote.serviceAmountPaise,
    platformFeePaise: quote.platformFeePaise,
    taxPaise: quote.taxPaise,
    gatewayFeePaise: 0,
    totalPaise: quote.totalPaise,
    commissionRateBps: quote.commissionRateBps,
    providerSharePaise: quote.providerSharePaise,
    paymentMethod: 'cod',
    paymentStatus: status === 'completed' ? 'paid' : 'unpaid',
    cancellation: ['cancelled', 'rejected'].includes(status) ? {
      requestedBy: status === 'cancelled' ? customer._id : providerUser._id,
      requestedByRole: status === 'cancelled' ? 'customer' : 'provider',
      reason: 'Sample cancellation for the demo. Nothing real was cancelled.',
      at: when,
    } : undefined,
  });
  await Booking.collection.updateOne(
    { _id: booking._id },
    { $set: { createdAt: when, updatedAt: when } }
  );

  if (status === 'completed') {
    const payment = await Payment.create({
      purpose: 'booking',
      booking: booking._id,
      customer: customer._id,
      provider: provider._id,
      amountPaise: quote.totalPaise,
      method: 'cod',
      status: 'paid',
      idempotencyKey: `seed:${booking._id}`,
      verifiedAt: when,
    });
    await Payment.collection.updateOne({ _id: payment._id }, { $set: { createdAt: when, updatedAt: when } });
    const commission = await Commission.create({
      booking: booking._id,
      provider: provider._id,
      serviceAmountPaise: quote.serviceAmountPaise,
      rateBps: quote.commissionRateBps,
      commissionPaise: quote.platformFeePaise,
      providerSharePaise: quote.providerSharePaise,
      status: 'accrued',
    });
    await Commission.collection.updateOne({ _id: commission._id }, { $set: { createdAt: when, updatedAt: when } });
    const review = await Review.create({
      booking: booking._id,
      customer: customer._id,
      provider: provider._id,
      rating,
      comment: reviewComments[reviewCursor % reviewComments.length],
      providerResponse: responsesLeft > 0 && rating === 5
        ? 'Sample reply from the demo provider. Not a real message.'
        : '',
      providerRespondedAt: responsesLeft > 0 && rating === 5 ? when : undefined,
    });
    await Review.collection.updateOne({ _id: review._id }, { $set: { createdAt: when, updatedAt: when } });
    if (review.providerResponse) responsesLeft -= 1;
    reviewCursor += 1;
    if (providerEmail === 'leakfix@demo.servicenest.local' && dayOffset === -15) openDisputeBooking.current = booking;
    if (providerEmail === 'bugfree@demo.servicenest.local' && dayOffset === -6) resolvedDisputeBooking.current = booking;
  }
}

const admin = await User.findOne({ role: 'admin' });
await Dispute.create({
  booking: openDisputeBooking.current._id,
  raisedBy: openDisputeBooking.current.customer,
  reason: 'Sample quality issue',
  description: 'Demo dispute so the queue is not empty. This is not a real complaint.',
  status: 'open',
});
await Dispute.create({
  booking: resolvedDisputeBooking.current._id,
  raisedBy: resolvedDisputeBooking.current.customer,
  reason: 'Sample billing question',
  description: 'Demo dispute that is already closed. No real refund was issued.',
  status: 'resolved',
  resolution: 'Sample resolution recorded for the demo. No money moved.',
  refundPaise: 0,
  adminNote: 'Closed in the dummy dataset.',
  resolvedBy: admin?._id,
  resolvedAt: new Date(),
});

const electrician = providersByEmail['electrician@demo.servicenest.local'];
const electricianCommissions = await Commission.find({ provider: electrician._id }).sort({ createdAt: 1 });
const oldestCommission = electricianCommissions[0];
const paidPayout = await Payout.create({
  provider: electrician._id,
  grossPaise: oldestCommission.serviceAmountPaise,
  commissionPaise: oldestCommission.commissionPaise,
  netPaise: oldestCommission.providerSharePaise,
  status: 'paid',
  commissionIds: [oldestCommission._id],
  paidAt: new Date(),
  referenceNote: 'Demo payout record. No real transfer was made.',
  createdBy: admin?._id,
});
oldestCommission.payout = paidPayout._id;
await oldestCommission.save();

const cleaning = providersByEmail['cleaning@demo.servicenest.local'];
const cleaningCommissions = await Commission.find({ provider: cleaning._id });
const pendingPayout = await Payout.create({
  provider: cleaning._id,
  grossPaise: cleaningCommissions.reduce((sum, row) => sum + row.serviceAmountPaise, 0),
  commissionPaise: cleaningCommissions.reduce((sum, row) => sum + row.commissionPaise, 0),
  netPaise: cleaningCommissions.reduce((sum, row) => sum + row.providerSharePaise, 0),
  status: 'pending',
  commissionIds: cleaningCommissions.map((row) => row._id),
  referenceNote: 'Demo payout still waiting. No real transfer was made.',
  createdBy: admin?._id,
});
await Commission.updateMany(
  { _id: { $in: cleaningCommissions.map((row) => row._id) } },
  { $set: { payout: pendingPayout._id } }
);

const ratingStats = await Review.aggregate([
  { $group: { _id: '$provider', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
]);
for (const stat of ratingStats) {
  await ProviderProfile.updateOne(
    { _id: stat._id },
    { ratingAvg: Math.round(stat.avg * 10) / 10, ratingCount: stat.count }
  );
}

const sampleBooking = await Booking.findOne({ customer: users['customer@demo.servicenest.local']._id }).sort({ scheduledDate: 1 });
await Notification.create([
  {
    user: users['customer@demo.servicenest.local']._id,
    type: 'booking_created',
    title: 'Your demo bookings are ready',
    body: 'These visits are dummy data for ServiceNest. No real professional was booked.',
    link: `/dashboard/bookings/${sampleBooking._id}`,
    emailStatus: 'skipped',
    dedupeKey: 'seed:customer:bookings',
  },
  {
    user: users['customer@demo.servicenest.local']._id,
    type: 'dispute_update',
    title: 'A sample dispute is open',
    body: 'The leak-repair dispute is fictional and only fills the demo queue.',
    link: '/dashboard',
    emailStatus: 'skipped',
    dedupeKey: 'seed:customer:dispute',
  },
  {
    user: users['electrician@demo.servicenest.local']._id,
    type: 'booking_created',
    title: 'Sample jobs are on your calendar',
    body: 'Completed demo jobs are fictional. Earnings figures are sample amounts.',
    link: '/dashboard',
    emailStatus: 'skipped',
    dedupeKey: 'seed:electrician:jobs',
  },
  {
    user: users['electrician@demo.servicenest.local']._id,
    type: 'payment_update',
    title: 'A sample payout was marked paid',
    body: 'This payout record is for the demo only. No real transfer was made.',
    link: '/dashboard',
    emailStatus: 'skipped',
    dedupeKey: 'seed:electrician:payout',
  },
]);

console.log(`Seed complete. Demo password: ${demoPassword}`);
console.log(`Dummy customers: ${customers.length}. Dummy providers: ${providerSeeds.length}. Dummy bookings: ${jobs.length}.`);
console.log('Main customer: customer@demo.servicenest.local');
console.log('Painter and carpenter stay in the approval queue. Every @demo.servicenest.local account uses the demo password.');
await mongoose.disconnect();

