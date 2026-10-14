import { ApiError } from '../utils/apiError.js';

export function notFound(req, res) {
  res.status(404).json({ success: false, message: 'The requested resource was not found.' });
}

export function errorHandler(err, req, res, _next) {
  if (typeof err?.message === 'string' && err.message.startsWith('Upload a')) {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err?.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Each file must be 5 MB or smaller.'
      : 'The upload could not be processed.';
    return res.status(400).json({ success: false, message });
  }
  if (err?.name === 'ValidationError') {
    return res.status(422).json({ success: false, message: 'Please check the submitted values.' });
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({ success: false, message: 'That record could not be found.' });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ success: false, message: 'This conflicts with an existing record.' });
  }
  const status = err instanceof ApiError ? err.status : err.status || 500;
  if (status >= 500) {
    console.log(JSON.stringify({ level: 'error', message: err.message, path: req.path }));
  }
  return res.status(status).json({
    success: false,
    message: status >= 500 ? 'Something went wrong. Please try again.' : err.message,
    errors: err.errors || [],
  });
}
