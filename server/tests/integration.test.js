import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { hashPassword } from '../src/services/authService.js';
import { Commission } from '../src/models/Commission.js';
import { addDays, formatDateInTz } from '../src/utils/dates.js';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-test-secret-test-secret-123456';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.PLATFORM_NAME = 'ServiceNest';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

describe('marketplace API', { timeout: 180000 }, () => {
  let mongo;
  let app;
  let customer;
  let provider;
  let other;
  let admin;
  let categoryId;
  let listingId;
  let bookingId;
  const visitDate = addDays(formatDateInTz(new Date(), 'Asia/Kolkata'), 4);

  before(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongo.getUri();
    await mongoose.connect(process.env.MONGODB_URI);
    await mongoose.connection.syncIndexes();
    app = createApp();

    customer = request.agent(app);
    provider = request.agent(app);
    other = request.agent(app);
    admin = request.agent(app);

    const passwordHash = await hashPassword('AdminPass123');
    await User.create({
      name: 'Test Admin',
      email: 'admin@test.local',
      phone: '9000000099',
      passwordHash,
      role: 'admin',
    });
    assert.equal((await admin.post('/api/auth/login').send({ email: 'admin@test.local', password: 'AdminPass123' })).status, 200);
  });

  after(async () => {
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
  });

  it('registers a customer and provider and blocks admin self-registration', async () => {
    const customerRes = await customer.post('/api/auth/register').send({
      name: 'Test Customer',
      email: 'customer@test.local',
      phone: '9000000001',
      password: 'Customer123',
      role: 'customer',
    });
    assert.equal(customerRes.status, 201);
    assert.equal(customerRes.body.data.user.role, 'customer');

    const providerRes = await provider.post('/api/auth/register').send({
      name: 'Test Provider',
      email: 'provider@test.local',
      phone: '9000000002',
      password: 'Provider123',
      role: 'provider',
      businessName: 'Test Electric Co',
    });
    assert.equal(providerRes.status, 201);

    const otherRes = await other.post('/api/auth/register').send({
      name: 'Other Customer',
      email: 'other@test.local',
      phone: '9000000003',
      password: 'Other1234',
      role: 'customer',
    });
    assert.equal(otherRes.status, 201);

    const adminRegister = await request(app).post('/api/auth/register').send({
      name: 'Sneaky Admin',
      email: 'sneaky@test.local',
      phone: '9000000004',
      password: 'Sneaky1234',
      role: 'admin',
    });
    assert.equal(adminRegister.status, 422);
  });

  it('enforces role checks on the admin overview', async () => {
    assert.equal((await customer.get('/api/admin/overview')).status, 403);
    assert.equal((await provider.get('/api/admin/overview')).status, 403);
    assert.equal((await admin.get('/api/admin/overview')).status, 200);
  });

  it('approves a provider, then books a slot once', async () => {
    const category = await admin.post('/api/admin/categories').send({
      name: 'Electrician',
      description: 'Test category',
      icon: 'ElectricalServices',
    });
    assert.equal(category.status, 201);
    categoryId = category.body.data.id;

    const profile = await provider.patch('/api/providers/me').send({
      businessName: 'Test Electric Co',
      city: 'Pune',
      state: 'Maharashtra',
      serviceRadiusKm: 15,
      lat: 18.52,
      lng: 73.85,
      categoryIds: [categoryId],
      whatsappNumber: '9000000002',
    });
    assert.equal(profile.status, 200);
    const providerId = profile.body.data.id;

    const upload = await provider
      .post('/api/providers/me/documents')
      .field('docType', 'id_proof')
      .attach('document', png, { filename: 'id.png', contentType: 'image/png' });
    assert.equal(upload.status, 200);

    const approved = await admin.patch(`/api/admin/providers/${providerId}/verification`).send({ status: 'approved', note: 'Test approval' });
    assert.equal(approved.status, 200);

    const listing = await provider.post('/api/listings').send({
      categoryId,
      title: 'Fan repair visit',
      description: 'Demo listing used by the automated booking test.',
      pricePaise: 80000,
      priceUnit: 'visit',
      durationMinutes: 60,
    });
    assert.equal(listing.status, 201);
    listingId = listing.body.data.id;

    const availability = await provider.put('/api/providers/me/availability').send({
      rules: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        dayOfWeek,
        startTime: '09:00',
        endTime: '17:00',
        slotMinutes: 60,
        isActive: true,
      })),
    });
    assert.equal(availability.status, 200);

    const quote = await customer.post('/api/bookings/quote').send({ listingId, pricePaise: 100 });
    assert.equal(quote.status, 200);
    assert.equal(quote.body.data.serviceAmountPaise, 80000);
    assert.equal(quote.body.data.platformFeePaise, 8000);
    assert.equal(quote.body.data.providerSharePaise, 72000);

    const payload = {
      listingId,
      scheduledDate: visitDate,
      startTime: '10:00',
      issueDescription: 'The ceiling fan stopped working yesterday.',
      paymentMethod: 'cod',
      address: {
        line1: '12 Test Lane',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      },
    };
    const created = await customer.post('/api/bookings').send(payload);
    assert.equal(created.status, 201);
    bookingId = created.body.data.id;
    assert.equal(created.body.data.serviceAmountPaise, 80000);
    assert.equal(created.body.data.serviceAddress.line1, '12 Test Lane');
    assert.equal((await provider.get(`/api/bookings/${bookingId}`)).body.data.serviceAddress.city, 'Pune');
    assert.equal((await provider.get(`/api/bookings/${bookingId}`)).body.data.serviceAddress.line1, undefined);

    const conflict = await customer.post('/api/bookings').send(payload);
    assert.equal(conflict.status, 409);

    const search = await request(app).get('/api/providers/search').query({ city: 'Pune', category: 'electrician' });
    assert.equal(search.status, 200);
    assert.ok(search.body.data.some((item) => item.businessName === 'Test Electric Co'));
  });

  it('moves a booking to completion and records commission once', async () => {
    assert.equal((await customer.post(`/api/bookings/${bookingId}/transition`).send({ toStatus: 'completed' })).status, 403);
    assert.equal((await provider.post(`/api/bookings/${bookingId}/transition`).send({ toStatus: 'accepted' })).status, 200);
    assert.equal((await provider.post(`/api/bookings/${bookingId}/transition`).send({ toStatus: 'in_progress' })).status, 200);
    const done = await provider.post(`/api/bookings/${bookingId}/transition`).send({ toStatus: 'completed', collectCash: true });
    assert.equal(done.status, 200);
    assert.equal(done.body.data.paymentStatus, 'paid');
    assert.equal(await Commission.countDocuments({ booking: bookingId, status: 'accrued' }), 1);

    const again = await provider.post(`/api/bookings/${bookingId}/collect-cash`);
    assert.equal(again.status, 200);
    assert.equal(await Commission.countDocuments({ booking: bookingId }), 1);

    const hidden = await other.get(`/api/bookings/${bookingId}`);
    assert.equal(hidden.status, 403);

    const review = await customer.post('/api/reviews').send({ bookingId, rating: 5, comment: 'Test review' });
    assert.equal(review.status, 201);
    assert.equal((await customer.post('/api/reviews').send({ bookingId, rating: 4, comment: 'Again' })).status, 409);
  });

  it('simulates a development payment once and refunds it without a second commission', async () => {
    const created = await customer.post('/api/bookings').send({
      listingId,
      scheduledDate: visitDate,
      startTime: '12:00',
      issueDescription: 'Need a development-mode payment check only.',
      paymentMethod: 'dev_simulator',
      address: { line1: '12 Test Lane', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
    });
    assert.equal(created.status, 201);
    const devBookingId = created.body.data.id;
    const paid = await customer.post('/api/payments/dev-simulate').send({ purpose: 'booking', bookingId: devBookingId, amountPaise: 1 });
    assert.equal(paid.status, 200);
    assert.equal(paid.body.data.mode, 'development');
    const duplicate = await customer.post('/api/payments/dev-simulate').send({ purpose: 'booking', bookingId: devBookingId, amountPaise: 1 });
    assert.equal(duplicate.body.data.duplicate, true);

    await provider.post(`/api/bookings/${devBookingId}/transition`).send({ toStatus: 'accepted' });
    await provider.post(`/api/bookings/${devBookingId}/transition`).send({ toStatus: 'in_progress' });
    await provider.post(`/api/bookings/${devBookingId}/transition`).send({ toStatus: 'completed' });
    assert.equal(await Commission.countDocuments({ booking: devBookingId, status: 'accrued' }), 1);

    const paymentId = (await admin.get('/api/admin/payments')).body.data.find((row) => row.bookingId === devBookingId).id;
    assert.equal((await provider.post(`/api/admin/payments/${paymentId}/refund`).send({ reason: 'Provider cannot refund' })).status, 403);
    const refunded = await admin.post(`/api/admin/payments/${paymentId}/refund`).send({ reason: 'Test refund' });
    assert.equal(refunded.status, 200);
    assert.equal(await Commission.countDocuments({ booking: devBookingId, status: 'reversed' }), 1);
    const earnings = await provider.get('/api/providers/me/earnings');
    assert.equal(earnings.body.data.grossPaise, 80000);
  });
});
