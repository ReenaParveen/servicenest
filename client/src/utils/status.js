const LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  in_progress: 'In progress',
  completed: 'Completed',
  rejected: 'Declined',
  cancelled: 'Cancelled',
  unpaid: 'Unpaid',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  partially_refunded: 'Partly refunded',
  approved: 'Verified',
  suspended: 'Suspended',
  open: 'Open',
  under_review: 'Under review',
  resolved: 'Resolved',
};

const COLORS = {
  pending: 'warning',
  accepted: 'info',
  in_progress: 'primary',
  completed: 'success',
  rejected: 'error',
  cancelled: 'error',
  unpaid: 'warning',
  paid: 'success',
  failed: 'error',
  refunded: 'default',
  partially_refunded: 'warning',
  approved: 'success',
  suspended: 'error',
  open: 'warning',
  under_review: 'info',
  resolved: 'success',
};

export function statusLabel(status) {
  return LABELS[status] || String(status || '').replaceAll('_', ' ');
}

export function statusColor(status) {
  return COLORS[status] || 'default';
}
