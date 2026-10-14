import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : '';
    const token = req.cookies?.sn_token || bearer;
    if (!token) throw new ApiError(401, 'Please log in to continue.');
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user || !user.isActive) throw new ApiError(401, 'Please log in to continue.');
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    return next(new ApiError(401, 'Your session has expired. Please log in again.'));
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have access to this resource.'));
    }
    return next();
  };
}
