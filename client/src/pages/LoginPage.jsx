import { useState } from 'react';
import { Alert, Box, Button, Card, Container, TextField, Typography } from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { homeForRole, useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { fieldErrors } from '../services/api';
import { serviceImage } from '../utils/serviceImages';

export default function LoginPage() {
  const { login } = useAuth();
  const { showDemoHints } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(form);
      navigate(location.state?.from || homeForRole(user.role), { replace: true });
    } catch (err) {
      setError(err.message);
      setErrors(fieldErrors(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 } }}>
      <Card sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '0.85fr 1.15fr' }, overflow: 'hidden' }}>
        <Box
          aria-hidden
          sx={{
            display: { xs: 'none', md: 'block' },
            minHeight: 460,
            backgroundImage: `linear-gradient(180deg, rgba(15,118,110,0.25), rgba(16,38,42,0.45)), url(${serviceImage('electrician')})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <Box sx={{ p: { xs: 3, md: 4 } }}>
        <Typography variant="h4">Log in</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>Use the email and password for your customer, provider, or administrator account.</Typography>
        {showDemoHints ? <Alert severity="info" sx={{ mb: 2 }}>This demo keeps sample data in the browser. Every customer and provider uses DemoPass123!. Admin is admin@servicenest.local / AdminPass1234.</Alert> : null}
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        <Box component="form" onSubmit={onSubmit}>
          <TextField label="Email" type="email" fullWidth required margin="normal" value={form.email} error={Boolean(errors.email)} helperText={errors.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <TextField label="Password" type="password" fullWidth required margin="normal" value={form.password} error={Boolean(errors.password)} helperText={errors.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2 }} disabled={loading}>Log in</Button>
        </Box>
        <Typography sx={{ mt: 2 }}>New here? <Button component={RouterLink} to="/register">Create an account</Button></Typography>
        </Box>
      </Card>
    </Container>
  );
}
