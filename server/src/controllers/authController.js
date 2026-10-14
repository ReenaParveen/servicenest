import { asyncHandler, send } from '../utils/asyncHandler.js';
import {
  authenticate,
  changePassword,
  cookieOptions,
  registerUser,
  signToken,
  updateOwnProfile,
} from '../services/authService.js';
import { presentUser } from '../utils/presenters.js';

function setSession(res, user) {
  res.cookie('sn_token', signToken(user), cookieOptions());
}

export const register = asyncHandler(async (req, res) => {
  const user = await registerUser(req.body);
  setSession(res, user);
  send(res, { user: presentUser(user) }, 201);
});

export const login = asyncHandler(async (req, res) => {
  const user = await authenticate(req.body);
  setSession(res, user);
  send(res, { user: presentUser(user) });
});

export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie('sn_token', { path: '/' });
  send(res, { loggedOut: true });
});

export const me = asyncHandler(async (req, res) => {
  send(res, { user: presentUser(req.user) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await updateOwnProfile(req.user, req.body);
  send(res, { user: presentUser(user) });
});

export const updatePassword = asyncHandler(async (req, res) => {
  await changePassword(req.user._id, req.body);
  send(res, { updated: true }, 200, 'Password updated.');
});
