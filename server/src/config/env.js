export function assertEnv({ requireJwt = true } = {}) {
  const errors = [];
  if (!process.env.MONGODB_URI) errors.push('MONGODB_URI is required.');
  if (!process.env.CLIENT_ORIGIN) errors.push('CLIENT_ORIGIN is required.');
  if (requireJwt) {
    const secret = process.env.JWT_SECRET || '';
    if (secret.length < 32) errors.push('JWT_SECRET must be at least 32 characters.');
    if (secret.includes('replace-with')) errors.push('Replace JWT_SECRET with a unique random value.');
  }
  if (errors.length) {
    throw new Error(errors.join(' '));
  }
}

export function isProduction() {
  return process.env.NODE_ENV === 'production';
}

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function paymentsMode() {
  if (razorpayConfigured()) return 'razorpay';
  if (!isProduction()) return 'development';
  return 'cod_only';
}
