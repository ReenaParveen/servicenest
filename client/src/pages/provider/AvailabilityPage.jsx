import { useEffect, useState } from 'react';
import { Alert, Button, Card, Stack, Switch, TextField, Typography } from '@mui/material';
import api from '../../services/api';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function AvailabilityPage() {
  const [rules, setRules] = useState(days.map((_day, dayOfWeek) => ({ dayOfWeek, startTime: '09:00', endTime: '17:00', slotMinutes: 60, isActive: dayOfWeek !== 0 })));
  const [blocks, setBlocks] = useState([]);
  const [date, setDate] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/providers/me/availability').then((response) => {
      if (response.data.data.weekly?.length) {
        setRules(days.map((_day, dayOfWeek) => response.data.data.weekly.find((rule) => rule.dayOfWeek === dayOfWeek) || { dayOfWeek, startTime: '09:00', endTime: '17:00', slotMinutes: 60, isActive: false }));
      }
      setBlocks(response.data.data.blocks || []);
    }).catch((err) => setError(err.message));
  }, []);

  async function save(event) {
    event.preventDefault();
    setError('');
    try {
      await api.put('/providers/me/availability', { rules });
      setMessage('Working hours saved.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <Stack spacing={2} component="form" onSubmit={save}>
      <Typography variant="h4">Availability</Typography>
      {message ? <Alert severity="success">{message}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      {rules.map((rule, index) => (
        <Card key={rule.dayOfWeek} sx={{ p: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '160px 1fr 1fr 120px' }, gap: 2, alignItems: 'center' }}>
          <Stack direction="row" alignItems="center"><Switch checked={rule.isActive !== false} onChange={(event) => setRules(rules.map((item, itemIndex) => itemIndex === index ? { ...item, isActive: event.target.checked } : item))} /> {days[rule.dayOfWeek]}</Stack>
          <TextField label="Start" value={rule.startTime} onChange={(event) => setRules(rules.map((item, itemIndex) => itemIndex === index ? { ...item, startTime: event.target.value } : item))} />
          <TextField label="End" value={rule.endTime} onChange={(event) => setRules(rules.map((item, itemIndex) => itemIndex === index ? { ...item, endTime: event.target.value } : item))} />
          <TextField label="Minutes" type="number" value={rule.slotMinutes} onChange={(event) => setRules(rules.map((item, itemIndex) => itemIndex === index ? { ...item, slotMinutes: Number(event.target.value) } : item))} />
        </Card>
      ))}
      <Button type="submit" variant="contained">Save hours</Button>
      <Card sx={{ p: 2 }}>
        <Typography fontWeight={800}>Block a date</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <TextField type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          <Button onClick={async () => {
            await api.post('/providers/me/availability/blocks', { date });
            const response = await api.get('/providers/me/availability');
            setBlocks(response.data.data.blocks);
          }}>Block</Button>
        </Stack>
        {blocks.map((block) => (
          <Stack key={block._id || block.id} direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
            <Typography>{block.date}</Typography>
            <Button color="error" onClick={async () => { await api.delete(`/providers/me/availability/blocks/${block._id || block.id}`); setBlocks(blocks.filter((item) => item !== block)); }}>Remove</Button>
          </Stack>
        ))}
      </Card>
    </Stack>
  );
}
