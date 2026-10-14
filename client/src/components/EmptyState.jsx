import { Box, Typography } from '@mui/material';

export default function EmptyState({ title, description, action }) {
  return (
    <Box sx={{ py: 6, px: 2, textAlign: 'center' }}>
      <Typography variant="h6">{title}</Typography>
      {description ? <Typography color="text.secondary" sx={{ mt: 1, mb: 2 }}>{description}</Typography> : null}
      {action}
    </Box>
  );
}
