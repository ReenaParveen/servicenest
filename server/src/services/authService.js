import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, CustomerProfile, ProviderProfile, ProviderSubscription, SubscriptionPlan } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';

const ROUNDS = 12;

export async function hashPassword(password) {
  return bcrypt.hash(password, ROUNDS);
}

export async function registerUser({ name, email, phone, password, role, isDemo = false, businessName }) {
  if (!['customer', 'provider'].includes(role)) {
    throw new ApiError(400, 'Choose a customer or provider account.');
  }
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, 'An account with this email already exists.');

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone,
    passwordHash: await hashPassword(password),
    role,
    isDemo,
  });

  if (role === 'customer') {
    await CustomerProfile.create({ user: user._id, addresses: [] });
  } else {
    const profile = await ProviderProfile.create({
      user: user._id,
      businessName: (businessName || name).trim(),
      isDemo,
      verificationStatus: 'pending',
    });
    const freePlan = await SubscriptionPlan.findOne({ slug: 'free', isActive: true });
    if (freePlan) {
      await ProviderSubscription.create({
        provider: profile._id,
        plan: freePlan._id,
        status: 'active',
        source: 'free',
        amountPaise: 0,
      });
    }
  }

  return user;
}

export async function authenticate({ email, password }) {
  const user = await User.findOne({ email: String(email || '').toLowerCase().trim() }).select('+passwordHash');
  if (!user) throw new ApiError(401, 'Email or password is incorrect.');
  const matches = await bcrypt.compare(password || '', user.passwordHash);
  if (!matches) throw new ApiError(401, 'Email or password is incorrect.');
  if (!user.isActive) throw new ApiError(403, 'This account has been deactivated. Contact support.');
  return user;
}

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
  });
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 12 * 60 * 60 * 1000,
    path: '/',
  };
}

export async function updateOwnProfile(user, { name, phone }) {
  if (name) user.name = name.trim();
  if (phone) user.phone = phone;
  await user.save();
  return user;
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw new ApiError(404, 'Account not found.');
  const matches = await bcrypt.compare(currentPassword || '', user.passwordHash);
  if (!matches) throw new ApiError(400, 'The current password is incorrect.');
  user.passwordHash = await hashPassword(newPassword);
  await user.save();
}

export async function getProviderByUser(userId) {
  const profile = await ProviderProfile.findOne({ user: userId }).populate('categories');
  if (!profile) throw new ApiError(404, 'Provider profile not found.');
  return profile;
}

export async function getCustomerByUser(userId) {
  const profile = await CustomerProfile.findOne({ user: userId });
  if (!profile) throw new ApiError(404, 'Customer profile not found.');
  return profile;
}
