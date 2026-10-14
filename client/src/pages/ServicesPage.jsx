import { useEffect, useState } from 'react';
import {
  Box, Button, Card, Container, MenuItem, Pagination, Stack, TextField, Typography,
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import ProviderCard from '../components/ProviderCard';
import LoadingScreen from '../components/LoadingScreen';
import EmptyState from '../components/EmptyState';
import { rupeesToPaise } from '../utils/money';
import { serviceImage } from '../utils/serviceImages';

export default function ServicesPage() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [result, setResult] = useState({ data: [], pagination: { page: 1, pages: 1 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    api.get('/categories').then((response) => setCategories(response.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get('/providers/search', { params: Object.fromEntries(params.entries()) })
      .then((response) => setResult(response.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params]);

  function update(next) {
    const merged = new URLSearchParams(params);
    Object.entries(next).forEach(([key, value]) => {
      if (value === '' || value == null) merged.delete(key);
      else merged.set(key, value);
    });
    merged.set('page', next.page || '1');
    setParams(merged);
  }

  function applyPrice(event) {
    event.preventDefault();
    update({
      minPricePaise: rupeesToPaise(minPrice) || '',
      maxPricePaise: rupeesToPaise(maxPrice) || '',
      page: '1',
    });
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4">Find a provider</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>Only verified providers are listed. Promoted means a paid placement, not an extra verification.</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' }, gap: 1.5, mb: 3 }}>
        {categories.map((item) => {
          const selected = params.get('category') === item.slug;
          return (
            <Card
              key={item.id}
              component="button"
              type="button"
              onClick={() => update({ category: selected ? '' : item.slug, page: '1' })}
              sx={{
                p: 0,
                overflow: 'hidden',
                textAlign: 'left',
                cursor: 'pointer',
                font: 'inherit',
                color: 'inherit',
                backgroundColor: '#fff',
                borderColor: selected ? 'primary.main' : 'divider',
                boxShadow: selected ? '0 0 0 2px #0F766E' : 'none',
              }}
            >
              <Box component="img" src={serviceImage(item.slug)} alt="" sx={{ width: '100%', height: 84, objectFit: 'cover', display: 'block' }} />
              <Typography sx={{ px: 1.25, py: 1, fontWeight: 800, fontSize: '0.85rem' }}>{item.name}</Typography>
            </Card>
          );
        })}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '280px 1fr' }, gap: 3 }}>
        <Stack spacing={2} component="form" onSubmit={applyPrice}>
          <TextField select label="Category" value={params.get('category') || ''} onChange={(event) => update({ category: event.target.value, page: '1' })}>
            <MenuItem value="">All</MenuItem>
            {categories.map((category) => <MenuItem key={category.id} value={category.slug}>{category.name}</MenuItem>)}
          </TextField>
          <TextField label="City" value={params.get('city') || ''} onChange={(event) => update({ city: event.target.value, lat: '', lng: '', page: '1' })} />
          <TextField label="Search name" value={params.get('q') || ''} onChange={(event) => update({ q: event.target.value, page: '1' })} />
          <TextField select label="Minimum rating" value={params.get('minRating') || ''} onChange={(event) => update({ minRating: event.target.value, page: '1' })}>
            <MenuItem value="">Any</MenuItem>
            <MenuItem value="3">3+</MenuItem>
            <MenuItem value="4">4+</MenuItem>
          </TextField>
          <TextField label="Min price (₹)" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} />
          <TextField label="Max price (₹)" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} />
          <TextField select label="Sort" value={params.get('sort') || 'relevance'} onChange={(event) => update({ sort: event.target.value, page: '1' })}>
            <MenuItem value="relevance">Relevance</MenuItem>
            <MenuItem value="price_asc">Price: low to high</MenuItem>
            <MenuItem value="price_desc">Price: high to low</MenuItem>
            <MenuItem value="rating">Rating</MenuItem>
          </TextField>
          <Button type="button" variant={params.get('available') === 'true' ? 'contained' : 'outlined'} onClick={() => update({ available: params.get('available') === 'true' ? '' : 'true', page: '1' })}>
            Has a slot this week
          </Button>
          <Button type="submit" variant="contained">Apply price</Button>
        </Stack>
        <Box>
          {loading ? <LoadingScreen /> : null}
          {error ? <Typography color="error">{error}</Typography> : null}
          {!loading && result.data?.length === 0 ? <EmptyState title="No providers match these filters" description="Try another category or a wider area." /> : null}
          <Stack spacing={2}>
            {(result.data || []).map((provider) => <ProviderCard key={provider.id} provider={provider} />)}
          </Stack>
          {result.pagination?.pages > 1 ? (
            <Pagination sx={{ mt: 3 }} page={result.pagination.page} count={result.pagination.pages} onChange={(_event, page) => update({ page: String(page) })} />
          ) : null}
        </Box>
      </Box>
    </Container>
  );
}
