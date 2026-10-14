export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export function send(res, data, status = 200, message) {
  const body = { success: true, data };
  if (message) body.message = message;
  return res.status(status).json(body);
}
