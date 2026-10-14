import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Card, Chip, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography,
} from '@mui/material';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link as RouterLink } from 'react-router-dom';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import LoadingScreen from '../../components/LoadingScreen';
import EmptyState from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../utils/money';
import { imageForProvider, serviceImage } from '../../utils/serviceImages';

function useGet(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let active = true;
    setError('');
    api.get(url).then((response) => {
      if (active) setData(response.data.data);
    }).catch((err) => {
      if (active) setError(err.message);
    });
    return () => { active = false; };
  }, [url, reloadKey]);
  return { data, error, reload: () => setReloadKey((value) => value + 1) };
}

function PageHeader({ title, subtitle }) {
  return (
    <Box>
      <Typography variant="h4">{title}</Typography>
      {subtitle ? <Typography color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography> : null}
    </Box>
  );
}

function FilterChips({ value, onChange, options }) {
  return (
    <Stack direction="row" gap={1} flexWrap="wrap" useFlexGap>
      {options.map((option) => (
        <Chip
          key={option.value || 'all'}
          label={option.label}
          clickable
          color={value === option.value ? 'primary' : 'default'}
          variant={value === option.value ? 'filled' : 'outlined'}
          onClick={() => onChange(option.value)}
        />
      ))}
    </Stack>
  );
}

const statGrid = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
  gap: 2,
};

export function AdminDashboard() {
  const { data, error } = useGet('/admin/overview');
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <LoadingScreen />;
  const chart = data.series.map((row) => ({ ...row, gross: row.grossPaise / 100, commission: row.commissionPaise / 100 }));
  return (
    <Stack spacing={3}>
      <PageHeader title="Marketplace overview" subtitle="Dummy activity across customers, providers, bookings, and commission." />
      <Box sx={statGrid}>
        <StatCard label="Customers" value={data.customers} />
        <StatCard label="Providers" value={data.providers} hint={`${data.verifiedProviders} verified`} />
        <StatCard label="Awaiting review" value={data.pendingProviders} />
        <StatCard label="Open disputes" value={data.openDisputes} />
        <StatCard label="Bookings" value={data.bookings} hint={`${data.completedBookings} completed`} />
        <StatCard label="Cancelled or declined" value={data.cancelledBookings} />
        <StatCard label="Gross completed value" value={formatINR(data.grossBookingPaise)} hint="Accrued commissions only" />
        <StatCard label="Commission revenue" value={formatINR(data.commissionPaise)} />
        <StatCard label="Subscription revenue" value={formatINR(data.subscriptionPaise)} hint="Excludes the development simulator" />
        <StatCard label="Refunds" value={formatINR(data.refundPaise)} />
      </Box>
      <Card sx={{ p: 2.5, height: 360 }}>
        <Typography fontWeight={800}>Completed booking value and commission</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Last 30 days, in rupees.</Typography>
        {chart.length === 0 ? <EmptyState title="No commission in this window" description="Completed paid bookings will draw this chart." /> : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8E8" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area dataKey="gross" name="Gross ₹" stroke="#1E3A5F" fill="#1E3A5F" fillOpacity={0.12} />
              <Area dataKey="commission" name="Commission ₹" stroke="#0F766E" fill="#0F766E" fillOpacity={0.28} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
        <Stack spacing={1.5}>
          <Typography variant="h6">Approval queue</Typography>
          {data.approvalQueue.length === 0 ? <EmptyState title="Queue is clear" description="New provider applications will show up here." /> : data.approvalQueue.map((provider) => (
            <Card key={provider.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
              <Box>
                <Typography fontWeight={800}>{provider.businessName}</Typography>
                <Typography variant="body2" color="text.secondary">{provider.ownerName || 'Owner'} · {provider.city || 'City not set'} · {provider.documentCount} document{provider.documentCount === 1 ? '' : 's'}</Typography>
              </Box>
              <Button component={RouterLink} to="/admin/providers" variant="contained" size="small">Review</Button>
            </Card>
          ))}
        </Stack>
        <Stack spacing={1.5}>
          <Typography variant="h6">Recent bookings</Typography>
          {data.recentBookings.map((booking) => (
            <Card key={booking.id} component={RouterLink} to={`/admin/bookings/${booking.id}`} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, textDecoration: 'none', color: 'inherit' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={800}>{booking.reference}</Typography>
                <Typography variant="body2" color="text.secondary" noWrap>{booking.serviceTitle} · {booking.providerName}</Typography>
              </Box>
              <StatusBadge status={booking.status} />
            </Card>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}

const providerFilters = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
];

export function AdminProviders() {
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState('');
  const { data, error, reload } = useGet(`/admin/providers?limit=50${status ? `&status=${status}` : ''}`);
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <LoadingScreen />;
  const rows = data.filter((provider) => {
    const haystack = `${provider.businessName} ${provider.owner?.name || ''} ${provider.owner?.email || ''} ${provider.city || ''}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  async function decide(id, nextStatus) {
    setActionError('');
    try {
      await api.patch(`/admin/providers/${id}/verification`, { status: nextStatus, note });
      setNote('');
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Providers" subtitle="Approve documents, suspend a profile, or mark a paid placement as Promoted." />
      <FilterChips value={status} onChange={setStatus} options={providerFilters} />
      <TextField label="Search name, owner, or city" value={query} onChange={(event) => setQuery(event.target.value)} />
      <TextField label="Decision note" value={note} onChange={(event) => setNote(event.target.value)} helperText="Required when rejecting or suspending. Approval also needs at least one uploaded document." />
      {actionError ? <Alert severity="error">{actionError}</Alert> : null}
      {rows.length === 0 ? <EmptyState title="No providers in this view" description="Try another status or clear the search." /> : null}
      {rows.map((provider) => (
        <Card key={provider.id} sx={{ display: 'flex', overflow: 'hidden' }}>
          <Box component="img" src={imageForProvider(provider)} alt="" sx={{ width: { xs: 96, sm: 140 }, objectFit: 'cover', flexShrink: 0 }} />
          <Box sx={{ p: 2, flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
              <Typography fontWeight={800}>{provider.businessName}</Typography>
              <StatusBadge status={provider.verificationStatus} />
              {provider.promoted ? <Chip size="small" label="Promoted" variant="outlined" /> : null}
              {provider.isDemo ? <Chip size="small" label="Demo" /> : null}
            </Stack>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>{provider.owner?.name} · {provider.owner?.email} · {provider.city || 'City not set'}</Typography>
            {provider.verificationNote ? <Typography variant="body2" sx={{ mt: 1 }}>Note: {provider.verificationNote}</Typography> : null}
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
              {provider.documents.length === 0 ? <Typography variant="body2" color="text.secondary">No documents uploaded.</Typography> : provider.documents.map((doc) => (
                <Button key={doc.id} size="small" component="a" href={doc.url || '/images/services/electrician.jpg'}>{doc.originalName}</Button>
              ))}
            </Stack>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
              <Button size="small" variant="contained" onClick={() => decide(provider.id, 'approved')}>Approve</Button>
              <Button size="small" color="warning" variant="outlined" onClick={() => decide(provider.id, 'rejected')}>Reject</Button>
              <Button size="small" color="error" variant="outlined" onClick={() => decide(provider.id, 'suspended')}>Suspend</Button>
              <Button size="small" variant="outlined" onClick={async () => {
                setActionError('');
                try {
                  await api.patch(`/admin/providers/${provider.id}/featured`, { enabled: !provider.promoted, days: 30 });
                  reload();
                } catch (err) {
                  setActionError(err.message);
                }
              }}
              >
                {provider.promoted ? 'Remove promotion' : 'Feature for 30 days'}
              </Button>
            </Stack>
          </Box>
        </Card>
      ))}
    </Stack>
  );
}

export function AdminBookings() {
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setError('');
    api.get('/admin/bookings', { params: { status, limit: 50 } })
      .then((response) => setRows(response.data.data))
      .catch((err) => setError(err.message));
  }, [status]);
  return (
    <Stack spacing={2.5}>
      <PageHeader title="Bookings" subtitle="Every demo visit, from request through completion." />
      <FilterChips
        value={status}
        onChange={setStatus}
        options={[
          { value: '', label: 'All' },
          ...['pending', 'accepted', 'in_progress', 'completed', 'cancelled', 'rejected'].map((item) => ({ value: item, label: item.replace('_', ' ') })),
        ]}
      />
      {error ? <Alert severity="error">{error}</Alert> : null}
      {!rows ? <LoadingScreen /> : null}
      {rows && rows.length === 0 ? <EmptyState title="No bookings with this status" /> : null}
      {(rows || []).map((booking) => (
        <Card key={booking.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={800}>{booking.reference} · {booking.serviceTitle}</Typography>
            <Typography color="text.secondary">{booking.customer?.name} booked {booking.providerName}</Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>{booking.scheduledDate} · {booking.startTime} · {formatINR(booking.totalPaise)}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <StatusBadge status={booking.status} />
              <StatusBadge status={booking.paymentStatus} />
            </Stack>
          </Box>
          <Button component={RouterLink} to={`/admin/bookings/${booking.id}`} variant="outlined" size="small">Open</Button>
        </Card>
      ))}
    </Stack>
  );
}

export function AdminDisputes() {
  const { data, error, reload } = useGet('/admin/disputes');
  const [resolution, setResolution] = useState('');
  const [filter, setFilter] = useState('open');
  const [actionError, setActionError] = useState('');
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <LoadingScreen />;
  const rows = data.filter((dispute) => (filter === 'open' ? ['open', 'under_review'].includes(dispute.status) : filter ? dispute.status === filter : true));

  async function update(id, status) {
    setActionError('');
    try {
      await api.patch(`/admin/disputes/${id}`, { status, resolution });
      reload();
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Disputes" subtitle="Sample complaints stay labelled as demo data. Resolving one does not move real money." />
      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'open', label: 'Needs attention' },
          { value: 'resolved', label: 'Resolved' },
          { value: 'rejected', label: 'Rejected' },
          { value: '', label: 'All' },
        ]}
      />
      <TextField label="Resolution note" value={resolution} onChange={(event) => setResolution(event.target.value)} helperText="Saved with the dispute when you review, resolve, or reject it." />
      {actionError ? <Alert severity="error">{actionError}</Alert> : null}
      {rows.length === 0 ? <EmptyState title="Nothing in this queue" description="Open disputes from completed demo bookings appear here." /> : null}
      {rows.map((dispute) => (
        <Card key={dispute.id} sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
            <Typography fontWeight={800}>{dispute.bookingReference || 'Booking'} · {dispute.reason}</Typography>
            <StatusBadge status={dispute.status} />
          </Stack>
          <Typography sx={{ mt: 1 }}>{dispute.description}</Typography>
          {dispute.resolution ? <Typography color="text.secondary" sx={{ mt: 1 }}>Resolution: {dispute.resolution}</Typography> : null}
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button size="small" variant="outlined" onClick={() => update(dispute.id, 'under_review')}>Mark under review</Button>
            <Button size="small" variant="contained" onClick={() => update(dispute.id, 'resolved')}>Resolve</Button>
            <Button size="small" color="error" variant="outlined" onClick={() => update(dispute.id, 'rejected')}>Reject</Button>
            {dispute.bookingId ? <Button size="small" component={RouterLink} to={`/admin/bookings/${dispute.bookingId}`}>Open booking</Button> : null}
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

export function AdminCategories() {
  const { data, error, reload } = useGet('/admin/categories');
  const [form, setForm] = useState({ name: '', description: '', icon: 'Handyman' });
  const [actionError, setActionError] = useState('');
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <LoadingScreen />;
  return (
    <Stack spacing={2.5}>
      <PageHeader title="Categories" subtitle="These are the services customers see on the home page." />
      {actionError ? <Alert severity="error">{actionError}</Alert> : null}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 2 }}>
        {data.map((category) => (
          <Card key={category.id} sx={{ overflow: 'hidden' }}>
            <Box component="img" src={serviceImage(category.slug)} alt="" sx={{ width: '100%', height: 120, objectFit: 'cover', display: 'block', filter: category.isActive ? 'none' : 'grayscale(1)' }} />
            <Box sx={{ p: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography fontWeight={800}>{category.name}</Typography>
                <Chip size="small" color={category.isActive ? 'success' : 'default'} label={category.isActive ? 'Visible' : 'Hidden'} />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, minHeight: 40 }}>{category.description}</Typography>
              <Button size="small" sx={{ mt: 1 }} onClick={async () => {
                setActionError('');
                try {
                  await api.patch(`/admin/categories/${category.id}`, { isActive: !category.isActive });
                  reload();
                } catch (err) {
                  setActionError(err.message);
                }
              }}
              >
                {category.isActive ? 'Hide from search' : 'Show in search'}
              </Button>
            </Box>
          </Card>
        ))}
      </Box>
      <Card component="form" sx={{ p: 2.5, maxWidth: 520 }} onSubmit={async (event) => {
        event.preventDefault();
        setActionError('');
        try {
          await api.post('/admin/categories', form);
          setForm({ name: '', description: '', icon: 'Handyman' });
          reload();
        } catch (err) {
          setActionError(err.message);
        }
      }}
      >
        <Typography fontWeight={800} sx={{ mb: 1 }}>Add a category</Typography>
        <TextField label="Name" fullWidth required margin="dense" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <TextField label="Description" fullWidth required margin="dense" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <TextField label="Icon name" fullWidth margin="dense" helperText="A Material icon name such as Handyman or Plumbing." value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} />
        <Button type="submit" variant="contained" sx={{ mt: 1 }}>Add category</Button>
      </Card>
    </Stack>
  );
}

export function AdminPlans() {
  const { data, error, reload } = useGet('/admin/plans');
  const [providers, setProviders] = useState([]);
  const [assignment, setAssignment] = useState({ providerId: '', planId: '' });
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');
  useEffect(() => { api.get('/admin/providers?limit=50').then((response) => setProviders(response.data.data)).catch(() => {}); }, []);
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!data) return <LoadingScreen />;
  return (
    <Stack spacing={2.5}>
      <PageHeader title="Subscription plans" subtitle="Free, Basic, and Premium control how many listings a provider can keep active." />
      <Alert severity="info">Recurring autopay is not connected. Assigning a plan here is an administrative grant and records no charge.</Alert>
      {actionError ? <Alert severity="error">{actionError}</Alert> : null}
      {message ? <Alert severity="success">{message}</Alert> : null}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
        {data.map((plan) => (
          <Card key={plan.id} sx={{ p: 2.5, borderTop: '4px solid', borderTopColor: plan.tier === 'premium' ? 'primary.main' : plan.tier === 'basic' ? 'secondary.main' : 'divider' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">{plan.name}</Typography>
              <Chip size="small" label={plan.isActive ? 'Active' : 'Hidden'} color={plan.isActive ? 'success' : 'default'} />
            </Stack>
            <Typography variant="h5" sx={{ mt: 1 }}>{formatINR(plan.pricePaiseMonthly)}<Typography component="span" variant="body2" color="text.secondary"> / month</Typography></Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>{plan.maxActiveListings} active listings · {plan.analyticsLevel} analytics</Typography>
            <Stack component="ul" sx={{ pl: 2.5, my: 1.5 }}>
              {(plan.features || []).map((feature) => <Typography component="li" key={feature} variant="body2">{feature}</Typography>)}
            </Stack>
            {plan.featuredEligible ? <Chip size="small" label="Can buy promoted placement" sx={{ mb: 1.5 }} /> : null}
            <Button size="small" onClick={async () => {
              setActionError('');
              try {
                await api.patch(`/admin/plans/${plan.id}`, { isActive: !plan.isActive });
                reload();
              } catch (err) {
                setActionError(err.message);
              }
            }}
            >
              {plan.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </Card>
        ))}
      </Box>
      <Card sx={{ p: 2.5, maxWidth: 560 }}>
        <Typography fontWeight={800}>Grant a plan</Typography>
        <TextField select label="Provider" fullWidth margin="normal" value={assignment.providerId} onChange={(event) => setAssignment({ ...assignment, providerId: event.target.value })}>
          {providers.map((provider) => <MenuItem key={provider.id} value={provider.id}>{provider.businessName}</MenuItem>)}
        </TextField>
        <TextField select label="Plan" fullWidth margin="normal" value={assignment.planId} onChange={(event) => setAssignment({ ...assignment, planId: event.target.value })}>
          {data.map((plan) => <MenuItem key={plan.id} value={plan.id}>{plan.name}</MenuItem>)}
        </TextField>
        <Button sx={{ mt: 1 }} variant="contained" disabled={!assignment.providerId || !assignment.planId} onClick={async () => {
          setActionError('');
          setMessage('');
          try {
            await api.post('/admin/subscriptions/assign', assignment);
            setMessage('Plan granted. No payment was recorded.');
          } catch (err) {
            setActionError(err.message);
          }
        }}
        >
          Assign plan
        </Button>
      </Card>
    </Stack>
  );
}

export function AdminRevenue() {
  const [from, setFrom] = useState(new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState(null);
  const [payments, setPayments] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [providers, setProviders] = useState([]);
  const [providerId, setProviderId] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const [reportRes, paymentRes, payoutRes, providerRes] = await Promise.all([
      api.get('/admin/reports', { params: { from, to } }),
      api.get('/admin/payments'),
      api.get('/admin/payouts'),
      api.get('/admin/providers?limit=50'),
    ]);
    setReport(reportRes.data.data);
    setPayments(paymentRes.data.data);
    setPayouts(payoutRes.data.data);
    setProviders(providerRes.data.data);
  }

  useEffect(() => { load().catch((err) => setError(err.message)); }, []);

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Revenue" subtitle="Commission, subscriptions, refunds, and provider payouts. Figures are sample amounts." />
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Card sx={{ p: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField type="date" label="From" InputLabelProps={{ shrink: true }} value={from} onChange={(event) => setFrom(event.target.value)} />
        <TextField type="date" label="To" InputLabelProps={{ shrink: true }} value={to} onChange={(event) => setTo(event.target.value)} />
        <Button variant="contained" onClick={() => load().catch((err) => setError(err.message))}>Run report</Button>
      </Card>
      {report ? (
        <Box sx={statGrid}>
          <StatCard label="Gross completed value" value={formatINR(report.grossBookingPaise)} />
          <StatCard label="Commission" value={formatINR(report.commissionPaise)} />
          <StatCard label="Subscriptions" value={formatINR(report.subscriptionPaise)} />
          <StatCard label="Refunds" value={formatINR(report.refundPaise)} />
        </Box>
      ) : null}
      <Typography variant="h6">Payments</Typography>
      {payments.length === 0 ? <EmptyState title="No payments yet" /> : payments.map((payment) => (
        <Card key={payment.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography fontWeight={800}>{formatINR(payment.amountPaise)} · {payment.purpose}</Typography>
            <Typography variant="body2" color="text.secondary">{payment.method === 'dev_simulator' ? 'Development simulator' : payment.method === 'cod' ? 'Cash after service' : payment.method}</Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <StatusBadge status={payment.status} />
            {payment.status === 'paid' ? (
              <Button size="small" color="warning" onClick={async () => {
                setError('');
                try {
                  await api.post(`/admin/payments/${payment.id}/refund`, { reason: 'Admin refund from the demo console' });
                  await load();
                } catch (err) {
                  setError(err.message);
                }
              }}
              >
                Refund
              </Button>
            ) : null}
          </Stack>
        </Card>
      ))}
      <Typography variant="h6">Payouts</Typography>
      <Card sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }}>
          <TextField select label="Provider" value={providerId} onChange={(event) => setProviderId(event.target.value)} sx={{ minWidth: 280 }}>
            {providers.map((provider) => <MenuItem key={provider.id} value={provider.id}>{provider.businessName}</MenuItem>)}
          </TextField>
          <Button variant="contained" disabled={!providerId} onClick={async () => {
            setError('');
            try {
              await api.post('/admin/payouts/generate', { providerId });
              await load();
            } catch (err) {
              setError(err.message);
            }
          }}
          >
            Generate payout
          </Button>
        </Stack>
      </Card>
      {payouts.length === 0 ? <EmptyState title="No payout records" description="Generate one after a provider has unpaid commission." /> : payouts.map((payout) => (
        <Card key={payout.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Box>
            <Typography fontWeight={800}>{payout.providerName}</Typography>
            <Typography variant="body2" color="text.secondary">Net {formatINR(payout.netPaise)} · commission {formatINR(payout.commissionPaise)}</Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <StatusBadge status={payout.status} />
            {payout.status !== 'paid' ? (
              <Button size="small" variant="contained" onClick={async () => {
                setError('');
                try {
                  await api.patch(`/admin/payouts/${payout.id}/paid`, { referenceNote: 'Marked paid in the demo console. No real transfer was made.' });
                  await load();
                } catch (err) {
                  setError(err.message);
                }
              }}
              >
                Mark paid
              </Button>
            ) : null}
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

export function AdminSettings() {
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { api.get('/admin/settings').then((response) => setForm(response.data.data)).catch((err) => setError(err.message)); }, []);
  if (error && !form) return <Alert severity="error">{error}</Alert>;
  if (!form) return <LoadingScreen />;
  return (
    <Stack spacing={2.5} component="form" onSubmit={async (event) => {
      event.preventDefault();
      setMessage('');
      setError('');
      try {
        const response = await api.patch('/admin/settings', {
          platformName: form.platformName,
          commissionRateBps: Number(form.commissionRateBps),
          taxRateBps: Number(form.taxRateBps),
          codEnabled: Boolean(form.codEnabled),
          supportEmail: form.supportEmail,
          supportPhone: form.supportPhone,
          featuredPricePaise: Number(form.featuredPricePaise),
          featuredDurationDays: Number(form.featuredDurationDays),
        });
        setForm(response.data.data);
        setMessage('Settings saved. New bookings use the updated commission rate.');
      } catch (err) {
        setError(err.message);
      }
    }}
    >
      <PageHeader title="Platform settings" subtitle="These values apply to new bookings. Existing bookings keep the rate they were quoted with." />
      {message ? <Alert severity="success">{message}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Card sx={{ p: 2.5, display: 'grid', gap: 2, maxWidth: 720 }}>
        <TextField label="Platform name" value={form.platformName || ''} onChange={(event) => setForm({ ...form, platformName: event.target.value })} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <TextField label="Commission basis points" helperText="1000 = 10% of the service amount." value={form.commissionRateBps} onChange={(event) => setForm({ ...form, commissionRateBps: event.target.value })} />
          <TextField label="Tax basis points" helperText="1800 = 18%. Added to the customer total." value={form.taxRateBps} onChange={(event) => setForm({ ...form, taxRateBps: event.target.value })} />
          <TextField label="Support email" value={form.supportEmail || ''} onChange={(event) => setForm({ ...form, supportEmail: event.target.value })} />
          <TextField label="Support phone" value={form.supportPhone || ''} onChange={(event) => setForm({ ...form, supportPhone: event.target.value })} />
          <TextField label="Featured price in paise" helperText="100 paise = ₹1." value={form.featuredPricePaise} onChange={(event) => setForm({ ...form, featuredPricePaise: event.target.value })} />
          <TextField label="Featured duration days" value={form.featuredDurationDays} onChange={(event) => setForm({ ...form, featuredDurationDays: event.target.value })} />
        </Box>
        <FormControlLabel control={<Switch checked={Boolean(form.codEnabled)} onChange={(event) => setForm({ ...form, codEnabled: event.target.checked })} />} label="Allow cash after service" />
        <Button type="submit" variant="contained" sx={{ justifySelf: 'start' }}>Save settings</Button>
      </Card>
    </Stack>
  );
}

export function AdminUsers() {
  const { user } = useAuth();
  const [role, setRole] = useState('');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  async function load(nextRole = role, nextQuery = query) {
    const response = await api.get('/admin/users', { params: { limit: 50, role: nextRole || undefined, q: nextQuery || undefined } });
    setRows(response.data.data);
  }

  useEffect(() => { load().catch((err) => setError(err.message)); }, []);

  return (
    <Stack spacing={2.5}>
      <PageHeader title="Users" subtitle="Customers, providers, and the admin account. Deactivating an account blocks the next login." />
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <TextField label="Search name or email" value={query} onChange={(event) => setQuery(event.target.value)} sx={{ flex: 1 }} />
        <Button variant="contained" onClick={() => load().catch((err) => setError(err.message))}>Search</Button>
      </Stack>
      <FilterChips value={role} onChange={(next) => { setRole(next); load(next, query).catch((err) => setError(err.message)); }} options={[{ value: '', label: 'All roles' }, { value: 'customer', label: 'Customers' }, { value: 'provider', label: 'Providers' }, { value: 'admin', label: 'Admins' }]} />
      {!rows ? <LoadingScreen /> : null}
      {rows && rows.length === 0 ? <EmptyState title="No accounts match" /> : null}
      {(rows || []).map((account) => (
        <Card key={account.id} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
              <Typography fontWeight={800}>{account.name}</Typography>
              <Chip size="small" label={account.role} color={account.role === 'admin' ? 'secondary' : 'default'} />
              {account.isDemo ? <Chip size="small" label="Demo" /> : null}
              <Chip size="small" color={account.isActive ? 'success' : 'default'} label={account.isActive ? 'Active' : 'Inactive'} />
            </Stack>
            <Typography color="text.secondary">{account.email}</Typography>
          </Box>
          <Button
            size="small"
            variant="outlined"
            disabled={account.id === user?.id}
            onClick={async () => {
              setError('');
              try {
                await api.patch(`/admin/users/${account.id}/status`, { isActive: !account.isActive });
                await load();
              } catch (err) {
                setError(err.message);
              }
            }}
          >
            {account.id === user?.id ? 'This is you' : account.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </Card>
      ))}
    </Stack>
  );
}
