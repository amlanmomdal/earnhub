import { Model } from 'mongoose';

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function paginate<T>(
  model: Model<any>,
  filter: Record<string, unknown>,
  query: PaginationQuery,
): Promise<PaginatedResult<T>> {
  const page = Math.max(query.page ?? 1, 1);
  const limit = Math.min(query.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const sortField = query.sortBy ?? 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

  const [items, total] = await Promise.all([
    model
      .find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec(),
    model.countDocuments(filter).exec(),
  ]);

  return {
    items: items as T[],
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
