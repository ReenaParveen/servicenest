import fs from 'fs';
import { asyncHandler, send } from '../utils/asyncHandler.js';
import {
  addBookingPhotos,
  collectCashForBooking,
  createBooking,
  customerSummary,
  deleteAddress,
  getBookingForUser,
  listBookings,
  quoteListing,
  saveAddress,
  transitionBooking,
  updateAddress,
  loadBooking,
  assertBookingAccess,
} from '../services/bookingService.js';
import { presentAddress } from '../utils/presenters.js';
import { getCustomerByUser } from '../services/authService.js';
import { resolveStoredFile, uploadPaths } from '../utils/files.js';
import { ApiError } from '../utils/apiError.js';

export const quote = asyncHandler(async (req, res) => {
  send(res, await quoteListing(req.body.listingId));
});

export const create = asyncHandler(async (req, res) => {
  const booking = await createBooking(req.user, req.body);
  const presented = await getBookingForUser(req.user, booking._id);
  send(res, presented, 201);
});

export const uploadPhotos = asyncHandler(async (req, res) => {
  if (!req.files?.length) throw new ApiError(400, 'Choose at least one photo.');
  send(res, await addBookingPhotos(req.user, req.params.id, req.files));
});

export const list = asyncHandler(async (req, res) => {
  const result = await listBookings(req.user, req.query);
  res.json({
    success: true,
    data: result.items,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      pages: Math.ceil(result.total / result.limit) || 0,
    },
  });
});

export const detail = asyncHandler(async (req, res) => {
  send(res, await getBookingForUser(req.user, req.params.id));
});

export const transition = asyncHandler(async (req, res) => {
  send(res, await transitionBooking(req.user, req.params.id, req.body));
});

export const collectCash = asyncHandler(async (req, res) => {
  send(res, await collectCashForBooking(req.user, req.params.id));
});

export const photo = asyncHandler(async (req, res) => {
  const booking = await loadBooking(req.params.id);
  assertBookingAccess(booking, req.user);
  const photoDoc = booking.photos.id(req.params.photoId);
  if (!photoDoc) throw new ApiError(404, 'Photo not found.');
  const filePath = resolveStoredFile(uploadPaths.bookingPhotos, photoDoc.storedName);
  if (!fs.existsSync(filePath)) throw new ApiError(404, 'Photo file not found.');
  res.setHeader('Content-Type', photoDoc.mimeType || 'application/octet-stream');
  fs.createReadStream(filePath).pipe(res);
});

export const summary = asyncHandler(async (req, res) => {
  const data = await customerSummary(req.user);
  send(res, { ...data, addresses: data.addresses.map(presentAddress) });
});

export const me = asyncHandler(async (req, res) => {
  const profile = await getCustomerByUser(req.user._id);
  send(res, { addresses: profile.addresses.map(presentAddress) });
});

export const postAddress = asyncHandler(async (req, res) => {
  const profile = await saveAddress(req.user, req.body);
  send(res, profile.addresses.map(presentAddress), 201);
});

export const patchAddress = asyncHandler(async (req, res) => {
  const profile = await updateAddress(req.user, req.params.addressId, req.body);
  send(res, profile.addresses.map(presentAddress));
});

export const removeAddress = asyncHandler(async (req, res) => {
  const profile = await deleteAddress(req.user, req.params.addressId);
  send(res, profile.addresses.map(presentAddress));
});
