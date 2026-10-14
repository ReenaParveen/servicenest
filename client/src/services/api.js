import { mockRequest, setMockUnauthorized } from './mockApi';

export function setUnauthorizedHandler(handler) {
  setMockUnauthorized(handler);
}

export function fieldErrors(error) {
  const map = {};
  for (const item of error?.errors || []) map[item.field] = item.message;
  return map;
}

const api = {
  get: (url, config) => mockRequest('get', url, null, config),
  post: (url, body, config) => mockRequest('post', url, body, config),
  patch: (url, body, config) => mockRequest('patch', url, body, config),
  put: (url, body, config) => mockRequest('put', url, body, config),
  delete: (url, config) => mockRequest('delete', url, null, config),
};

export default api;
