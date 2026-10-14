import { PlatformSettings } from '../models/PlatformSettings.js';
import { paymentsMode, razorpayConfigured } from '../config/env.js';

export async function getSettings() {
  let settings = await PlatformSettings.findOne({ key: 'default' });
  if (!settings) {
    settings = await PlatformSettings.create({
      key: 'default',
      platformName: process.env.PLATFORM_NAME || 'ServiceNest',
    });
  }
  return settings;
}

export async function updateSettings(patch) {
  const settings = await getSettings();
  const allowed = [
    'platformName',
    'commissionRateBps',
    'supportEmail',
    'supportPhone',
    'codEnabled',
    'taxRateBps',
    'timezone',
    'reminderLeadHours',
    'featuredPricePaise',
    'featuredDurationDays',
  ];
  for (const key of allowed) {
    if (patch[key] !== undefined) settings[key] = patch[key];
  }
  await settings.save();
  return settings;
}

export async function publicConfig() {
  const settings = await getSettings();
  const mode = paymentsMode();
  return {
    platformName: settings.platformName || 'ServiceNest',
    currency: settings.currency || 'INR',
    paymentsMode: mode,
    razorpayKeyId: mode === 'razorpay' ? process.env.RAZORPAY_KEY_ID : '',
    codEnabled: settings.codEnabled !== false,
    mapsProvider: process.env.GOOGLE_MAPS_API_KEY ? 'google_geocoding_osm_tiles' : 'openstreetmap',
    commissionRateBps: settings.commissionRateBps,
    taxRateBps: settings.taxRateBps,
    supportEmail: settings.supportEmail || '',
    supportPhone: settings.supportPhone || '',
    featuredPricePaise: settings.featuredPricePaise,
    featuredDurationDays: settings.featuredDurationDays,
    showDemoHints: process.env.NODE_ENV !== 'production',
    razorpayConfigured: razorpayConfigured(),
  };
}
