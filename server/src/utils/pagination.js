export function parsePage(query, defaultLimit = 12) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit, pages: (total) => Math.ceil(total / limit) || 0 };
}
