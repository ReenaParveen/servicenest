import { useEffect, useState } from 'react';
import { Alert, Button, Card, Stack, TextField, Typography } from '@mui/material';
import api, { fieldErrors } from '../../services/api';

const blank = { label: 'Home', line1: '', line2: '', city: '', state: '', pincode: '' };

export default function AddressesPage() {
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  function load() {
    return api.get('/customers/me').then((response) => setAddresses(response.data.data.addresses));
  }

  useEffect(() => { load().catch((err) => setError(err.message)); }, []);

  async function save(event) {
    event.preventDefault();
    setError('');
    try {
      const response = await api.post('/customers/me/addresses', form);
      setAddresses(response.data.data);
      setForm(blank);
      setErrors({});
    } catch (err) {
      setError(err.message);
      setErrors(fieldErrors(err));
    }
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Saved addresses</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {addresses.map((address) => (
        <Card key={address.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Typography>{address.label}: {address.line1}, {address.city}, {address.state} {address.pincode}</Typography>
          <Button color="error" onClick={async () => { const response = await api.delete(`/customers/me/addresses/${address.id}`); setAddresses(response.data.data); }}>Remove</Button>
        </Card>
      ))}
      <Card component="form" onSubmit={save} sx={{ p: 2 }}>
        <Typography fontWeight={800}>Add an address</Typography>
        {Object.keys(blank).map((key) => (
          <TextField key={key} label={key} fullWidth margin="dense" value={form[key]} error={Boolean(errors[key])} helperText={errors[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
        ))}
        <Button type="submit" variant="contained" sx={{ mt: 1 }}>Save address</Button>
      </Card>
    </Stack>
  );
}
