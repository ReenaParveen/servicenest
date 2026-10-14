import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, MenuItem, Stack, TextField, Typography } from '@mui/material';
import api from '../../services/api';
import { formatINR, rupeesToPaise } from '../../utils/money';
import { serviceImage } from '../../utils/serviceImages';

const blank = { categoryId: '', title: '', description: '', price: '', priceUnit: 'visit', durationMinutes: 60 };

export default function ListingsPage() {
  const [categories, setCategories] = useState([]);
  const [listings, setListings] = useState([]);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');

  function load() {
    return api.get('/providers/me/listings').then((response) => setListings(response.data.data));
  }

  useEffect(() => {
    api.get('/providers/me').then((response) => setCategories(response.data.data.categories || [])).catch((err) => setError(err.message));
    load().catch((err) => setError(err.message));
  }, []);

  async function create(event) {
    event.preventDefault();
    setError('');
    try {
      await api.post('/listings', { ...form, pricePaise: rupeesToPaise(form.price), durationMinutes: Number(form.durationMinutes) });
      setForm(blank);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Services and prices</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {listings.map((listing) => (
        <Card key={listing.id} sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', minWidth: 0 }}>
            <Box component="img" src={serviceImage(listing.category?.slug)} alt="" sx={{ width: 84, height: 64, objectFit: 'cover', borderRadius: 1.5, flexShrink: 0 }} />
            <div>
              <Typography fontWeight={800}>{listing.title}</Typography>
              <Typography>{formatINR(listing.pricePaise)} · {listing.priceUnit}</Typography>
            </div>
          </Box>
          <Button onClick={async () => { await api.patch(`/listings/${listing.id}`, { isActive: !listing.isActive }); await load(); }}>{listing.isActive ? 'Deactivate' : 'Activate'}</Button>
        </Card>
      ))}
      <Card component="form" onSubmit={create} sx={{ p: 2 }}>
        <Typography fontWeight={800}>Add a service</Typography>
        <TextField select label="Category" fullWidth required margin="normal" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
          {categories.map((category) => <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>)}
        </TextField>
        <TextField label="Title" fullWidth required margin="normal" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <TextField label="Description" fullWidth required multiline minRows={3} margin="normal" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <TextField label="Price in rupees" fullWidth required margin="normal" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
        <TextField select label="Price unit" fullWidth margin="normal" value={form.priceUnit} onChange={(event) => setForm({ ...form, priceUnit: event.target.value })}>
          <MenuItem value="visit">Per visit</MenuItem>
          <MenuItem value="hourly">Hourly</MenuItem>
          <MenuItem value="fixed">Fixed</MenuItem>
        </TextField>
        <Button type="submit" variant="contained">Create listing</Button>
      </Card>
    </Stack>
  );
}
