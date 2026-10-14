import { Chip } from '@mui/material';
import { statusColor, statusLabel } from '../utils/status';

export default function StatusBadge({ status, label }) {
  return <Chip size="small" color={statusColor(status)} label={label || statusLabel(status)} />;
}
