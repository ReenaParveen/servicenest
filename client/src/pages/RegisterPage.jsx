import { useState } from 'react';
import { Alert, Box, Button, Card, Container, MenuItem, TextField, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { homeForRole, useAuth } from '../context/AuthContext';
import { fieldErrors } from '../services/api';
import { hasErrors, validateRegister } from '../utils/validation';
import { serviceImage } from '../utils/serviceImages';

export default function RegisterPage() {
  const [params] = useSearchParams();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: params.get('role') === 'provider' ? 'provider' : 'customer',
    businessName: '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    const nextErrors = validateRegister(form);
    setErrors(nextErrors);
    if (hasErrors(nextErrors)) return;
    setLoading(true);
    setError('');
    try {
      const user = await register(form);
      navigate(user.role === 'provider' ? '/provider/verification' : homeForRole(user.role), { replace: true });
    } catch (err) {
      setError(err.message);
      setErrors(fieldErrors(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 } }}>
      <Card sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.8fr 1.2fr' }, overflow: 'hidden' }}>
        <Box
          aria-hidden
          sx={{
            display: { xs: 'none', md: 'block' },
            minHeight: 520,
            backgroundImage: `linear-gradient(180deg, rgba(15,118,110,0.2), rgba(16,38,42,0.5)), url(${serviceImage('painter')})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <Box sx={{ p: { xs: 3, md: 4 } }}>
        <Typography variant="h4">{form.role === 'provider' ? 'Become a provider' : 'Create your account'}</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>Administrator accounts are created with the secure server command, not this form.</Typography>
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        <Box component="form" onSubmit={onSubmit}>
          <TextField select label="I am a" fullWidth value={form.role} onChange={(event) => update('role', event.target.value)} margin="normal">
            <MenuItem value="customer">Customer</MenuItem>
            <MenuItem value="provider">Service provider</MenuItem>
          </TextField>
          <TextField label="Full name" fullWidth required margin="normal" value={form.name} error={Boolean(errors.name)} helperText={errors.name} onChange={(event) => update('name', event.target.value)} />
          {form.role === 'provider' ? <TextField label="Business name" fullWidth margin="normal" value={form.businessName} error={Boolean(errors.businessName)} helperText={errors.businessName || 'Customers will see this name.'} onChange={(event) => update('businessName', event.target.value)} /> : null}
          <TextField label="Email" type="email" fullWidth required margin="normal" value={form.email} error={Boolean(errors.email)} helperText={errors.email} onChange={(event) => update('email', event.target.value)} />
          <TextField label="Mobile number" fullWidth required margin="normal" value={form.phone} error={Boolean(errors.phone)} helperText={errors.phone || '10 digits, without +91.'} onChange={(event) => update('phone', event.target.value)} />
          <TextField label="Password" type="password" fullWidth required margin="normal" value={form.password} error={Boolean(errors.password)} helperText={errors.password} onChange={(event) => update('password', event.target.value)} />
          <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2 }} disabled={loading}>Create account</Button>
        </Box>
        <Typography sx={{ mt: 2 }}>Already registered? <Button component={RouterLink} to="/login">Log in</Button></Typography>
        </Box>
      </Card>
    </Container>
  );
}
