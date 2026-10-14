import { useEffect, useState } from 'react';
import { Alert, Button, Card, MenuItem, Stack, TextField, Typography } from '@mui/material';
import api from '../../services/api';
import { useConfig } from '../../context/ConfigContext';
import { formatINR } from '../../utils/money';

export default function ProviderSettingsPage() {
  const config = useConfig();
  const [profile, setProfile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [plans, setPlans] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/providers/me').then((response) => setProfile(response.data.data)).catch((err) => setError(err.message));
    api.get('/categories').then((response) => setCategories(response.data.data)).catch(() => {});
    api.get('/plans').then((response) => setPlans(response.data.data)).catch(() => {});
  }, []);

  if (!profile) return error ? <Alert severity="error">{error}</Alert> : null;

  async function save(event) {
    event.preventDefault();
    setError('');
    try {
      const response = await api.patch('/providers/me', {
        businessName: profile.businessName,
        bio: profile.bio,
        experienceYears: Number(profile.experienceYears || 0),
        city: profile.city,
        state: profile.state,
        serviceRadiusKm: Number(profile.serviceRadiusKm),
        lat: profile.lat === '' ? undefined : Number(profile.lat),
        lng: profile.lng === '' ? undefined : Number(profile.lng),
        whatsappNumber: profile.whatsappNumber,
        categoryIds: profile.categories.map((category) => category.id || category),
      });
      setProfile(response.data.data);
      setMessage('Profile saved.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function uploadPortfolio(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append('image', file);
    const response = await api.post('/providers/me/portfolio', body);
    setProfile(response.data.data);
  }

  async function choosePlan(plan) {
    setError('');
    try {
      if (plan.pricePaiseMonthly === 0) {
        await api.post('/providers/me/subscription/free');
      } else if (config.paymentsMode === 'development') {
        await api.post('/payments/dev-simulate', { purpose: 'subscription', planId: plan.id });
      } else if (config.paymentsMode === 'razorpay') {
        const order = await api.post('/payments/razorpay/order', { purpose: 'subscription', planId: plan.id });
        setMessage(`Razorpay order ${order.data.data.orderId} was created. Complete checkout from a configured Razorpay client.`);
        return;
      } else {
        throw new Error('Paid plans need Razorpay keys or the development simulator.');
      }
      const response = await api.get('/providers/me');
      setProfile(response.data.data);
      setMessage(`${plan.name} is now the active plan. Recurring autopay is not enabled.`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function feature() {
    try {
      if (config.paymentsMode !== 'development') throw new Error('Promoted placement checkout is available in the development simulator or after Razorpay is configured.');
      await api.post('/payments/dev-simulate', { purpose: 'featured' });
      setMessage('Promoted placement is active. It does not change your verification status.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Stack spacing={2} component="form" onSubmit={save}>
      <Typography variant="h4">Provider profile</Typography>
      {message ? <Alert severity="success">{message}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Card sx={{ p: 2 }}>
        <TextField label="Business name" fullWidth margin="normal" value={profile.businessName || ''} onChange={(event) => setProfile({ ...profile, businessName: event.target.value })} />
        <TextField label="About" fullWidth multiline minRows={3} margin="normal" value={profile.bio || ''} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} />
        <TextField label="Years of experience" type="number" fullWidth margin="normal" value={profile.experienceYears || 0} onChange={(event) => setProfile({ ...profile, experienceYears: event.target.value })} />
        <TextField label="City" fullWidth margin="normal" value={profile.city || ''} onChange={(event) => setProfile({ ...profile, city: event.target.value })} />
        <TextField label="State" fullWidth margin="normal" value={profile.state || ''} onChange={(event) => setProfile({ ...profile, state: event.target.value })} />
        <TextField label="Service radius (km)" type="number" fullWidth margin="normal" value={profile.serviceRadiusKm || 10} onChange={(event) => setProfile({ ...profile, serviceRadiusKm: event.target.value })} />
        <TextField label="Latitude" fullWidth margin="normal" value={profile.lat ?? ''} onChange={(event) => setProfile({ ...profile, lat: event.target.value })} helperText="Enter coordinates manually if search suggestions are unavailable." />
        <TextField label="Longitude" fullWidth margin="normal" value={profile.lng ?? ''} onChange={(event) => setProfile({ ...profile, lng: event.target.value })} />
        <TextField label="WhatsApp number" fullWidth margin="normal" value={profile.whatsappNumber || ''} onChange={(event) => setProfile({ ...profile, whatsappNumber: event.target.value })} helperText="Shown to a customer only after you accept their booking. This opens a chat link; it does not send a message automatically." />
        <TextField select label="Categories" fullWidth SelectProps={{ multiple: true }} margin="normal" value={(profile.categories || []).map((category) => category.id || category)} onChange={(event) => setProfile({ ...profile, categories: event.target.value.map((id) => categories.find((category) => category.id === id) || { id }) })}>
          {categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
        </TextField>
        <Button type="submit" variant="contained">Save profile</Button>
        <Button component="label" sx={{ ml: 1 }}>Add portfolio image<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadPortfolio} /></Button>
      </Card>
      <Typography variant="h5">Plans</Typography>
      <Typography color="text.secondary">Current plan: {profile.subscription?.plan?.name || 'None'}.</Typography>
      {plans.map((plan) => (
        <Card key={plan.id} sx={{ p: 2 }}>
          <Typography fontWeight={800}>{plan.name} · {plan.pricePaiseMonthly ? `${formatINR(plan.pricePaiseMonthly)} / 30 days` : 'Free'}</Typography>
          <Typography>{(plan.features || []).join(' · ')}</Typography>
          <Button sx={{ mt: 1 }} onClick={() => choosePlan(plan)}>Choose {plan.name}</Button>
        </Card>
      ))}
      <Card sx={{ p: 2 }}>
        <Typography fontWeight={800}>Promoted placement</Typography>
        <Typography color="text.secondary">Price {formatINR(config.featuredPricePaise || 0)} for {config.featuredDurationDays || 30} days. The public label is Promoted, not Verified.</Typography>
        <Button sx={{ mt: 1 }} variant="outlined" onClick={feature}>Purchase with development simulator</Button>
      </Card>
    </Stack>
  );
}
