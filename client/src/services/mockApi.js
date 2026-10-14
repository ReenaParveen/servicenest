const DB_KEY = 'servicenest-mock-db-v1';
const SESSION_KEY = 'servicenest-mock-session';
const DEMO_PASSWORD = 'DemoPass123!';
const ADMIN_PASSWORD = 'AdminPass1234';

const memory = new Map();
const storage = typeof sessionStorage === 'undefined'
  ? { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: (key) => memory.delete(key) }
  : sessionStorage;

let cached = null;
let onUnauthorized = () => {};

export function setMockUnauthorized(handler) {
  onUnauthorized = handler;
}

function day(offset) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const dateNumber = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${dateNumber}`;
}

function today() {
  return day(0);
}

function quote(serviceAmountPaise) {
  const platformFeePaise = Math.round((serviceAmountPaise * 1000) / 10000);
  return {
    serviceAmountPaise,
    platformFeePaise,
    taxPaise: 0,
    gatewayFeePaise: 0,
    totalPaise: serviceAmountPaise,
    providerSharePaise: serviceAmountPaise - platformFeePaise,
    commissionRateBps: 1000,
  };
}

function createDb() {
  let seq = 1;
  const id = (prefix) => `${prefix}-${seq++}`;
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
  ].map(([name, slug, icon, description], index) => ({ id: id('cat'), name, slug, icon, description, isActive: true, sortOrder: index + 1 }));
  const bySlug = Object.fromEntries(categories.map((category) => [category.slug, category]));
  const plans = [
    { id: id('plan'), name: 'Free', slug: 'free', tier: 'free', pricePaiseMonthly: 0, maxActiveListings: 1, featuredEligible: false, analyticsLevel: 'basic', isActive: true, features: ['1 active service listing', 'Booking inbox', 'Basic earnings totals'], sortOrder: 1 },
    { id: id('plan'), name: 'Basic', slug: 'basic', tier: 'basic', pricePaiseMonthly: 49900, maxActiveListings: 5, featuredEligible: false, analyticsLevel: 'basic', isActive: true, features: ['5 active service listings', 'Booking inbox', 'Basic earnings totals'], sortOrder: 2 },
    { id: id('plan'), name: 'Premium', slug: 'premium', tier: 'premium', pricePaiseMonthly: 149900, maxActiveListings: 20, featuredEligible: true, analyticsLevel: 'advanced', isActive: true, features: ['20 active service listings', 'Promoted placement eligibility', 'Earnings chart'], sortOrder: 3 },
  ];
  const planBySlug = Object.fromEntries(plans.map((plan) => [plan.slug, plan]));
  const featuredUntil = new Date(Date.now() + 45 * 86400000).toISOString();
  const users = [{
    id: id('user'), name: 'Platform Admin', email: 'admin@servicenest.local', phone: '9000000099', password: ADMIN_PASSWORD, role: 'admin', isActive: true, isDemo: false,
  }];
  const customers = [
    ['Demo Customer', 'customer@demo.servicenest.local', '9000000001', '221 Demo Residency, Sample Nagar', '411001', 18.5204, 73.8567],
    ['Demo Meera', 'meera@demo.servicenest.local', '9000000102', '14 Dummy Colony, Trial Layout', '411004', 18.531, 73.85],
    ['Demo Rohan', 'rohan@demo.servicenest.local', '9000000103', '88 Sample Heights, Mock Nagar', '411038', 18.508, 73.842],
    ['Demo Anita', 'anita@demo.servicenest.local', '9000000104', '5 Practice Park, Example Road', '411001', 18.526, 73.862],
  ].map(([name, email, phone, line1, pincode, lat, lng]) => {
    const user = { id: id('user'), name, email, phone, password: DEMO_PASSWORD, role: 'customer', isActive: true, isDemo: true };
    users.push(user);
    const addresses = [{ id: id('addr'), label: 'Home', line1, line2: '', city: 'Pune', state: 'Maharashtra', pincode, lat, lng, isDefault: true }];
    if (email.startsWith('customer@')) {
      addresses.push({ id: id('addr'), label: 'Office', line1: '12 Demo Business Park', line2: 'Sample Wing', city: 'Pune', state: 'Maharashtra', pincode: '411014', lat: 18.55, lng: 73.91, isDefault: false });
    }
    return { userId: user.id, addresses };
  });
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
  const providers = [];
  const listings = [];
  const availability = [];
  providerSeeds.forEach((row, index) => {
    const [email, name, phone, businessName, slug, lat, lng, featured, status, planSlug, experienceYears, pricePaise, title] = row;
    const user = { id: id('user'), name, email, phone, password: DEMO_PASSWORD, role: 'provider', isActive: true, isDemo: true };
    users.push(user);
    const category = bySlug[slug];
    const provider = {
      id: id('provider'),
      userId: user.id,
      businessName,
      bio: `${businessName} is a sample profile in the ServiceNest demo. This is not a real business.`,
      experienceYears,
      categoryIds: [category.id],
      city: 'Pune',
      state: 'Maharashtra',
      serviceRadiusKm: 15,
      lat,
      lng,
      verificationStatus: status,
      verificationNote: status === 'approved' ? 'Sample approval for the demo. This is not a real identity check.' : 'Sample application waiting in the demo queue.',
      documents: status === 'pending' ? [{ id: id('doc'), docType: 'id_proof', originalName: 'sample-id.png', url: `/images/services/${slug}.jpg` }] : [],
      promoted: Boolean(featured) && status === 'approved',
      featuredUntil: featured && status === 'approved' ? featuredUntil : null,
      whatsappNumber: phone,
      isDemo: true,
      portfolio: [],
      planId: planBySlug[planSlug].id,
    };
    providers.push(provider);
    listings.push({
      id: id('listing'), providerId: provider.id, categoryId: category.id, title, description: 'Dummy service for the ServiceNest demo. The price is a sample figure, not a real quote.', pricePaise, priceUnit: 'visit', durationMinutes: 60, isActive: true,
    });
    if (planSlug === 'basic' || planSlug === 'premium') {
      listings.push({
        id: id('listing'), providerId: provider.id, categoryId: category.id, title: `${title} follow-up`, description: 'Extra sample listing so this paid demo plan shows more than one service.', pricePaise: Math.max(29900, pricePaise - 10000), priceUnit: 'visit', durationMinutes: 60, isActive: true,
      });
    }
    availability.push({
      providerId: provider.id,
      weekly: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ id: id('slot'), dayOfWeek, startTime: '09:00', endTime: '17:00', slotMinutes: 60, isActive: true })),
      blocks: [],
    });
    provider.seedIndex = index;
  });
  const userByEmail = Object.fromEntries(users.map((user) => [user.email, user]));
  const providerByEmail = Object.fromEntries(providerSeeds.map((row, index) => [row[0], providers[index]]));
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
  const comments = [
    'Sample five-star note for the demo. Not a real review.',
    'Demo feedback only. This sample visit is fictional.',
    'Practice review so the profile is not empty. Not a real customer.',
    'Dummy comment for the ServiceNest sample dataset.',
  ];
  const bookings = [];
  const reviews = [];
  const payments = [];
  const commissions = [];
  let responsesLeft = 2;
  jobs.forEach((job, index) => {
    const [customerEmail, providerEmail, offset, startTime, status, rating] = job;
    const provider = providerByEmail[providerEmail];
    const listing = listings.find((item) => item.providerId === provider.id);
    const category = categories.find((item) => item.id === listing.categoryId);
    const amounts = quote(listing.pricePaise);
    const scheduledDate = day(offset);
    const hour = Number(startTime.slice(0, 2)) + 1;
    const booking = {
      id: id('booking'),
      reference: `SN-DEMO-${String(index + 1).padStart(4, '0')}`,
      customerId: userByEmail[customerEmail].id,
      providerId: provider.id,
      listingId: listing.id,
      serviceTitle: listing.title,
      categoryName: category.name,
      scheduledDate,
      startTime,
      endTime: `${String(hour).padStart(2, '0')}:00`,
      issueDescription: 'Sample booking for the ServiceNest demo. No real job was requested.',
      status,
      paymentMethod: 'cod',
      paymentStatus: status === 'completed' ? 'paid' : 'unpaid',
      ...amounts,
      photos: [],
      createdAt: offset < 0 ? `${scheduledDate}T04:30:00.000Z` : new Date().toISOString(),
      cancellation: ['cancelled', 'rejected'].includes(status) ? { reason: 'Sample cancellation for the demo. Nothing real was cancelled.' } : null,
    };
    bookings.push(booking);
    if (status === 'completed') {
      payments.push({ id: id('pay'), purpose: 'booking', bookingId: booking.id, amountPaise: amounts.totalPaise, method: 'cod', status: 'paid', createdAt: booking.createdAt });
      commissions.push({ id: id('com'), bookingId: booking.id, providerId: provider.id, ...amounts, rateBps: 1000, commissionPaise: amounts.platformFeePaise, status: 'accrued', payoutId: null, createdAt: booking.createdAt });
      reviews.push({
        id: id('review'),
        bookingId: booking.id,
        customerId: booking.customerId,
        providerId: provider.id,
        rating,
        comment: comments[index % comments.length],
        providerResponse: responsesLeft > 0 && rating === 5 ? 'Sample reply from the demo provider. Not a real message.' : '',
        createdAt: booking.createdAt,
      });
      if (responsesLeft > 0 && rating === 5) responsesLeft -= 1;
    }
  });
  const leak = bookings.find((booking) => booking.providerId === providerByEmail['leakfix@demo.servicenest.local'].id && booking.status === 'completed');
  const bug = bookings.find((booking) => booking.providerId === providerByEmail['bugfree@demo.servicenest.local'].id && booking.status === 'completed');
  const disputes = [
    { id: id('dispute'), bookingId: leak.id, raisedBy: leak.customerId, reason: 'Sample quality issue', description: 'Demo dispute so the queue is not empty. This is not a real complaint.', status: 'open', resolution: '', refundPaise: 0 },
    { id: id('dispute'), bookingId: bug.id, raisedBy: bug.customerId, reason: 'Sample billing question', description: 'Demo dispute that is already closed. No real refund was issued.', status: 'resolved', resolution: 'Sample resolution recorded for the demo. No money moved.', refundPaise: 0 },
  ];
  const electrician = providerByEmail['electrician@demo.servicenest.local'];
  const oldest = commissions.filter((row) => row.providerId === electrician.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  const payouts = [{
    id: id('payout'), providerId: electrician.id, grossPaise: oldest.serviceAmountPaise, commissionPaise: oldest.commissionPaise, netPaise: oldest.providerSharePaise, status: 'paid', referenceNote: 'Demo payout record. No real transfer was made.',
  }];
  oldest.payoutId = payouts[0].id;
  const cleaningRows = commissions.filter((row) => row.providerId === providerByEmail['cleaning@demo.servicenest.local'].id);
  const pendingPayout = {
    id: id('payout'),
    providerId: providerByEmail['cleaning@demo.servicenest.local'].id,
    grossPaise: cleaningRows.reduce((sum, row) => sum + row.serviceAmountPaise, 0),
    commissionPaise: cleaningRows.reduce((sum, row) => sum + row.commissionPaise, 0),
    netPaise: cleaningRows.reduce((sum, row) => sum + row.providerSharePaise, 0),
    status: 'pending',
    referenceNote: 'Demo payout still waiting. No real transfer was made.',
  };
  payouts.push(pendingPayout);
  cleaningRows.forEach((row) => { row.payoutId = pendingPayout.id; });
  const mainCustomer = userByEmail['customer@demo.servicenest.local'];
  const notifications = [
    { id: id('note'), userId: mainCustomer.id, type: 'booking_created', title: 'Your demo bookings are ready', body: 'These visits are dummy data for ServiceNest. No real professional was booked.', link: `/dashboard/bookings/${bookings[0].id}`, readAt: null },
    { id: id('note'), userId: mainCustomer.id, type: 'dispute_update', title: 'A sample dispute is open', body: 'The leak-repair dispute is fictional and only fills the demo queue.', link: '/dashboard', readAt: null },
    { id: id('note'), userId: electrician.userId, type: 'booking_created', title: 'Sample jobs are on your calendar', body: 'Completed demo jobs are fictional. Earnings figures are sample amounts.', link: '/provider/jobs', readAt: null },
    { id: id('note'), userId: electrician.userId, type: 'payment_update', title: 'A sample payout was marked paid', body: 'This payout record is for the demo only. No real transfer was made.', link: '/provider/earnings', readAt: null },
  ];
  return {
    categories, plans, users, customers, providers, listings, availability, bookings, reviews, disputes, payments, commissions, payouts, notifications,
    settings: { platformName: 'ServiceNest', commissionRateBps: 1000, taxRateBps: 0, codEnabled: true, supportEmail: 'support@demo.servicenest.local', supportPhone: '9000000000', featuredPricePaise: 49900, featuredDurationDays: 30 },
    seq,
  };
}

function loadDb() {
  if (cached) return cached;
  try {
    const raw = storage.getItem(DB_KEY);
    if (raw) cached = JSON.parse(raw);
  } catch {
    cached = null;
  }
  if (!cached) {
    cached = createDb();
    storage.setItem(DB_KEY, JSON.stringify(cached));
  }
  return cached;
}

function saveDb() {
  storage.setItem(DB_KEY, JSON.stringify(cached));
}

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  error.errors = [];
  throw error;
}

function userById(db, userId) {
  return db.users.find((user) => user.id === userId);
}

function currentUser(db) {
  const userId = storage.getItem(SESSION_KEY);
  const user = userById(db, userId);
  if (!user || !user.isActive) return null;
  return user;
}

function requireUser(db) {
  const user = currentUser(db);
  if (!user) fail(401, 'Please log in again.');
  return user;
}

function publicUser(user) {
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, isActive: user.isActive, isDemo: user.isDemo };
}

function categoryById(db, categoryId) {
  return db.categories.find((category) => category.id === categoryId);
}

function providerById(db, providerId) {
  return db.providers.find((provider) => provider.id === providerId);
}

function providerForUser(db, user) {
  return db.providers.find((provider) => provider.userId === user.id);
}

function listingsFor(db, providerId) {
  return db.listings.filter((listing) => listing.providerId === providerId && listing.isActive);
}

function presentListing(db, listing) {
  const category = categoryById(db, listing.categoryId);
  return { ...listing, category };
}

function ratingFor(db, providerId) {
  const rows = db.reviews.filter((review) => review.providerId === providerId);
  if (!rows.length) return { ratingAvg: 0, ratingCount: 0 };
  const avg = rows.reduce((sum, review) => sum + review.rating, 0) / rows.length;
  return { ratingAvg: Math.round(avg * 10) / 10, ratingCount: rows.length };
}

function presentProvider(db, provider, { detailed = false } = {}) {
  const services = listingsFor(db, provider.id).map((listing) => presentListing(db, listing));
  const prices = services.map((service) => service.pricePaise);
  const rating = ratingFor(db, provider);
  const plan = db.plans.find((item) => item.id === provider.planId);
  const promoted = Boolean(provider.promoted && provider.featuredUntil && new Date(provider.featuredUntil) > new Date());
  const card = {
    id: provider.id,
    businessName: provider.businessName,
    bio: provider.bio,
    experienceYears: provider.experienceYears,
    city: provider.city,
    state: provider.state,
    serviceRadiusKm: provider.serviceRadiusKm,
    lat: provider.lat,
    lng: provider.lng,
    distanceKm: null,
    verificationStatus: provider.verificationStatus,
    promoted,
    ...rating,
    categories: provider.categoryIds.map((categoryId) => categoryById(db, categoryId)).filter(Boolean),
    portfolio: provider.portfolio,
    isDemo: provider.isDemo,
    startingPricePaise: prices.length ? Math.min(...prices) : null,
    services,
  };
  if (!detailed) return card;
  const owner = userById(db, provider.userId);
  return {
    ...card,
    whatsappNumber: provider.whatsappNumber,
    verificationNote: provider.verificationNote,
    email: owner?.email || '',
    phone: owner?.phone || '',
    documents: provider.documents,
    owner: publicUser(owner),
    subscription: plan ? { id: provider.planId, status: 'active', plan, source: 'seed' } : null,
  };
}

function presentBooking(db, booking, viewer) {
  const provider = providerById(db, booking.providerId);
  const customer = userById(db, booking.customerId);
  const isCustomer = viewer && viewer.id === customer?.id;
  const isProvider = viewer && provider && viewer.id === provider.userId;
  const isAdmin = viewer?.role === 'admin';
  const contactOpen = ['accepted', 'in_progress', 'completed'].includes(booking.status);
  const review = db.reviews.find((item) => item.bookingId === booking.id);
  const dispute = db.disputes.find((item) => item.bookingId === booking.id);
  return {
    ...booking,
    providerName: provider?.businessName || '',
    customer: { id: customer?.id, name: customer?.name || 'Customer', phone: isAdmin || (isProvider && contactOpen) ? customer?.phone : undefined },
    provider: {
      id: provider?.id,
      businessName: provider?.businessName,
      verificationStatus: provider?.verificationStatus,
      city: provider?.city,
      promoted: Boolean(provider?.promoted),
      whatsappNumber: isCustomer && contactOpen ? provider?.whatsappNumber : undefined,
    },
    serviceAddress: isCustomer || isAdmin || (isProvider && contactOpen)
      ? (db.customers.find((item) => item.userId === booking.customerId)?.addresses[0] || { city: 'Pune' })
      : { city: 'Pune' },
    review: review ? { rating: review.rating, comment: review.comment } : null,
    dispute: dispute ? { id: dispute.id, status: dispute.status, reason: dispute.reason } : null,
  };
}

function presentReview(db, review) {
  return {
    ...review,
    customerName: userById(db, review.customerId)?.name || 'Customer',
    providerName: providerById(db, review.providerId)?.businessName || '',
    isDemo: true,
  };
}

function earningsFor(db, providerId) {
  const rows = db.commissions.filter((row) => row.providerId === providerId && row.status === 'accrued');
  const payouts = db.payouts.filter((row) => row.providerId === providerId);
  const sum = (list, key) => list.reduce((total, row) => total + row[key], 0);
  return {
    grossPaise: sum(rows, 'serviceAmountPaise'),
    commissionPaise: sum(rows, 'commissionPaise'),
    netPaise: sum(rows, 'providerSharePaise'),
    pendingPayoutPaise: sum(payouts.filter((row) => row.status === 'pending'), 'netPaise'),
    paidPayoutPaise: sum(payouts.filter((row) => row.status === 'paid'), 'netPaise'),
    payouts,
    commissions: rows.map((row) => {
      const booking = db.bookings.find((item) => item.id === row.bookingId);
      return { ...row, reference: booking?.reference, serviceTitle: booking?.serviceTitle };
    }),
    series: Object.values(rows.reduce((groups, row) => {
      const date = row.createdAt.slice(0, 10);
      if (!groups[date]) groups[date] = { date, netPaise: 0, commissionPaise: 0 };
      groups[date].netPaise += row.providerSharePaise;
      groups[date].commissionPaise += row.commissionPaise;
      return groups;
    }, {})).sort((a, b) => a.date.localeCompare(b.date)),
    analyticsLevel: db.plans.find((plan) => plan.id === providerById(db, providerId)?.planId)?.analyticsLevel || 'basic',
  };
}

function page(items, params, fallback = 12) {
  const pageNumber = Number(params.page) || 1;
  const limit = Number(params.limit) || fallback;
  const start = (pageNumber - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    pagination: { page: pageNumber, limit, total: items.length, pages: Math.max(1, Math.ceil(items.length / limit)) },
  };
}

function searchProviders(db, params) {
  let items = db.providers
    .filter((provider) => provider.verificationStatus === 'approved')
    .map((provider) => presentProvider(db, provider))
    .filter((provider) => provider.startingPricePaise != null);
  if (params.category) items = items.filter((provider) => provider.categories.some((category) => category.slug === params.category));
  if (params.city) items = items.filter((provider) => provider.city.toLowerCase() === String(params.city).toLowerCase());
  if (params.q) items = items.filter((provider) => provider.businessName.toLowerCase().includes(String(params.q).toLowerCase()));
  if (params.minRating) items = items.filter((provider) => provider.ratingAvg >= Number(params.minRating));
  if (params.minPricePaise) items = items.filter((provider) => provider.startingPricePaise >= Number(params.minPricePaise));
  if (params.maxPricePaise) items = items.filter((provider) => provider.startingPricePaise <= Number(params.maxPricePaise));
  items.sort((a, b) => {
    if (params.sort === 'price_asc') return a.startingPricePaise - b.startingPricePaise;
    if (params.sort === 'price_desc') return b.startingPricePaise - a.startingPricePaise;
    if (params.sort === 'rating') return b.ratingAvg - a.ratingAvg;
    return Number(b.promoted) - Number(a.promoted) || b.ratingAvg - a.ratingAvg;
  });
  return page(items, params);
}

function slotsFor(db, providerId, date) {
  if (!date || date < today()) return [];
  const availability = db.availability.find((item) => item.providerId === providerId);
  if (!availability || availability.blocks.some((block) => block.date === date)) return [];
  const weekday = new Date(`${date}T12:00:00`).getDay();
  const rule = availability.weekly.find((item) => item.dayOfWeek === weekday && item.isActive);
  if (!rule) return [];
  const busy = new Set(db.bookings.filter((booking) => booking.providerId === providerId && booking.scheduledDate === date && !['cancelled', 'rejected'].includes(booking.status)).map((booking) => booking.startTime));
  const slots = [];
  let hour = Number(rule.startTime.slice(0, 2));
  const end = Number(rule.endTime.slice(0, 2));
  while (hour < end) {
    const startTime = `${String(hour).padStart(2, '0')}:00`;
    slots.push({ startTime, available: !busy.has(startTime) });
    hour += 1;
  }
  return slots;
}

function bookingsFor(db, user, params) {
  let rows = db.bookings;
  if (user.role === 'customer') rows = rows.filter((booking) => booking.customerId === user.id);
  if (user.role === 'provider') {
    const provider = providerForUser(db, user);
    rows = rows.filter((booking) => booking.providerId === provider?.id);
  }
  if (params.status) rows = rows.filter((booking) => booking.status === params.status);
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((booking) => presentBooking(db, booking, user));
}

function bodyOf(body) {
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return { docType: body.get('docType'), fileName: body.get('document')?.name || body.get('image')?.name || 'upload.png' };
  }
  return body || {};
}

function route(method, path, body, params, db) {
  const ok = (data, extra = {}) => ({ success: true, data, ...extra });
  if (method === 'get' && path === '/config/public') {
    return ok({ ...db.settings, currency: 'INR', paymentsMode: 'development', showDemoHints: true, mapsProvider: 'openstreetmap' });
  }
  if (method === 'get' && path === '/auth/me') {
    const user = currentUser(db);
    if (!user) fail(401, 'Please log in again.');
    return ok({ user: publicUser(user) });
  }
  if (method === 'post' && path === '/auth/login') {
    const user = db.users.find((item) => item.email.toLowerCase() === String(body.email || '').toLowerCase());
    if (!user || user.password !== body.password) fail(401, 'Email or password is incorrect.');
    if (!user.isActive) fail(403, 'This account is inactive.');
    storage.setItem(SESSION_KEY, user.id);
    return ok({ user: publicUser(user) });
  }
  if (method === 'post' && path === '/auth/logout') {
    storage.removeItem(SESSION_KEY);
    return ok({ ok: true });
  }
  if (method === 'post' && path === '/auth/register') {
    if (body.role === 'admin') fail(400, 'Administrator accounts cannot be created from this form.');
    if (db.users.some((user) => user.email.toLowerCase() === String(body.email).toLowerCase())) fail(409, 'An account with this email already exists.');
    const user = { id: `user-new-${db.seq++}`, name: body.name, email: body.email, phone: body.phone, password: body.password, role: body.role || 'customer', isActive: true, isDemo: true };
    db.users.push(user);
    if (user.role === 'provider') {
      const free = db.plans.find((plan) => plan.slug === 'free');
      db.providers.push({ id: `provider-new-${db.seq++}`, userId: user.id, businessName: body.businessName || `${body.name} Services`, bio: 'New sample provider created in this browser demo.', experienceYears: 1, categoryIds: [db.categories[0].id], city: 'Pune', state: 'Maharashtra', serviceRadiusKm: 10, lat: 18.52, lng: 73.85, verificationStatus: 'pending', verificationNote: 'Upload a sample document to join the demo queue.', documents: [], promoted: false, featuredUntil: null, whatsappNumber: body.phone, isDemo: true, portfolio: [], planId: free.id });
      db.availability.push({ providerId: db.providers.at(-1).id, weekly: [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ id: `slot-new-${db.seq++}`, dayOfWeek, startTime: '09:00', endTime: '17:00', slotMinutes: 60, isActive: true })), blocks: [] });
    } else {
      db.customers.push({ userId: user.id, addresses: [] });
    }
    storage.setItem(SESSION_KEY, user.id);
    return ok({ user: publicUser(user) });
  }
  if (method === 'patch' && path === '/auth/profile') {
    const user = requireUser(db);
    user.name = body.name || user.name;
    user.phone = body.phone || user.phone;
    return ok(publicUser(user));
  }
  if (method === 'patch' && path === '/auth/password') {
    const user = requireUser(db);
    if (user.password !== body.currentPassword) fail(400, 'Current password is incorrect.');
    user.password = body.newPassword;
    return ok({ ok: true });
  }
  if (method === 'get' && path === '/categories') return ok(db.categories.filter((category) => category.isActive));
  if (method === 'get' && path === '/plans') return ok(db.plans.filter((plan) => plan.isActive));
  if (method === 'get' && path === '/geo/search') {
    const query = String(params.q || '');
    const places = query.length < 3 ? [] : [{ label: `${query}, Pune, Maharashtra`, city: 'Pune', lat: 18.5204, lng: 73.8567 }];
    return ok(places);
  }
  if (method === 'get' && path === '/providers/search') return { success: true, ...searchProviders(db, params) };
  if (method === 'get' && path === '/providers/featured') {
    return ok(db.providers.filter((provider) => provider.verificationStatus === 'approved' && provider.promoted && provider.featuredUntil && new Date(provider.featuredUntil) > new Date()).slice(0, 8).map((provider) => presentProvider(db, provider)));
  }
  if (method === 'get' && path === '/reviews/recent') return ok(db.reviews.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map((review) => presentReview(db, review)));
  if (method === 'get' && path === '/notifications') return ok(db.notifications.filter((note) => note.userId === requireUser(db).id));
  const noteRead = path.match(/^\/notifications\/([^/]+)\/read$/);
  if (method === 'patch' && noteRead) {
    const note = db.notifications.find((item) => item.id === noteRead[1]);
    if (note) note.readAt = new Date().toISOString();
    return ok(note);
  }
  if (method === 'get' && path === '/customers/me') {
    const user = requireUser(db);
    return ok({ addresses: db.customers.find((item) => item.userId === user.id)?.addresses || [] });
  }
  if (method === 'post' && path === '/customers/me/addresses') {
    const user = requireUser(db);
    const profile = db.customers.find((item) => item.userId === user.id);
    profile.addresses.push({ id: `addr-${db.seq++}`, ...body, line2: body.line2 || '', isDefault: profile.addresses.length === 0 });
    return ok(profile.addresses);
  }
  const addressDelete = path.match(/^\/customers\/me\/addresses\/([^/]+)$/);
  if (method === 'delete' && addressDelete) {
    const profile = db.customers.find((item) => item.userId === requireUser(db).id);
    profile.addresses = profile.addresses.filter((address) => address.id !== addressDelete[1]);
    return ok(profile.addresses);
  }
  if (method === 'get' && path === '/customers/me/summary') {
    const user = requireUser(db);
    const rows = bookingsFor(db, user, {});
    const upcoming = rows.filter((booking) => ['pending', 'accepted', 'in_progress'].includes(booking.status) && booking.scheduledDate >= today());
    return ok({
      counts: { upcoming: upcoming.length, completed: rows.filter((booking) => booking.status === 'completed').length, cancelled: rows.filter((booking) => ['cancelled', 'rejected'].includes(booking.status)).length },
      upcoming: upcoming.slice(0, 5),
      recent: rows.slice(0, 6),
    });
  }
  if (method === 'get' && path === '/providers/me') {
    const provider = providerForUser(db, requireUser(db));
    if (!provider) fail(404, 'Provider profile not found.');
    return ok(presentProvider(db, provider, { detailed: true }));
  }
  if (method === 'patch' && path === '/providers/me') {
    const provider = providerForUser(db, requireUser(db));
    Object.assign(provider, { businessName: body.businessName, bio: body.bio, experienceYears: Number(body.experienceYears) || 0, city: body.city, state: body.state, serviceRadiusKm: Number(body.serviceRadiusKm) || 10, lat: body.lat, lng: body.lng, whatsappNumber: body.whatsappNumber, categoryIds: body.categoryIds || provider.categoryIds });
    return ok(presentProvider(db, provider, { detailed: true }));
  }
  if (method === 'get' && path === '/providers/me/listings') return ok(db.listings.filter((listing) => listing.providerId === providerForUser(db, requireUser(db))?.id).map((listing) => presentListing(db, listing)));
  if (method === 'post' && path === '/listings') {
    const provider = providerForUser(db, requireUser(db));
    const listing = { id: `listing-${db.seq++}`, providerId: provider.id, categoryId: body.categoryId, title: body.title, description: body.description, pricePaise: body.pricePaise, priceUnit: body.priceUnit || 'visit', durationMinutes: body.durationMinutes || 60, isActive: true };
    db.listings.push(listing);
    return ok(presentListing(db, listing));
  }
  const listingPatch = path.match(/^\/listings\/([^/]+)$/);
  if (method === 'patch' && listingPatch) {
    const listing = db.listings.find((item) => item.id === listingPatch[1]);
    if (body.isActive != null) listing.isActive = body.isActive;
    return ok(presentListing(db, listing));
  }
  if (method === 'get' && path === '/providers/me/availability') {
    const provider = providerForUser(db, requireUser(db));
    return ok(db.availability.find((item) => item.providerId === provider.id) || { weekly: [], blocks: [] });
  }
  if (method === 'put' && path === '/providers/me/availability') {
    const provider = providerForUser(db, requireUser(db));
    const record = db.availability.find((item) => item.providerId === provider.id);
    record.weekly = body.rules;
    return ok(record);
  }
  if (method === 'post' && path === '/providers/me/availability/blocks') {
    const provider = providerForUser(db, requireUser(db));
    const record = db.availability.find((item) => item.providerId === provider.id);
    record.blocks.push({ id: `block-${db.seq++}`, date: body.date });
    return ok(record.blocks);
  }
  const blockDelete = path.match(/^\/providers\/me\/availability\/blocks\/([^/]+)$/);
  if (method === 'delete' && blockDelete) {
    const provider = providerForUser(db, requireUser(db));
    const record = db.availability.find((item) => item.providerId === provider.id);
    record.blocks = record.blocks.filter((block) => block.id !== blockDelete[1]);
    return ok(record.blocks);
  }
  if (method === 'post' && path === '/providers/me/documents') {
    const provider = providerForUser(db, requireUser(db));
    const file = bodyOf(body);
    provider.documents.push({ id: `doc-${db.seq++}`, docType: file.docType || 'other', originalName: file.fileName, url: `/images/services/${categoryById(db, provider.categoryIds[0])?.slug || 'electrician'}.jpg` });
    return ok(presentProvider(db, provider, { detailed: true }));
  }
  if (method === 'post' && path === '/providers/me/portfolio') {
    const provider = providerForUser(db, requireUser(db));
    const slug = categoryById(db, provider.categoryIds[0])?.slug || 'electrician';
    provider.portfolio.push({ id: `image-${db.seq++}`, url: `/images/services/${slug}.jpg`, caption: 'Sample portfolio image' });
    return ok(presentProvider(db, provider, { detailed: true }));
  }
  if (method === 'post' && path === '/providers/me/subscription/free') {
    const provider = providerForUser(db, requireUser(db));
    provider.planId = db.plans.find((plan) => plan.slug === 'free').id;
    return ok(presentProvider(db, provider, { detailed: true }));
  }
  if (method === 'get' && path === '/providers/me/reviews') return ok(db.reviews.filter((review) => review.providerId === providerForUser(db, requireUser(db))?.id).map((review) => presentReview(db, review)));
  if (method === 'get' && path === '/providers/me/summary') {
    const user = requireUser(db);
    const provider = providerForUser(db, user);
    const rows = bookingsFor(db, user, {});
    const count = (status) => rows.filter((booking) => booking.status === status).length;
    return ok({
      profile: presentProvider(db, provider, { detailed: true }),
      counts: { today: rows.filter((booking) => booking.scheduledDate === today() && !['cancelled', 'rejected'].includes(booking.status)).length, pending: count('pending'), accepted: count('accepted'), inProgress: count('in_progress'), completed: count('completed'), cancelled: rows.filter((booking) => ['cancelled', 'rejected'].includes(booking.status)).length },
      earnings: earningsFor(db, provider.id),
      todayBookings: rows.filter((booking) => booking.scheduledDate === today()),
      pendingBookings: rows.filter((booking) => booking.status === 'pending'),
    });
  }
  if (method === 'get' && path === '/providers/me/earnings') return ok(earningsFor(db, providerForUser(db, requireUser(db)).id));
  const providerReviews = path.match(/^\/providers\/([^/]+)\/reviews$/);
  if (method === 'get' && providerReviews && providerReviews[1] !== 'me') return ok(db.reviews.filter((review) => review.providerId === providerReviews[1]).map((review) => presentReview(db, review)));
  const providerSlots = path.match(/^\/providers\/([^/]+)\/slots$/);
  if (method === 'get' && providerSlots) return ok(slotsFor(db, providerSlots[1], params.date));
  const providerOne = path.match(/^\/providers\/([^/]+)$/);
  if (method === 'get' && providerOne && !['search', 'featured', 'me'].includes(providerOne[1])) {
    const provider = providerById(db, providerOne[1]);
    if (!provider || provider.verificationStatus !== 'approved') fail(404, 'Provider not found.');
    return ok(presentProvider(db, provider));
  }
  if (method === 'post' && path === '/bookings/quote') {
    requireUser(db);
    const listing = db.listings.find((item) => item.id === body.listingId);
    if (!listing) fail(404, 'Service not found.');
    return ok(quote(listing.pricePaise));
  }
  if (method === 'post' && path === '/bookings') {
    const user = requireUser(db);
    const listing = db.listings.find((item) => item.id === body.listingId);
    const provider = providerById(db, listing.providerId);
    const category = categoryById(db, listing.categoryId);
    const amounts = quote(listing.pricePaise);
    const booking = { id: `booking-${db.seq++}`, reference: `SN-DEMO-${String(db.bookings.length + 1).padStart(4, '0')}`, customerId: user.id, providerId: provider.id, listingId: listing.id, serviceTitle: listing.title, categoryName: category.name, scheduledDate: body.scheduledDate, startTime: body.startTime, endTime: `${String(Number(body.startTime.slice(0, 2)) + 1).padStart(2, '0')}:00`, issueDescription: body.issueDescription, status: 'pending', paymentMethod: body.paymentMethod || 'cod', paymentStatus: 'unpaid', ...amounts, photos: [], createdAt: new Date().toISOString(), cancellation: null };
    db.bookings.push(booking);
    return ok(presentBooking(db, booking, user));
  }
  if (method === 'get' && path === '/bookings') return ok(bookingsFor(db, requireUser(db), params));
  const bookingOne = path.match(/^\/bookings\/([^/]+)$/);
  if (method === 'get' && bookingOne) {
    const user = requireUser(db);
    const booking = db.bookings.find((item) => item.id === bookingOne[1]);
    if (!booking) fail(404, 'Booking not found.');
    return ok(presentBooking(db, booking, user));
  }
  const transition = path.match(/^\/bookings\/([^/]+)\/transition$/);
  if (method === 'post' && transition) {
    const user = requireUser(db);
    const booking = db.bookings.find((item) => item.id === transition[1]);
    booking.status = body.toStatus;
    if (['cancelled', 'rejected'].includes(body.toStatus)) booking.cancellation = { reason: body.note || 'Updated in the demo.' };
    if (body.collectCash) booking.paymentStatus = 'paid';
    return ok(presentBooking(db, booking, user));
  }
  const cash = path.match(/^\/bookings\/([^/]+)\/collect-cash$/);
  if (method === 'post' && cash) {
    const user = requireUser(db);
    const booking = db.bookings.find((item) => item.id === cash[1]);
    booking.paymentStatus = 'paid';
    return ok(presentBooking(db, booking, user));
  }
  const photos = path.match(/^\/bookings\/([^/]+)\/photos$/);
  if (method === 'post' && photos) return ok({ ok: true });
  if (method === 'post' && path === '/payments/dev-simulate') {
    const user = requireUser(db);
    if (body.purpose === 'booking') {
      const booking = db.bookings.find((item) => item.id === body.bookingId);
      booking.paymentStatus = 'paid';
      booking.paymentMethod = 'dev_simulator';
    }
    if (body.purpose === 'subscription') {
      const provider = providerForUser(db, user);
      provider.planId = body.planId;
    }
    if (body.purpose === 'featured') {
      const provider = providerForUser(db, user);
      provider.promoted = true;
      provider.featuredUntil = new Date(Date.now() + 30 * 86400000).toISOString();
    }
    return ok({ status: 'paid' });
  }
  if (method === 'post' && path === '/reviews') {
    const user = requireUser(db);
    const review = { id: `review-${db.seq++}`, bookingId: body.bookingId, customerId: user.id, providerId: db.bookings.find((item) => item.id === body.bookingId)?.providerId, rating: body.rating, comment: body.comment, providerResponse: '', createdAt: new Date().toISOString() };
    db.reviews.push(review);
    return ok(presentReview(db, review));
  }
  const responseRoute = path.match(/^\/reviews\/([^/]+)\/response$/);
  if (method === 'post' && responseRoute) {
    const review = db.reviews.find((item) => item.id === responseRoute[1]);
    review.providerResponse = body.response;
    return ok(presentReview(db, review));
  }
  if (method === 'post' && path === '/disputes') {
    const user = requireUser(db);
    const dispute = { id: `dispute-${db.seq++}`, bookingId: body.bookingId, raisedBy: user.id, reason: body.reason, description: body.description, status: 'open', resolution: '', refundPaise: 0 };
    db.disputes.push(dispute);
    return ok(dispute);
  }
  if (method === 'get' && path === '/admin/overview') {
    requireUser(db);
    const accrued = db.commissions.filter((row) => row.status === 'accrued');
    const sum = (list, key) => list.reduce((total, row) => total + (row[key] || 0), 0);
    return ok({
      customers: db.users.filter((user) => user.role === 'customer').length,
      providers: db.providers.length,
      verifiedProviders: db.providers.filter((provider) => provider.verificationStatus === 'approved').length,
      pendingProviders: db.providers.filter((provider) => provider.verificationStatus === 'pending').length,
      bookings: db.bookings.length,
      completedBookings: db.bookings.filter((booking) => booking.status === 'completed').length,
      cancelledBookings: db.bookings.filter((booking) => ['cancelled', 'rejected'].includes(booking.status)).length,
      openDisputes: db.disputes.filter((dispute) => ['open', 'under_review'].includes(dispute.status)).length,
      grossBookingPaise: sum(accrued, 'serviceAmountPaise'),
      commissionPaise: sum(accrued, 'commissionPaise'),
      subscriptionPaise: 0,
      refundPaise: sum(db.payments, 'refundPaise'),
      recentBookings: db.bookings.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8).map((booking) => presentBooking(db, booking, { role: 'admin', id: 'admin' })),
      approvalQueue: db.providers.filter((provider) => provider.verificationStatus === 'pending').map((provider) => ({ id: provider.id, businessName: provider.businessName, city: provider.city, documentCount: provider.documents.length, ownerName: userById(db, provider.userId)?.name })),
      series: earningsFor(db, db.providers[0]?.id).series.map((row) => ({ date: row.date, grossPaise: row.netPaise + row.commissionPaise, commissionPaise: row.commissionPaise })),
    });
  }
  if (method === 'get' && path === '/admin/providers') {
    let rows = db.providers.map((provider) => presentProvider(db, provider, { detailed: true }));
    if (params.status) rows = rows.filter((provider) => provider.verificationStatus === params.status);
    return { success: true, ...page(rows, params, 50) };
  }
  const verify = path.match(/^\/admin\/providers\/([^/]+)\/verification$/);
  if (method === 'patch' && verify) {
    const provider = providerById(db, verify[1]);
    if (['rejected', 'suspended'].includes(body.status) && String(body.note || '').trim().length < 3) fail(422, 'Add a note explaining this decision.');
    if (body.status === 'approved' && provider.documents.length === 0) fail(400, 'This provider has not uploaded verification documents.');
    provider.verificationStatus = body.status;
    provider.verificationNote = body.note || '';
    return ok(presentProvider(db, provider, { detailed: true }));
  }
  const feature = path.match(/^\/admin\/providers\/([^/]+)\/featured$/);
  if (method === 'patch' && feature) {
    const provider = providerById(db, feature[1]);
    provider.promoted = Boolean(body.enabled);
    provider.featuredUntil = body.enabled ? new Date(Date.now() + (body.days || 30) * 86400000).toISOString() : null;
    return ok({ id: provider.id, promoted: provider.promoted });
  }
  if (method === 'get' && path === '/admin/users') {
    let rows = db.users.map(publicUser);
    if (params.role) rows = rows.filter((user) => user.role === params.role);
    if (params.q) {
      const query = String(params.q).toLowerCase();
      rows = rows.filter((user) => user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query));
    }
    return { success: true, ...page(rows, params, 50) };
  }
  const userStatus = path.match(/^\/admin\/users\/([^/]+)\/status$/);
  if (method === 'patch' && userStatus) {
    const actor = requireUser(db);
    if (userStatus[1] === actor.id) fail(400, 'You cannot change your own account status.');
    const user = userById(db, userStatus[1]);
    user.isActive = Boolean(body.isActive);
    return ok(publicUser(user));
  }
  if (method === 'get' && path === '/admin/bookings') return { success: true, ...page(bookingsFor(db, { role: 'admin', id: 'admin' }, params), params, 50) };
  if (method === 'get' && path === '/admin/disputes') {
    return ok(db.disputes.map((dispute) => ({ ...dispute, bookingReference: db.bookings.find((booking) => booking.id === dispute.bookingId)?.reference })));
  }
  const disputePatch = path.match(/^\/admin\/disputes\/([^/]+)$/);
  if (method === 'patch' && disputePatch) {
    const dispute = db.disputes.find((item) => item.id === disputePatch[1]);
    dispute.status = body.status;
    dispute.resolution = body.resolution || dispute.resolution;
    return ok(dispute);
  }
  if (method === 'get' && path === '/admin/categories') return ok(db.categories);
  if (method === 'post' && path === '/admin/categories') {
    const slug = String(body.name || 'service').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const category = { id: `cat-${db.seq++}`, name: body.name, slug, icon: body.icon || 'Handyman', description: body.description, isActive: true, sortOrder: db.categories.length + 1 };
    db.categories.push(category);
    return ok(category);
  }
  const categoryPatch = path.match(/^\/admin\/categories\/([^/]+)$/);
  if (method === 'patch' && categoryPatch) {
    const category = categoryById(db, categoryPatch[1]);
    if (body.isActive != null) category.isActive = body.isActive;
    return ok(category);
  }
  if (method === 'get' && path === '/admin/plans') return ok(db.plans);
  const planPatch = path.match(/^\/admin\/plans\/([^/]+)$/);
  if (method === 'patch' && planPatch) {
    const plan = db.plans.find((item) => item.id === planPatch[1]);
    if (body.isActive != null) plan.isActive = body.isActive;
    return ok(plan);
  }
  if (method === 'post' && path === '/admin/subscriptions/assign') {
    const provider = providerById(db, body.providerId);
    provider.planId = body.planId;
    return ok({ ok: true });
  }
  if (method === 'get' && path === '/admin/reports') {
    const accrued = db.commissions.filter((row) => row.status === 'accrued');
    const sum = (list, key) => list.reduce((total, row) => total + (row[key] || 0), 0);
    return ok({ grossBookingPaise: sum(accrued, 'serviceAmountPaise'), commissionPaise: sum(accrued, 'commissionPaise'), subscriptionPaise: 0, refundPaise: sum(db.payments, 'refundPaise') });
  }
  if (method === 'get' && path === '/admin/payments') return ok(db.payments);
  if (method === 'get' && path === '/admin/payouts') return ok(db.payouts.map((payout) => ({ ...payout, providerName: providerById(db, payout.providerId)?.businessName })));
  if (method === 'post' && path === '/admin/payouts/generate') {
    const open = db.commissions.filter((row) => row.providerId === body.providerId && row.status === 'accrued' && !row.payoutId);
    if (!open.length) fail(400, 'This provider has no unpaid commission.');
    const payout = { id: `payout-${db.seq++}`, providerId: body.providerId, grossPaise: open.reduce((sum, row) => sum + row.serviceAmountPaise, 0), commissionPaise: open.reduce((sum, row) => sum + row.commissionPaise, 0), netPaise: open.reduce((sum, row) => sum + row.providerSharePaise, 0), status: 'pending', referenceNote: 'Generated in the browser demo.' };
    open.forEach((row) => { row.payoutId = payout.id; });
    db.payouts.unshift(payout);
    return ok(payout);
  }
  const payoutPaid = path.match(/^\/admin\/payouts\/([^/]+)\/paid$/);
  if (method === 'patch' && payoutPaid) {
    const payout = db.payouts.find((item) => item.id === payoutPaid[1]);
    payout.status = 'paid';
    payout.referenceNote = body.referenceNote || payout.referenceNote;
    return ok(payout);
  }
  const refund = path.match(/^\/admin\/payments\/([^/]+)\/refund$/);
  if (method === 'post' && refund) {
    const payment = db.payments.find((item) => item.id === refund[1]);
    payment.status = 'refunded';
    payment.refundPaise = payment.amountPaise;
    return ok(payment);
  }
  if (method === 'get' && path === '/admin/settings') return ok(db.settings);
  if (method === 'patch' && path === '/admin/settings') {
    Object.assign(db.settings, body);
    return ok(db.settings);
  }
  fail(404, 'This demo action is not available.');
}

export function mockRequest(method, url, body, config = {}) {
  const [pathname, search = ''] = String(url).split('?');
  const params = { ...Object.fromEntries(new URLSearchParams(search)), ...(config.params || {}) };
  const db = loadDb();
  try {
    const result = route(method.toLowerCase(), pathname, body, params, db);
    saveDb();
    return Promise.resolve({ data: result });
  } catch (error) {
    if (error.status === 401 && !pathname.includes('/auth/login') && !pathname.includes('/auth/register') && !pathname.includes('/auth/me')) onUnauthorized();
    return Promise.reject(error);
  }
}
