import { useEffect, useState } from 'react';
import { Button, Card, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingScreen from '../../components/LoadingScreen';
import EmptyState from '../../components/EmptyState';

export default function CustomerDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/customers/me/summary').then((response) => setData(response.data.data)).catch((err) => setError(err.message));
  }, []);

  if (error) return <Typography color="error">{error}</Typography>;
  if (!data) return <LoadingScreen />;
  return (
    <Stack spacing={3}>
      <Typography variant="h4">Your bookings</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <StatCard label="Upcoming" value={data.counts.upcoming} />
        <StatCard label="Completed" value={data.counts.completed} />
        <StatCard label="Cancelled or declined" value={data.counts.cancelled} />
      </Stack>
      {data.upcoming.length === 0 && data.recent.length === 0 ? <EmptyState title="No bookings yet" action={<Button component={RouterLink} to="/services" variant="contained">Find a service</Button>} /> : null}
      {[...data.upcoming, ...data.recent.filter((item) => !data.upcoming.some((next) => next.id === item.id))].map((booking) => (
        <Card key={booking.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
          <div>
            <Typography fontWeight={800}>{booking.serviceTitle}</Typography>
            <Typography color="text.secondary">{booking.reference} · {booking.scheduledDate} {booking.startTime}</Typography>
          </div>
          <Stack direction="row" spacing={1} alignItems="center">
            <StatusBadge status={booking.status} />
            <Button component={RouterLink} to={`/dashboard/bookings/${booking.id}`}>Open</Button>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}
