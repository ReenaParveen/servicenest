import nodemailer from 'nodemailer';
import { Notification, User, Booking, ProviderProfile } from '../models/index.js';
import { getSettings } from './platformService.js';
import { addDays, formatDateInTz } from '../utils/dates.js';

let transport;

function getTransport() {
  if (!process.env.SMTP_HOST) return null;
  if (!transport) {
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }
  return transport;
}

async function deliverEmail(to, subject, text) {
  const tx = getTransport();
  if (!tx || !to) return 'skipped';
  try {
    await tx.sendMail({
      from: process.env.MAIL_FROM || 'ServiceNest <noreply@localhost>',
      to,
      subject,
      text,
    });
    return 'sent';
  } catch (error) {
    console.log(JSON.stringify({ level: 'error', message: 'email_failed', reason: error.message }));
    return 'failed';
  }
}

export async function notifyUserId(userId, { type, title, body, link = '', dedupeKey, sendEmail = true }) {
  try {
    const user = await User.findById(userId);
    if (!user) return null;
    const settings = await getSettings();
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      body,
      link,
      dedupeKey,
      emailStatus: sendEmail ? 'pending' : 'skipped',
    });
    if (sendEmail) {
      const status = await deliverEmail(
        user.email,
        `${settings.platformName}: ${title}`,
        `${body}\n\nThis message was sent by ${settings.platformName}.`
      );
      notification.emailStatus = status;
      await notification.save();
    }
    return notification;
  } catch (error) {
    if (error.code === 11000) return null;
    console.log(JSON.stringify({ level: 'error', message: 'notify_failed', type }));
    return null;
  }
}

export async function notifyBookingParties(booking, { type, customerTitle, providerTitle, customerBody, providerBody, customerLink, providerLink }) {
  const provider = booking.provider?.user
    ? booking.provider
    : await ProviderProfile.findById(booking.provider);
  await notifyUserId(booking.customer._id || booking.customer, {
    type,
    title: customerTitle,
    body: customerBody,
    link: customerLink || `/dashboard/bookings/${booking._id}`,
    dedupeKey: `${type}:${booking._id}:customer`,
  });
  if (provider?.user) {
    await notifyUserId(provider.user._id || provider.user, {
      type,
      title: providerTitle,
      body: providerBody,
      link: providerLink || `/provider/jobs/${booking._id}`,
      dedupeKey: `${type}:${booking._id}:provider`,
    });
  }
}

export async function sendBookingReminders() {
  const settings = await getSettings();
  const today = formatDateInTz(new Date(), settings.timezone || 'Asia/Kolkata');
  const target = addDays(today, 1);
  const bookings = await Booking.find({ status: 'accepted', scheduledDate: target })
    .populate('customer', 'name')
    .populate('provider');
  for (const booking of bookings) {
    await notifyBookingParties(booking, {
      type: 'booking_reminder',
      customerTitle: 'Booking reminder',
      providerTitle: 'Job reminder',
      customerBody: `Reminder: ${booking.serviceTitle} is scheduled on ${booking.scheduledDate} at ${booking.startTime}. Reference ${booking.reference}.`,
      providerBody: `Reminder: you have ${booking.serviceTitle} on ${booking.scheduledDate} at ${booking.startTime}. Reference ${booking.reference}.`,
    });
  }
  return bookings.length;
}

export async function listNotifications(userId) {
  return Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(40);
}

export async function markNotificationRead(userId, notificationId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { $set: { readAt: new Date() } },
    { new: true }
  );
}

export async function markAllRead(userId) {
  await Notification.updateMany({ user: userId, readAt: null }, { $set: { readAt: new Date() } });
}
