import { useEffect, useState } from 'react';
import { Button, Card, Stack, Tab, Tabs, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import LoadingScreen from '../../components/LoadingScreen';

const tabs = [
  ['pending', 'Pending'],
  ['accepted', 'Accepted'],
  ['in_progress', 'In progress'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
];

export default function ProviderJobsPage() {
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState(null);

  useEffect(() => {
    setRows(null);
    api.get('/bookings', { params: { status, limit: 50 } }).then((response) => setRows(response.data.data)).catch(() => setRows([]));
  }, [status]);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Jobs</Typography>
      <Tabs value={status} onChange={(_event, value) => setStatus(value)} variant="scrollable">
        {tabs.map(([value, label]) => <Tab key={value} value={value} label={label} />)}
      </Tabs>
      {rows === null ? <LoadingScreen /> : rows.map((booking) => (
        <Card key={booking.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', gap: 2 }}>
          <div>
            <Typography fontWeight={800}>{booking.serviceTitle}</Typography>
            <Typography color="text.secondary">{booking.scheduledDate} {booking.startTime} · {booking.reference}</Typography>
            <StatusBadge status={booking.paymentStatus} />
          </div>
          <Button component={RouterLink} to={`/provider/jobs/${booking.id}`}>Open</Button>
        </Card>
      ))}
      {rows?.length === 0 ? <Typography color="text.secondary">Nothing in this list.</Typography> : null}
    </Stack>
  );
}
