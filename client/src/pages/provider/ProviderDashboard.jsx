import { useEffect, useState } from 'react';
import { Alert, Button, Card, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingScreen from '../../components/LoadingScreen';
import { formatINR } from '../../utils/money';

export default function ProviderDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/providers/me/summary').then((response) => setData(response.data.data)).catch((err) => setError(err.message));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <LoadingScreen />;
  const { counts, earnings, profile, todayBookings, pendingBookings } = data;
  return (
    <Stack spacing={3}>
      <Typography variant="h4">{profile.businessName}</Typography>
      {profile.isDemo ? <Alert severity="info">This is a demo provider profile.</Alert> : null}
      <Alert severity={profile.verificationStatus === 'approved' ? 'success' : 'warning'}>
        Verification: {profile.verificationStatus}. {profile.verificationNote || 'Upload documents if this profile is still pending.'}
      </Alert>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} useFlexGap flexWrap="wrap">
        <StatCard label="Today" value={counts.today} />
        <StatCard label="Pending requests" value={counts.pending} />
        <StatCard label="Accepted" value={counts.accepted} />
        <StatCard label="In progress" value={counts.inProgress} />
        <StatCard label="Completed" value={counts.completed} />
        <StatCard label="Cancelled" value={counts.cancelled} />
      </Stack>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <StatCard label="Gross completed value" value={formatINR(earnings.grossPaise)} hint="From paid, completed jobs only" />
        <StatCard label="Commission deducted" value={formatINR(earnings.commissionPaise)} />
        <StatCard label="Net earnings" value={formatINR(earnings.netPaise)} />
        <StatCard label="Pending payouts" value={formatINR(earnings.pendingPayoutPaise)} />
        <StatCard label="Paid out" value={formatINR(earnings.paidPayoutPaise)} />
      </Stack>
      <Typography variant="h6">Today</Typography>
      {todayBookings.length === 0 ? <Typography color="text.secondary">No jobs scheduled today.</Typography> : todayBookings.map((booking) => (
        <Card key={booking.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
          <Typography>{booking.startTime} · {booking.serviceTitle}</Typography>
          <Button component={RouterLink} to={`/provider/jobs/${booking.id}`}>Open</Button>
        </Card>
      ))}
      <Typography variant="h6">Requests waiting</Typography>
      {pendingBookings.map((booking) => (
        <Card key={booking.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Typography fontWeight={700}>{booking.reference}</Typography>
            <StatusBadge status={booking.status} />
          </div>
          <Button component={RouterLink} to={`/provider/jobs/${booking.id}`}>Review</Button>
        </Card>
      ))}
    </Stack>
  );
}
