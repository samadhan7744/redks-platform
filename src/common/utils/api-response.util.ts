export function ok<T>(data: T, message = 'OK') {
  return { success: true, message, data };
}

export function paginated<T>(data: T[], total: number, page = 1, limit = 20, message = 'OK') {
  return {
    success: true,
    message,
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export function paginationParams(page = 1, limit = 20) {
  const safePage = Math.max(page || 1, 1);
  const safeLimit = Math.min(Math.max(limit || 20, 1), 100);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
    take: safeLimit,
  };
}
