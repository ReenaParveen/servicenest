import { Box, CircularProgress } from '@mui/material';

export default function LoadingScreen() {
  return (
    <Box sx={{ minHeight: '40vh', display: 'grid', placeItems: 'center' }} role="status" aria-live="polite">
      <CircularProgress />
    </Box>
  );
}
