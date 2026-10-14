import { CONTACT_OPEN_STATUSES } from '../constants.js';

export function presentUser(user) {
  if (!user) return null;
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    isDemo: Boolean(user.isDemo),
    avatarUrl: user.avatarUrl || '',
    createdAt: user.createdAt,
  };
}

export function presentAddress(address) {
  return {
    id: address._id,
    label: address.label,
    line1: address.line1,
    line2: address.line2 || '',
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    lat: address.lat,
    lng: address.lng,
    isDefault: Boolean(address.isDefault),
  };
}

export function presentCategory(category) {
  return {
    id: category._id,
    name: category.name,
    slug: category.slug,
    description: category.description || '',
    icon: category.icon,
    isActive: category.isActive,
    sortOrder: category.sortOrder || 0,
  };
}

export function presentListing(listing) {
  return {
    id: listing._id,
    providerId: listing.provider?._id || listing.provider,
    category: listing.category?.name
      ? presentCategory(listing.category)
      : { id: listing.category },
    title: listing.title,
    description: listing.description,
    pricePaise: listing.pricePaise,
    priceUnit: listing.priceUnit,
    durationMinutes: listing.durationMinutes,
    isActive: listing.isActive,
  };
}

export function isPromoted(provider) {
  return Boolean(provider.isFeatured && provider.featuredUntil && new Date(provider.featuredUntil) > new Date());
}

export function presentProviderPublic(provider, extras = {}) {
  const coordinates = provider.location?.coordinates;
  return {
    id: provider._id,
    businessName: provider.businessName,
    bio: provider.bio || '',
    experienceYears: provider.experienceYears || 0,
    city: provider.city || '',
    state: provider.state || '',
    serviceRadiusKm: provider.serviceRadiusKm,
    lat: coordinates ? coordinates[1] : null,
    lng: coordinates ? coordinates[0] : null,
    distanceKm: extras.distanceMeters != null ? Math.round((extras.distanceMeters / 1000) * 10) / 10 : provider.distanceKm ?? null,
    verificationStatus: provider.verificationStatus,
    promoted: isPromoted(provider),
    ratingAvg: provider.ratingAvg || 0,
    ratingCount: provider.ratingCount || 0,
    categories: (provider.categories || []).map((category) => (category?.name ? presentCategory(category) : { id: category })),
    portfolio: (provider.portfolio || []).map((image) => ({
      id: image._id,
      url: image.url,
      caption: image.caption || '',
    })),
    isDemo: Boolean(provider.isDemo),
    startingPricePaise: extras.startingPricePaise ?? null,
    services: extras.services || [],
  };
}

export function presentProviderPrivate(provider, user, subscription) {
  return {
    ...presentProviderPublic(provider),
    whatsappNumber: provider.whatsappNumber || '',
    verificationNote: provider.verificationNote || '',
    email: user?.email || '',
    phone: user?.phone || '',
    documents: (provider.documents || []).map((doc) => ({
      id: doc._id,
      docType: doc.docType,
      originalName: doc.originalName,
      uploadedAt: doc.uploadedAt,
    })),
    subscription: subscription
      ? {
          id: subscription._id,
          status: subscription.status,
          startsAt: subscription.startsAt,
          endsAt: subscription.endsAt || null,
          source: subscription.source,
          plan: subscription.plan?.name
            ? {
                id: subscription.plan._id,
                name: subscription.plan.name,
                slug: subscription.plan.slug,
                tier: subscription.plan.tier,
                pricePaiseMonthly: subscription.plan.pricePaiseMonthly,
                maxActiveListings: subscription.plan.maxActiveListings,
                featuredEligible: subscription.plan.featuredEligible,
                analyticsLevel: subscription.plan.analyticsLevel,
                features: subscription.plan.features || [],
              }
            : null,
        }
      : null,
  };
}

export function presentBooking(booking, viewer) {
  const providerDoc = booking.provider && booking.provider.businessName ? booking.provider : null;
  const customerDoc = booking.customer && booking.customer.name ? booking.customer : null;
  const providerUserId = providerDoc?.user?._id || providerDoc?.user;
  const customerId = customerDoc?._id || booking.customer;
  const isCustomer = viewer && String(customerId) === String(viewer._id);
  const isProvider = viewer && providerUserId && String(providerUserId) === String(viewer._id);
  const isAdmin = viewer?.role === 'admin';
  const contactOpen = CONTACT_OPEN_STATUSES.includes(booking.status);
  const showStreet = isCustomer || isAdmin || (isProvider && contactOpen);

  return {
    id: booking._id,
    reference: booking.reference,
    status: booking.status,
    scheduledDate: booking.scheduledDate,
    startTime: booking.startTime,
    endTime: booking.endTime,
    issueDescription: booking.issueDescription,
    serviceTitle: booking.serviceTitle || booking.listing?.title || '',
    categoryName: booking.categoryName || booking.category?.name || '',
    providerName: booking.providerName || providerDoc?.businessName || '',
    photos: (booking.photos || []).map((photo) => ({ id: photo._id, originalName: photo.originalName })),
    serviceAmountPaise: booking.serviceAmountPaise,
    platformFeePaise: booking.platformFeePaise,
    taxPaise: booking.taxPaise,
    gatewayFeePaise: booking.gatewayFeePaise || 0,
    totalPaise: booking.totalPaise,
    providerSharePaise: isProvider || isAdmin ? booking.providerSharePaise : undefined,
    commissionRateBps: booking.commissionRateBps,
    paymentMethod: booking.paymentMethod,
    paymentStatus: booking.paymentStatus,
    customer: {
      id: customerId,
      name: customerDoc?.name || 'Customer',
      phone: isAdmin || (isProvider && contactOpen) ? customerDoc?.phone : undefined,
    },
    provider: {
      id: providerDoc?._id || booking.provider,
      businessName: providerDoc?.businessName || booking.providerName,
      verificationStatus: providerDoc?.verificationStatus,
      city: providerDoc?.city || '',
      promoted: providerDoc ? isPromoted(providerDoc) : false,
      whatsappNumber: isCustomer && contactOpen ? providerDoc?.whatsappNumber || '' : undefined,
    },
    listing: {
      id: booking.listing?._id || booking.listing,
      title: booking.serviceTitle || booking.listing?.title || '',
      priceUnit: booking.listing?.priceUnit,
    },
    serviceAddress: showStreet
      ? booking.serviceAddress
      : { city: booking.serviceAddress?.city || '' },
    cancellation: booking.cancellation?.reason
      ? { reason: booking.cancellation.reason, at: booking.cancellation.at }
      : null,
    statusHistory: (booking.statusHistory || []).map((entry) => ({
      status: entry.status,
      at: entry.at,
      note: entry.note || '',
    })),
    createdAt: booking.createdAt,
    dispute: booking.disputeSummary || null,
    review: booking.reviewSummary || null,
  };
}

export function presentReview(review) {
  return {
    id: review._id,
    bookingId: review.booking?._id || review.booking,
    rating: review.rating,
    comment: review.comment || '',
    customerName: review.customer?.name || 'Customer',
    providerResponse: review.providerResponse || '',
    providerRespondedAt: review.providerRespondedAt || null,
    createdAt: review.createdAt,
    isDemo: Boolean(review.customer?.isDemo),
  };
}

export function presentNotification(notification) {
  return {
    id: notification._id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link || '',
    readAt: notification.readAt || null,
    createdAt: notification.createdAt,
  };
}

export function presentDispute(dispute) {
  return {
    id: dispute._id,
    bookingId: dispute.booking?._id || dispute.booking,
    bookingReference: dispute.booking?.reference,
    reason: dispute.reason,
    description: dispute.description,
    status: dispute.status,
    resolution: dispute.resolution || '',
    refundPaise: dispute.refundPaise || 0,
    adminNote: dispute.adminNote || '',
    createdAt: dispute.createdAt,
    resolvedAt: dispute.resolvedAt || null,
  };
}

export function presentPlan(plan) {
  return {
    id: plan._id,
    name: plan.name,
    slug: plan.slug,
    tier: plan.tier,
    pricePaiseMonthly: plan.pricePaiseMonthly,
    maxActiveListings: plan.maxActiveListings,
    featuredEligible: plan.featuredEligible,
    analyticsLevel: plan.analyticsLevel,
    isActive: plan.isActive,
    features: plan.features || [],
    sortOrder: plan.sortOrder || 0,
  };
}

export function presentPayout(payout) {
  return {
    id: payout._id,
    providerId: payout.provider?._id || payout.provider,
    providerName: payout.provider?.businessName,
    grossPaise: payout.grossPaise,
    commissionPaise: payout.commissionPaise,
    netPaise: payout.netPaise,
    status: payout.status,
    paidAt: payout.paidAt || null,
    referenceNote: payout.referenceNote || '',
    createdAt: payout.createdAt,
  };
}

export function presentPayment(payment) {
  return {
    id: payment._id,
    purpose: payment.purpose,
    bookingId: payment.booking?._id || payment.booking || null,
    amountPaise: payment.amountPaise,
    method: payment.method,
    status: payment.status,
    refundPaise: payment.refundPaise || 0,
    refundReason: payment.refundReason || '',
    refundedAt: payment.refundedAt || null,
    verifiedAt: payment.verifiedAt || null,
    createdAt: payment.createdAt,
  };
}
