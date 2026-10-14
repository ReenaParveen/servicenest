import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Box, Button, Card, Container, MenuItem, Stack, Step, StepLabel, Stepper, TextField, Typography,
} from '@mui/material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import PriceBreakdown from '../components/PriceBreakdown';
import LoadingScreen from '../components/LoadingScreen';
import { hasErrors, validateBookingDetails } from '../utils/validation';
import { serviceImage } from '../utils/serviceImages';

const steps = ['Service', 'Time', 'Details', 'Review'];

export default function BookingPage() {
  const { providerId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const config = useConfig();
  const [provider, setProvider] = useState(null);
  const [step, setStep] = useState(0);
  const [listingId, setListingId] = useState('');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [startTime, setStartTime] = useState('');
  const [address, setAddress] = useState({ line1: '', line2: '', city: '', state: '', pincode: '', label: 'Home' });
  const [saved, setSaved] = useState([]);
  const [issue, setIssue] = useState('');
  const [files, setFiles] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/providers/${providerId}`).then((response) => {
      setProvider(response.data.data);
      const first = response.data.data.services?.[0];
      if (first) setListingId(first.id);
    }).catch((err) => setError(err.message));
  }, [providerId]);

  useEffect(() => {
    if (user?.role !== 'customer') return;
    api.get('/customers/me').then((response) => {
      setSaved(response.data.data.addresses || []);
      const preferred = response.data.data.addresses?.find((item) => item.isDefault) || response.data.data.addresses?.[0];
      if (preferred) setAddress(preferred);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!date) return;
    api.get(`/providers/${providerId}/slots`, { params: { date } })
      .then((response) => setSlots(response.data.data))
      .catch((err) => setError(err.message));
  }, [date, providerId]);

  useEffect(() => {
    if (!listingId || !user) return;
    api.post('/bookings/quote', { listingId }).then((response) => setQuote(response.data.data)).catch(() => {});
  }, [listingId, user]);

  if (authLoading) return <LoadingScreen />;
  if (!user) {
    return (
      <Container sx={{ py: 6 }}>
        <Alert severity="info" action={<Button href="/login">Log in</Button>}>Log in as a customer to book this service.</Alert>
      </Container>
    );
  }
  if (user.role !== 'customer') {
    return <Container sx={{ py: 6 }}><Alert severity="warning">Only customer accounts can create bookings.</Alert></Container>;
  }
  if (error && !provider) return <Container sx={{ py: 6 }}><Alert severity="error">{error}</Alert></Container>;
  if (!provider) return <LoadingScreen />;

  async function confirm() {
    const errors = validateBookingDetails({
      scheduledDate: date,
      startTime,
      address,
      issueDescription: issue,
      paymentMethod,
    });
    setFieldError(errors);
    if (hasErrors(errors)) {
      setStep(errors.startTime || errors.scheduledDate ? 1 : 2);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/bookings', {
        listingId,
        scheduledDate: date,
        startTime,
        issueDescription: issue,
        paymentMethod,
        address,
      });
      const booking = response.data.data;
      if (files.length) {
        const body = new FormData();
        files.forEach((file) => body.append('photos', file));
        await api.post(`/bookings/${booking.id}/photos`, body);
      }
      if (paymentMethod === 'dev_simulator') {
        await api.post('/payments/dev-simulate', { purpose: 'booking', bookingId: booking.id });
      }
      if (paymentMethod === 'razorpay') {
        await openRazorpay(booking);
      }
      navigate(`/bookings/${booking.id}/confirmation`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function openRazorpay(booking) {
    const order = await api.post('/payments/razorpay/order', { purpose: 'booking', bookingId: booking.id });
    const loaded = await loadRazorpay();
    if (!loaded) throw new Error('Razorpay checkout could not be loaded.');
    await new Promise((resolve, reject) => {
      const checkout = new window.Razorpay({
        key: order.data.data.keyId,
        amount: order.data.data.amountPaise,
        currency: 'INR',
        order_id: order.data.data.orderId,
        name: config.platformName || 'ServiceNest',
        description: booking.reference,
        handler: async (payload) => {
          try {
            await api.post('/payments/verify', {
              purpose: 'booking',
              bookingId: booking.id,
              razorpayOrderId: payload.razorpay_order_id,
              razorpayPaymentId: payload.razorpay_payment_id,
              razorpaySignature: payload.razorpay_signature,
            });
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        modal: { ondismiss: () => reject(new Error('Payment was not completed. The slot stays reserved for a short time.')) },
      });
      checkout.open();
    });
  }

  const methods = [
    config.codEnabled !== false ? ['cod', 'Cash after service'] : null,
    config.paymentsMode === 'razorpay' ? ['razorpay', 'Pay online with Razorpay test mode'] : null,
    config.paymentsMode === 'development' ? ['dev_simulator', 'Development payment simulator'] : null,
  ].filter(Boolean);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4">Book {provider.businessName}</Typography>
      <Stepper activeStep={step} sx={{ my: 3 }} alternativeLabel>
        {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
      </Stepper>
      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
      <Card sx={{ p: 3 }}>
        {step === 0 ? (
          <Stack spacing={2}>
            {(() => {
              const selected = (provider.services || []).find((service) => service.id === listingId);
              if (!selected) return null;
              return (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Box component="img" src={serviceImage(selected.category?.slug)} alt="" sx={{ width: 148, height: 96, objectFit: 'cover', borderRadius: 2 }} />
                  <Box>
                    <Typography fontWeight={800}>{selected.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{selected.description}</Typography>
                  </Box>
                </Box>
              );
            })()}
            <TextField select label="Service" fullWidth value={listingId} onChange={(event) => setListingId(event.target.value)}>
              {(provider.services || []).map((service) => (
                <MenuItem key={service.id} value={service.id}>{service.title}</MenuItem>
              ))}
            </TextField>
          </Stack>
        ) : null}
        {step === 1 ? (
          <Stack spacing={2}>
            <TextField label="Date" type="date" InputLabelProps={{ shrink: true }} value={date} onChange={(event) => { setDate(event.target.value); setStartTime(''); }} error={Boolean(fieldError.scheduledDate)} helperText={fieldError.scheduledDate} />
            <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
              {slots.length === 0 ? <Typography color="text.secondary">Choose a date to see open slots.</Typography> : slots.map((slot) => (
                <Button key={slot.startTime} variant={startTime === slot.startTime ? 'contained' : 'outlined'} disabled={!slot.available} onClick={() => setStartTime(slot.startTime)}>
                  {slot.startTime}
                </Button>
              ))}
            </Stack>
            {fieldError.startTime ? <Typography color="error">{fieldError.startTime}</Typography> : null}
          </Stack>
        ) : null}
        {step === 2 ? (
          <Stack spacing={2}>
            {saved.length > 0 ? (
              <TextField select label="Saved address" value="" onChange={(event) => setAddress(saved.find((item) => item.id === event.target.value) || address)}>
                <MenuItem value="">Choose</MenuItem>
                {saved.map((item) => <MenuItem key={item.id} value={item.id}>{item.label}: {item.line1}</MenuItem>)}
              </TextField>
            ) : null}
            {['line1', 'line2', 'city', 'state', 'pincode'].map((key) => (
              <TextField key={key} label={key === 'line1' ? 'Address line' : key} value={address[key] || ''} error={Boolean(fieldError[key])} helperText={fieldError[key]} onChange={(event) => setAddress({ ...address, [key]: event.target.value })} />
            ))}
            <TextField label="Describe the issue" multiline minRows={3} value={issue} error={Boolean(fieldError.issueDescription)} helperText={fieldError.issueDescription} onChange={(event) => setIssue(event.target.value)} />
            <Button component="label" variant="outlined">
              Add photos
              <input hidden type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => setFiles(Array.from(event.target.files || []).slice(0, 4))} />
            </Button>
            <Typography variant="body2" color="text.secondary">{files.length ? files.map((file) => file.name).join(', ') : 'Optional. Up to 4 images.'}</Typography>
          </Stack>
        ) : null}
        {step === 3 ? (
          <Stack spacing={2}>
            {config.paymentsMode === 'development' ? <Alert severity="warning">Development payment simulator. This cannot charge a real card.</Alert> : null}
            <PriceBreakdown quote={quote} />
            <TextField select label="Payment method" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              {methods.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
            </TextField>
            <Typography variant="body2">The server recalculates the price when the booking is created. A browser total is not trusted.</Typography>
          </Stack>
        ) : null}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button disabled={step === 0 || loading} onClick={() => setStep((value) => value - 1)}>Back</Button>
          {step < 3 ? <Button variant="contained" onClick={() => setStep((value) => value + 1)}>Continue</Button> : <Button variant="contained" disabled={loading} onClick={confirm}>Confirm booking</Button>}
        </Box>
      </Card>
    </Container>
  );
}

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
