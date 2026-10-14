function strip(value) {
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.')) delete value[key];
    else strip(value[key]);
  }
}

export function sanitizeRequest(req, _res, next) {
  strip(req.body);
  strip(req.params);
  strip(req.query);
  next();
}
