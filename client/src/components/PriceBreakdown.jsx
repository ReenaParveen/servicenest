import { Divider, Stack, Typography } from '@mui/material';
import { formatINR } from '../utils/money';

function Row({ label, value, hint }) {
  return (
    <Stack spacing={0.25}>
      <Stack direction="row" justifyContent="space-between" gap={2}>
        <Typography>{label}</Typography>
        <Typography fontWeight={700}>{value}</Typography>
      </Stack>
      {hint ? <Typography variant="caption" color="text.secondary">{hint}</Typography> : null}
    </Stack>
  );
}

export default function PriceBreakdown({ quote }) {
  if (!quote) return null;
  return (
    <Stack spacing={1.25}>
      <Row label="Service charge" value={formatINR(quote.serviceAmountPaise)} />
      <Row label="Tax" value={formatINR(quote.taxPaise || 0)} />
      <Divider />
      <Row label="Total payable" value={formatINR(quote.totalPaise)} />
      <Row
        label="Platform commission"
        value={formatINR(quote.platformFeePaise)}
        hint="Taken from the service amount. It is not added again on top of the total."
      />
      {quote.providerSharePaise != null ? (
        <Row label="Provider receives before payout adjustments" value={formatINR(quote.providerSharePaise)} />
      ) : null}
      <Row
        label="Payment gateway charge"
        value={formatINR(quote.gatewayFeePaise || 0)}
        hint="Shown separately and not added to the customer total in this pilot."
      />
    </Stack>
  );
}
