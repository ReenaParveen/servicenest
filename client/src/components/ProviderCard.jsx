import { Box, Card, CardActionArea, Chip, Rating, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { formatINR } from '../utils/money';
import { imageForProvider } from '../utils/serviceImages';

export default function ProviderCard({ provider }) {
  return (
    <Card className="provider-card" sx={{ overflow: 'hidden' }}>
      <CardActionArea component={RouterLink} to={`/providers/${provider.id}`} sx={{ alignItems: 'stretch' }}>
        <Stack direction="row" spacing={0} sx={{ alignItems: 'stretch' }}>
          <Box
            component="img"
            src={imageForProvider(provider)}
            alt=""
            sx={{ width: { xs: 112, sm: 156 }, height: 'auto', minHeight: 148, objectFit: 'cover', flexShrink: 0 }}
          />
          <Box sx={{ minWidth: 0, flex: 1, p: 2 }}>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" alignItems="center">
              <Typography variant="h6" sx={{ fontSize: '1.05rem' }}>{provider.businessName}</Typography>
              {provider.verificationStatus === 'approved' ? <Chip size="small" color="success" label="Verified" /> : null}
              {provider.promoted ? <Chip size="small" label="Promoted" variant="outlined" /> : null}
              {provider.isDemo ? <Chip size="small" label="Demo" /> : null}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <Rating value={provider.ratingAvg || 0} precision={0.1} readOnly size="small" />
              <Typography variant="body2" color="text.secondary">
                {provider.ratingCount ? `${provider.ratingAvg} (${provider.ratingCount})` : 'New provider'}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              {provider.city || 'Service area not set'}
              {provider.serviceRadiusKm ? ` · up to ${provider.serviceRadiusKm} km` : ''}
              {provider.distanceKm != null ? ` · ${provider.distanceKm} km away` : ''}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }} noWrap>
              {(provider.services || []).map((service) => service.title).join(' · ') || 'Services listed'}
            </Typography>
            <Typography sx={{ mt: 1 }} color="primary.main" fontWeight={800}>
              From {formatINR(provider.startingPricePaise)}
            </Typography>
          </Box>
        </Stack>
      </CardActionArea>
    </Card>
  );
}
