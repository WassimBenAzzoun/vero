export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface PaginationOptions<T> {
  page: number;
  limit: number;
  findMany: (args: { skip: number; take: number }) => Promise<T[]>;
  count: () => Promise<number>;
}

export async function paginate<T>({
  page,
  limit,
  findMany,
  count,
}: PaginationOptions<T>): Promise<{
  data: T[];
  meta: PaginationMeta;
}> {
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    findMany({ skip, take: limit }),
    count(),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1 && total > 0,
    },
  };
}
