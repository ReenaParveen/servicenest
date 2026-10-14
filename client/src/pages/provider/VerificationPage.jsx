import { useEffect, useState } from 'react';
import { Alert, Button, Card, MenuItem, Stack, TextField, Typography } from '@mui/material';
import api from '../../services/api';

export default function VerificationPage() {
  const [profile, setProfile] = useState(null);
  const [docType, setDocType] = useState('id_proof');
  const [error, setError] = useState('');

  function load() {
    return api.get('/providers/me').then((response) => setProfile(response.data.data));
  }

  useEffect(() => { load().catch((err) => setError(err.message)); }, []);

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append('docType', docType);
    body.append('document', file);
    setError('');
    try {
      const response = await api.post('/providers/me/documents', body);
      setProfile(response.data.data);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!profile) return null;
  return (
    <Stack spacing={2}>
      <Typography variant="h4">Verification</Typography>
      <Alert severity={profile.verificationStatus === 'approved' ? 'success' : 'info'}>
        Status: {profile.verificationStatus}. {profile.verificationNote || 'Documents are visible to you and administrators only.'}
      </Alert>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {profile.documents.map((doc) => (
        <Card key={doc.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Typography>{doc.docType}: {doc.originalName}</Typography>
          <Button component="a" href={doc.url || `/images/services/electrician.jpg`}>View sample</Button>
        </Card>
      ))}
      <Card sx={{ p: 2 }}>
        <TextField select label="Document type" value={docType} onChange={(event) => setDocType(event.target.value)} sx={{ minWidth: 220 }}>
          <MenuItem value="id_proof">Identity proof</MenuItem>
          <MenuItem value="address_proof">Address proof</MenuItem>
          <MenuItem value="license">Trade license</MenuItem>
          <MenuItem value="other">Other</MenuItem>
        </TextField>
        <Button component="label" variant="contained" sx={{ ml: 2 }}>
          Upload
          <input hidden type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={upload} />
        </Button>
      </Card>
    </Stack>
  );
}
