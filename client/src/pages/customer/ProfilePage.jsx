import { useState } from 'react';
import { Alert, Button, Card, Stack, TextField, Typography } from '@mui/material';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function saveProfile(event) {
    event.preventDefault();
    setError('');
    try {
      await api.patch('/auth/profile', profile);
      await refresh();
      setMessage('Profile saved.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setError('');
    try {
      await api.patch('/auth/password', password);
      setPassword({ currentPassword: '', newPassword: '' });
      setMessage('Password updated.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Stack spacing={2} maxWidth={560}>
      <Typography variant="h4">Profile</Typography>
      {message ? <Alert severity="success">{message}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Card component="form" onSubmit={saveProfile} sx={{ p: 2 }}>
        <TextField label="Name" fullWidth margin="normal" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} />
        <TextField label="Mobile" fullWidth margin="normal" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} />
        <Typography color="text.secondary">Email: {user?.email}</Typography>
        <Button type="submit" variant="contained" sx={{ mt: 2 }}>Save profile</Button>
      </Card>
      <Card component="form" onSubmit={savePassword} sx={{ p: 2 }}>
        <Typography fontWeight={800}>Change password</Typography>
        <TextField label="Current password" type="password" fullWidth margin="normal" value={password.currentPassword} onChange={(event) => setPassword({ ...password, currentPassword: event.target.value })} />
        <TextField label="New password" type="password" fullWidth margin="normal" value={password.newPassword} onChange={(event) => setPassword({ ...password, newPassword: event.target.value })} />
        <Button type="submit" variant="outlined">Update password</Button>
      </Card>
    </Stack>
  );
}
