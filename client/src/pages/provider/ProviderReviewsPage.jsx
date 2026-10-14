import { useEffect, useState } from 'react';
import { Button, Card, Stack, TextField, Typography } from '@mui/material';
import api from '../../services/api';

export default function ProviderReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    api.get('/providers/me/reviews').then((response) => setReviews(response.data.data)).catch(() => {});
  }, []);

  return (
    <Stack spacing={2}>
      <Typography variant="h4">Reviews</Typography>
      {reviews.length === 0 ? <Typography color="text.secondary">Reviews appear after completed jobs.</Typography> : null}
      {reviews.map((review) => (
        <Card key={review.id} sx={{ p: 2 }}>
          <Typography fontWeight={800}>{review.customerName} · {review.rating}/5</Typography>
          <Typography>{review.comment}</Typography>
          {review.providerResponse ? <Typography sx={{ mt: 1 }}>Your reply: {review.providerResponse}</Typography> : (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
              <TextField fullWidth size="small" label="Reply" value={drafts[review.id] || ''} onChange={(event) => setDrafts({ ...drafts, [review.id]: event.target.value })} />
              <Button onClick={async () => {
                await api.post(`/reviews/${review.id}/response`, { response: drafts[review.id] });
                const refreshed = await api.get('/providers/me/reviews');
                setReviews(refreshed.data.data);
              }}>Send reply</Button>
            </Stack>
          )}
        </Card>
      ))}
    </Stack>
  );
}
