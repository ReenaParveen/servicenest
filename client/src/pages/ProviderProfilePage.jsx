import { useEffect, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, Card, Container, Rating, Stack, Typography } from '@mui/material';
import api from '../services/api';
import LoadingScreen from '../components/LoadingScreen';
import StatusBadge from '../components/StatusBadge';
import MapPanel from '../components/MapPanel';
import { formatINR } from '../utils/money';
import { serviceImage } from '../utils/serviceImages';

export default function ProviderProfilePage() {
  const { id } = useParams();
  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setProvider(null);
    api.get(`/providers/${id}`).then((response) => setProvider(response.data.data)).catch((err) => setError(err.message));
    api.get(`/providers/${id}/reviews`).then((response) => setReviews(response.data.data)).catch(() => {});
  }, [id]);

  if (error) return <Container sx={{ py: 6 }}><Alert severity="error">{error}</Alert></Container>;
  if (!provider) return <LoadingScreen />;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
            <Typography variant="h4">{provider.businessName}</Typography>
            <StatusBadge status={provider.verificationStatus} label={provider.verificationStatus === 'approved' ? 'Verified' : provider.verificationStatus} />
            {provider.promoted ? <StatusBadge status="pending" label="Promoted" /> : null}
            {provider.isDemo ? <StatusBadge status="pending" label="Demo profile" /> : null}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
            <Rating value={provider.ratingAvg || 0} precision={0.1} readOnly />
            <Typography color="text.secondary">{provider.ratingCount ? `${provider.ratingCount} reviews` : 'No reviews yet'}</Typography>
          </Stack>
          <Typography sx={{ mt: 2, maxWidth: 720 }}>{provider.bio}</Typography>
        </Box>
        <Button component={RouterLink} to={`/book/${provider.id}`} variant="contained" size="large">Book now</Button>
      </Stack>
      {provider.promoted ? <Alert sx={{ mt: 2 }} severity="info">This profile is labelled Promoted because of a paid placement. That label does not mean the provider is verified.</Alert> : null}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr .8fr' }, gap: 3, mt: 3 }}>
        <Stack spacing={2}>
          {(provider.services || []).map((service) => (
            <Card key={service.id} sx={{ display: 'flex', overflow: 'hidden' }}>
              <Box
                component="img"
                src={serviceImage(service.category?.slug)}
                alt=""
                sx={{ width: { xs: 96, sm: 168 }, objectFit: 'cover', flexShrink: 0 }}
              />
              <Box sx={{ p: 2 }}>
                <Typography fontWeight={800}>{service.title}</Typography>
                <Typography color="text.secondary">{service.description}</Typography>
                <Typography sx={{ mt: 1 }} color="primary.main" fontWeight={800}>{formatINR(service.pricePaise)} · {service.priceUnit}</Typography>
              </Box>
            </Card>
          ))}
          <Typography variant="h6">Reviews</Typography>
          {reviews.length === 0 ? <Typography color="text.secondary">No reviews yet.</Typography> : reviews.map((review) => (
            <Card key={review.id} sx={{ p: 2 }}>
              <Typography fontWeight={700}>{review.customerName} · {review.rating}/5 {review.isDemo ? '(demo)' : ''}</Typography>
              <Typography>{review.comment}</Typography>
              {review.providerResponse ? <Typography sx={{ mt: 1 }} color="text.secondary">Provider reply: {review.providerResponse}</Typography> : null}
            </Card>
          ))}
        </Stack>
        <Stack spacing={2}>
          <Card sx={{ p: 2 }}>
            <Typography fontWeight={800}>Service area</Typography>
            <Typography color="text.secondary">{provider.city}{provider.state ? `, ${provider.state}` : ''} · up to {provider.serviceRadiusKm} km</Typography>
            <Box sx={{ mt: 2 }}>
              {provider.lat != null ? <MapPanel lat={provider.lat} lng={provider.lng} radiusKm={provider.serviceRadiusKm} /> : <Typography>Map will appear after the provider adds coordinates.</Typography>}
            </Box>
          </Card>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            {(provider.portfolio || []).map((image) => (
              <Box key={image.id} component="img" src={image.url} alt={image.caption || 'Portfolio work'} sx={{ width: '100%', borderRadius: 2, height: 120, objectFit: 'cover' }} />
            ))}
          </Box>
        </Stack>
      </Box>
    </Container>
  );
}
