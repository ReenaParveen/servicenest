import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert, Button, Card, MenuItem, Rating, Stack, TextField, Typography,
} from '@mui/material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import StatusBadge from '../components/StatusBadge';
import PriceBreakdown from '../components/PriceBreakdown';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingScreen from '../components/LoadingScreen';
import { buildWhatsAppLink } from '../utils/whatsapp';
import { formatINR } from '../utils/money';

export default function BookingDetailPage({ confirmation = false }) {
  const { id } = useParams();
  const { user } = useAuth();
  const config = useConfig();
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const [dispute, setDispute] = useState({ reason: 'Service quality', description: '' });
  const [loading, setLoading] = useState(false);

  async function load() {
    const response = await api.get(`/bookings/${id}`);
    setBooking(response.data.data);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [id]);

  async function act(toStatus, note, collectCash = false) {
    setLoading(true);
    setError('');
    try {
      await api.post(`/bookings/${id}/transition`, { toStatus, note, collectCash });
      setDialog(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function payDev() {
    setLoading(true);
    try {
      await api.post('/payments/dev-simulate', { purpose: 'booking', bookingId: id });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitReview(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await api.post('/reviews', { bookingId: id, ...review });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitDispute(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await api.post('/disputes', { bookingId: id, ...dispute });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (error && !booking) return <Alert severity="error">{error}</Alert>;
  if (!booking) return <LoadingScreen />;

  const isCustomer = user?.role === 'customer';
  const isProvider = user?.role === 'provider';
  const whatsapp = booking.provider?.whatsappNumber
    ? buildWhatsAppLink(booking.provider.whatsappNumber, `Hello, this is regarding ${config.platformName || 'ServiceNest'} booking ${booking.reference}.`)
    : '';

  return (
    <Stack spacing={2}>
      {confirmation ? <Alert severity="success">Booking {booking.reference} is confirmed in the system. The provider still needs to accept it.</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {booking.paymentMethod === 'dev_simulator' ? <Alert severity="warning">This booking uses the development payment simulator. No real charge is involved.</Alert> : null}
      <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
        <Typography variant="h4">{booking.reference}</Typography>
        <StatusBadge status={booking.status} />
        <StatusBadge status={booking.paymentStatus} />
      </Stack>
      <Typography>{booking.serviceTitle} with {booking.providerName}</Typography>
      <Typography color="text.secondary">{booking.scheduledDate} · {booking.startTime}–{booking.endTime}</Typography>
      <Card sx={{ p: 2 }}>
        <Typography fontWeight={800}>Issue</Typography>
        <Typography>{booking.issueDescription}</Typography>
        <Typography sx={{ mt: 2 }} fontWeight={800}>Service address</Typography>
        {booking.serviceAddress?.line1 ? (
          <Typography>{booking.serviceAddress.line1}, {booking.serviceAddress.city}, {booking.serviceAddress.state} {booking.serviceAddress.pincode}</Typography>
        ) : (
          <Typography>City shared before acceptance: {booking.serviceAddress?.city}. The street address is shown after the provider accepts.</Typography>
        )}
        {booking.customer?.phone ? <Typography sx={{ mt: 1 }}>Customer phone: {booking.customer.phone}</Typography> : null}
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          {(booking.photos || []).map((photo) => (
            <Button key={photo.id} component="a" href={`/api/bookings/${booking.id}/photos/${photo.id}`} target="_blank" rel="noreferrer">{photo.originalName || 'Photo'}</Button>
          ))}
        </Stack>
      </Card>
      <Card sx={{ p: 2 }}>
        <PriceBreakdown quote={booking} />
        <Typography variant="body2" sx={{ mt: 1 }}>Payment method: {booking.paymentMethod === 'dev_simulator' ? 'Development simulator' : booking.paymentMethod === 'cod' ? 'Cash after service' : 'Razorpay'}</Typography>
      </Card>
      {booking.dispute ? <Alert severity="info">Dispute status: {booking.dispute.status}</Alert> : null}
      <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
        {isProvider && booking.status === 'pending' ? <Button variant="contained" onClick={() => act('accepted')}>Accept</Button> : null}
        {isProvider && booking.status === 'pending' ? <Button color="error" onClick={() => setDialog('rejected')}>Decline</Button> : null}
        {isProvider && booking.status === 'accepted' ? <Button variant="contained" onClick={() => act('in_progress')}>Start job</Button> : null}
        {isProvider && booking.status === 'in_progress' ? <Button variant="contained" onClick={() => setDialog('completed')}>Complete</Button> : null}
        {isProvider && booking.paymentMethod === 'cod' && booking.paymentStatus === 'unpaid' && ['in_progress', 'completed'].includes(booking.status) ? <Button onClick={async () => { await api.post(`/bookings/${id}/collect-cash`); await load(); }}>Record cash collected</Button> : null}
        {(isCustomer && ['pending', 'accepted'].includes(booking.status)) || (isProvider && ['accepted', 'in_progress'].includes(booking.status)) ? <Button color="error" onClick={() => setDialog('cancelled')}>Cancel</Button> : null}
        {isCustomer && booking.paymentMethod === 'dev_simulator' && booking.paymentStatus !== 'paid' ? <Button variant="contained" disabled={loading} onClick={payDev}>Simulate payment</Button> : null}
        {whatsapp && isCustomer ? <Button component="a" href={whatsapp} target="_blank" rel="noreferrer">Open WhatsApp chat</Button> : null}
        {user?.role === 'admin' && ['pending', 'accepted', 'in_progress'].includes(booking.status) ? <Button color="error" onClick={() => setDialog('cancelled')}>Cancel booking</Button> : null}
        <Button component={RouterLink} to={isProvider ? '/provider/jobs' : user?.role === 'admin' ? '/admin/bookings' : '/dashboard/bookings'}>Back to bookings</Button>
      </Stack>
      {isCustomer && booking.status === 'completed' && !booking.review ? (
        <Card component="form" onSubmit={submitReview} sx={{ p: 2 }}>
          <Typography fontWeight={800}>Review this visit</Typography>
          <Rating value={review.rating} onChange={(_event, value) => setReview({ ...review, rating: value || 1 })} />
          <TextField label="Comment" fullWidth multiline minRows={2} value={review.comment} onChange={(event) => setReview({ ...review, comment: event.target.value })} sx={{ my: 1 }} />
          <Button type="submit" variant="contained" disabled={loading}>Submit review</Button>
        </Card>
      ) : null}
      {booking.review ? <Alert severity="success">Your review was submitted: {booking.review.rating}/5</Alert> : null}
      {['completed', 'cancelled'].includes(booking.status) && !booking.dispute && user?.role !== 'admin' ? (
        <Card component="form" onSubmit={submitDispute} sx={{ p: 2 }}>
          <Typography fontWeight={800}>Raise a dispute</Typography>
          <TextField select label="Reason" fullWidth value={dispute.reason} onChange={(event) => setDispute({ ...dispute, reason: event.target.value })} sx={{ my: 1 }}>
            {['Service quality', 'No show', 'Pricing', 'Damage', 'Other'].map((reason) => <MenuItem key={reason} value={reason}>{reason}</MenuItem>)}
          </TextField>
          <TextField label="What happened?" fullWidth required multiline minRows={2} value={dispute.description} onChange={(event) => setDispute({ ...dispute, description: event.target.value })} />
          <Button type="submit" sx={{ mt: 1 }} disabled={loading}>Submit dispute</Button>
        </Card>
      ) : null}
      <Typography variant="body2" color="text.secondary">Gateway charge on record: {formatINR(booking.gatewayFeePaise || 0)}</Typography>
      <ConfirmDialog
        open={dialog === 'rejected' || dialog === 'cancelled'}
        title={dialog === 'rejected' ? 'Decline this request?' : 'Cancel this booking?'}
        description="Add a short reason. This is stored with the booking."
        requireNote
        danger
        loading={loading}
        onClose={() => setDialog(null)}
        onConfirm={(note) => act(dialog, note)}
      />
      <ConfirmDialog
        open={dialog === 'completed'}
        title="Mark the job completed?"
        description={booking.paymentMethod === 'cod' && booking.paymentStatus !== 'paid' ? 'You can also record that cash was collected. Earnings are calculated by the server.' : 'The customer will be able to leave a review.'}
        confirmLabel={booking.paymentMethod === 'cod' && booking.paymentStatus !== 'paid' ? 'Complete and record cash' : 'Complete'}
        loading={loading}
        onClose={() => setDialog(null)}
        onConfirm={() => act('completed', '', booking.paymentMethod === 'cod' && booking.paymentStatus !== 'paid')}
      />
    </Stack>
  );
}
