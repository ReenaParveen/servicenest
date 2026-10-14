import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  danger = false,
  requireNote = false,
  noteLabel = 'Reason',
  loading = false,
  onClose,
  onConfirm,
}) {
  const noteId = 'confirm-note';
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} aria-labelledby="confirm-title" fullWidth maxWidth="xs">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const note = requireNote ? event.currentTarget.elements.note.value : '';
          onConfirm(note);
        }}
      >
        <DialogTitle id="confirm-title">{title}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">{description}</Typography>
          {requireNote ? (
            <TextField
              name="note"
              id={noteId}
              label={noteLabel}
              fullWidth
              required
              margin="normal"
              multiline
              minRows={2}
              autoFocus
            />
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="contained" color={danger ? 'error' : 'primary'} disabled={loading}>
            {confirmLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
