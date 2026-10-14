import '../config/loadEnv.js';
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { User } from '../models/User.js';
import { hashPassword } from '../services/authService.js';

const email = String(process.env.ADMIN_EMAIL || '').toLowerCase().trim();
const name = String(process.env.ADMIN_NAME || '').trim();
const password = String(process.env.ADMIN_PASSWORD || '');

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!process.env.MONGODB_URI) fail('MONGODB_URI is required.');
if (!name || name.length < 2) fail('ADMIN_NAME is required.');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('ADMIN_EMAIL must be a valid email.');
if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
  fail('ADMIN_PASSWORD must be at least 10 characters and include a letter and a number.');
}

await connectDb(process.env.MONGODB_URI);
const existing = await User.findOne({ email });
if (existing && existing.role !== 'admin') {
  fail('That email already belongs to a non-admin account.');
}
if (existing && process.env.ADMIN_RESET_PASSWORD !== 'true') {
  console.log('An administrator with this email already exists. Set ADMIN_RESET_PASSWORD=true to replace the password.');
  await mongoose.disconnect();
  process.exit(0);
}

const passwordHash = await hashPassword(password);
if (existing) {
  existing.passwordHash = passwordHash;
  existing.name = name;
  existing.isActive = true;
  await existing.save();
  console.log('Administrator password updated.');
} else {
  await User.create({
    name,
    email,
    phone: '9000000000',
    passwordHash,
    role: 'admin',
    isActive: true,
  });
  console.log('Administrator created.');
}

await mongoose.disconnect();
