import { useEffect, useState } from 'react';
import { Alert, Card, Stack, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import LoadingScreen from '../../components/LoadingScreen';
import { formatINR } from '../../utils/money';

export default function EarningsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/providers/me/earnings').then((response) => setData(response.data.data)).catch((err) => setError(err.message));
  }, []);

  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <LoadingScreen />;
  return (
    <Stack spacing={2}>
      <Typography variant="h4">Earnings</Typography>
      <Alert severity="info">These totals come from completed bookings with collected payment. They cannot be edited here.</Alert>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <StatCard label="Gross" value={formatINR(data.grossPaise)} />
        <StatCard label="Commission" value={formatINR(data.commissionPaise)} />
        <StatCard label="Net" value={formatINR(data.netPaise)} />
        <StatCard label="Pending payout" value={formatINR(data.pendingPayoutPaise)} />
        <StatCard label="Paid out" value={formatINR(data.paidPayoutPaise)} />
      </Stack>
      {data.analyticsLevel === 'advanced' && data.series?.length ? (
        <Card sx={{ p: 2, height: 320 }}>
          <Typography fontWeight={800}>Net earnings by day</Typography>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.series.map((row) => ({ ...row, rupees: row.netPaise / 100 }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="rupees" fill="#0F766E" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      ) : <Alert severity="info">A Premium plan adds the earnings chart. Totals above stay available on every plan.</Alert>}
      {data.commissions.map((row) => (
        <Card key={row.id} sx={{ p: 2 }}>
          <Typography fontWeight={700}>{row.reference} · {row.serviceTitle}</Typography>
          <Typography>Service {formatINR(row.serviceAmountPaise)} · Commission {formatINR(row.commissionPaise)} · Your share {formatINR(row.providerSharePaise)} · {row.status}</Typography>
        </Card>
      ))}
      <Typography variant="h6">Payouts</Typography>
      {data.payouts.length === 0 ? <Typography color="text.secondary">No payout has been generated yet.</Typography> : data.payouts.map((payout) => (
        <Card key={payout.id} sx={{ p: 2 }}>
          <Typography>{formatINR(payout.netPaise)} · {payout.status} {payout.referenceNote ? `· ${payout.referenceNote}` : ''}</Typography>
        </Card>
      ))}
    </Stack>
  );
}
