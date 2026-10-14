import { Card, CardContent, Typography } from '@mui/material';

export default function StatCard({ label, value, hint }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h5" sx={{ mt: 0.5 }}>{value}</Typography>
        {hint ? <Typography variant="caption" color="text.secondary">{hint}</Typography> : null}
      </CardContent>
    </Card>
  );
}
