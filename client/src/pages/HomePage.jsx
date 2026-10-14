import { useEffect, useState } from 'react';
import {
  Box, Button, Card, Container, MenuItem, Rating, Stack, TextField, Typography,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import api from '../services/api';
import ProviderCard from '../components/ProviderCard';
import { serviceImage } from '../utils/serviceImages';
import { useConfig } from '../context/ConfigContext';
import { readLocation, saveLocation } from '../utils/location';

export default function HomePage() {
  const navigate = useNavigate();
  const { platformName } = useConfig();
  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState(readLocation());
  const [suggestions, setSuggestions] = useState([]);
  const [geoError, setGeoError] = useState('');

  useEffect(() => {
    api.get('/categories').then((response) => setCategories(response.data.data)).catch(() => {});
    api.get('/providers/featured').then((response) => setProviders(response.data.data)).catch(() => {});
    api.get('/reviews/recent').then((response) => setReviews(response.data.data)).catch(() => {});
  }, []);

  async function onLocationChange(value) {
    const next = { ...location, label: value, city: value };
    setLocation(next);
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const response = await api.get('/geo/search', { params: { q: value } }).catch(() => null);
    setSuggestions(response?.data?.data || []);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeoError('This browser cannot share location. Type a city instead.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          label: 'Current location',
          city: '',
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setLocation(next);
        saveLocation(next);
        setGeoError('');
      },
      () => setGeoError('Location permission was denied. Type a city instead.')
    );
  }

  function search(event) {
    event.preventDefault();
    saveLocation(location);
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (location.city) params.set('city', location.city);
    if (location.lat) params.set('lat', location.lat);
    if (location.lng) params.set('lng', location.lng);
    navigate(`/services?${params.toString()}`);
  }

  return (
    <>
      <Box
        sx={{
          color: '#fff',
          backgroundImage: `linear-gradient(105deg, rgba(8, 28, 32, 0.9) 0%, rgba(15, 118, 110, 0.55) 52%, rgba(8, 28, 32, 0.28) 100%), url(${serviceImage('home-cleaning')})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          pt: { xs: 6, md: 9 },
          pb: { xs: 12, md: 15 },
        }}
      >
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={4} alignItems={{ lg: 'center' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="overline" sx={{ color: '#99F6E4', letterSpacing: '0.16em' }}>Local professionals, clearly booked</Typography>
              <Typography variant="h2" sx={{ color: '#fff', fontSize: { xs: '2.45rem', md: '3.7rem' }, mt: 1, maxWidth: 680, lineHeight: 1.05 }}>
                Book trusted help for the jobs around your home.
              </Typography>
              <Typography sx={{ mt: 2, maxWidth: 540, color: 'rgba(255,255,255,0.9)', fontSize: '1.08rem' }}>
                {platformName || 'ServiceNest'} helps you compare verified electricians, plumbers, cleaners, and other local providers, then track the visit from request to completion.
              </Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25, width: { xs: '100%', sm: 360 }, flexShrink: 0 }}>
              {['electrician', 'plumber', 'painter', 'ac-repair'].map((slug) => (
                <Box
                  key={slug}
                  component="img"
                  src={serviceImage(slug)}
                  alt=""
                  sx={{ width: '100%', height: { xs: 110, md: 128 }, objectFit: 'cover', borderRadius: 2.5, border: '2px solid rgba(255,255,255,0.4)' }}
                />
              ))}
            </Box>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: { xs: -7, md: -7 }, position: 'relative', zIndex: 1 }}>
        <Card sx={{ p: { xs: 2, md: 2.5 }, boxShadow: '0 18px 48px rgba(18, 32, 43, 0.14)' }}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>Find a service</Typography>
          <Box component="form" onSubmit={search} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '220px 1fr auto auto' }, gap: 1.5, alignItems: 'start' }}>
            <TextField select label="Service" fullWidth value={category} onChange={(event) => setCategory(event.target.value)}>
              <MenuItem value="">All services</MenuItem>
              {categories.map((item) => <MenuItem key={item.id} value={item.slug}>{item.name}</MenuItem>)}
            </TextField>
            <Box>
              <TextField
                label="City or area"
                fullWidth
                value={location.label || ''}
                onChange={(event) => onLocationChange(event.target.value)}
                helperText={geoError || 'If location access is off, type the city manually.'}
              />
              {suggestions.length > 0 ? (
                <Stack sx={{ mt: 1 }}>
                  {suggestions.map((item) => (
                    <Button key={item.label} sx={{ justifyContent: 'flex-start' }} onClick={() => {
                      const next = { label: item.label, city: item.city || item.label, lat: item.lat, lng: item.lng };
                      setLocation(next);
                      setSuggestions([]);
                    }}
                    >
                      {item.label}
                    </Button>
                  ))}
                </Stack>
              ) : null}
            </Box>
            <Button type="button" onClick={useMyLocation} variant="outlined" sx={{ height: 56 }}>Use my location</Button>
            <Button type="submit" variant="contained" sx={{ height: 56, px: 3 }}>Search</Button>
          </Box>
        </Card>
      </Container>

      <Container maxWidth="lg" sx={{ pt: 7, pb: 2 }}>
        <Typography variant="h4">Popular services</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5 }}>Pick a trade and compare providers near you.</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(3, 1fr)' }, gap: 2, mt: 3 }}>
          {categories.map((item) => (
            <Card key={item.id} className="service-photo-card" component={RouterLink} to={`/services?category=${item.slug}`} sx={{ textDecoration: 'none', color: 'inherit', overflow: 'hidden' }}>
              <Box
                role="img"
                aria-label={item.name}
                sx={{
                  height: 210,
                  backgroundImage: `linear-gradient(180deg, rgba(18,32,43,0.02) 25%, rgba(18,32,43,0.78) 100%), url(${serviceImage(item.slug)})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'flex-end',
                  p: 2.25,
                }}
              >
                <Box>
                  <Typography fontWeight={800} sx={{ color: '#fff', fontSize: '1.2rem' }}>{item.name}</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.92)', mt: 0.35 }}>{item.description}</Typography>
                </Box>
              </Box>
            </Card>
          ))}
        </Box>
      </Container>

      <Box sx={{ bgcolor: '#fff', borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider', py: { xs: 5, md: 7 }, mt: 7 }}>
        <Container maxWidth="lg">
          <Typography variant="h4">Featured providers</Typography>
          <Typography color="text.secondary" sx={{ mb: 2.5, mt: 0.5 }}>Promoted profiles are paid placements. The Verified badge is a separate review of documents.</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
            {providers.length === 0 ? <Typography color="text.secondary">Verified providers will appear here after they are approved.</Typography> : providers.map((provider) => <ProviderCard key={provider.id} provider={provider} />)}
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
        <Box id="how-it-works">
          <Typography variant="h4">How it works</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2, mt: 2.5 }}>
            {[
              ['01', 'Compare', 'Search by service and location, then review price, rating, and verification.'],
              ['02', 'Book a slot', 'Pick an open time, share the service address, and choose cash or an available online payment.'],
              ['03', 'Track the visit', 'Follow the job from request to completion, then leave a review.'],
            ].map(([step, title, copy]) => (
              <Card key={title} sx={{ p: 3, background: 'linear-gradient(180deg, #ffffff 0%, #f3fbfa 100%)' }}>
                <Typography sx={{ color: 'primary.main', fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.04em' }}>{step}</Typography>
                <Typography variant="h6" sx={{ mt: 1 }}>{title}</Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>{copy}</Typography>
              </Card>
            ))}
          </Box>
        </Box>

        <Typography variant="h4" sx={{ mt: 7 }}>Customer reviews</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 2.5 }}>
          {reviews.length === 0 ? <Typography color="text.secondary">Reviews appear after completed jobs.</Typography> : reviews.map((review) => (
            <Card key={review.id} sx={{ p: 3, borderTop: '4px solid', borderTopColor: 'primary.main' }}>
              <Rating value={review.rating || 0} readOnly size="small" />
              <Typography sx={{ mt: 1.5, fontSize: '1.05rem' }}>&ldquo;{review.comment}&rdquo;</Typography>
              <Typography fontWeight={800} sx={{ mt: 2 }}>{review.customerName}</Typography>
              <Typography variant="body2" color="text.secondary">{review.providerName}</Typography>
            </Card>
          ))}
        </Box>

        <Box
          sx={{
            mt: 7,
            p: { xs: 3, md: 6 },
            borderRadius: 4,
            color: '#fff',
            backgroundImage: `linear-gradient(100deg, rgba(15, 70, 66, 0.92), rgba(18, 32, 43, 0.55)), url(${serviceImage('carpenter')})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <Typography variant="h4" sx={{ color: '#fff' }}>Offer your services on {platformName || 'ServiceNest'}</Typography>
          <Typography sx={{ mt: 1, maxWidth: 640, color: 'rgba(255,255,255,0.92)' }}>Create a provider profile, upload verification documents, and set the areas and hours you actually cover.</Typography>
          <Button component={RouterLink} to="/register?role=provider" variant="contained" sx={{ mt: 3, bgcolor: '#fff', color: 'primary.dark', '&:hover': { bgcolor: '#f4f7f7' } }}>Become a provider</Button>
        </Box>
      </Container>
    </>
  );
}
