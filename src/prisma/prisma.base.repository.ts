import { PrismaClient, Prisma } from '@prisma/client';
import { normalizeDates } from 'app/common';

export class PrismaBaseRepository<
  T,
  CreateInput,
  UpdateInput,
  WhereUniqueInput,
  WhereInput,
  UpsertArgs,
> {
  constructor(
    private readonly model: keyof Omit<
      PrismaClient,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
    >,
    private readonly prisma: PrismaClient,
  ) {}

  private getModelDelegate() {
    return this.prisma[this.model] as any;
  }

  async findOne(
    uniqueFilter: WhereUniqueInput | any,
    include?: any,
    select?: any,
  ): Promise<T | null | any> {
    const result = await this.getModelDelegate().findFirst({
      where: { ...uniqueFilter, deletedAt: null },
      include,
      select,
    });
    return normalizeDates(result, 'toTZ');
  }

  async create(data: CreateInput): Promise<T> {
    const payload = normalizeDates({ ...data }, 'toUTC');
    const result = await this.getModelDelegate().create({ data: payload });
    return normalizeDates(result, 'toTZ');
  }

  async update(uniqueFilter: WhereUniqueInput, data: UpdateInput): Promise<T> {
    const payload = normalizeDates({ ...data }, 'toUTC');
    const result = await this.getModelDelegate().update({
      where: { ...uniqueFilter, deletedAt: null },
      data: payload,
    });
    return normalizeDates(result, 'toTZ');
  }

  async delete(uniqueFilter: WhereUniqueInput): Promise<T> {
    const result = await this.getModelDelegate().update({
      where: { ...uniqueFilter, deletedAt: null },
      data: { deletedAt: new Date() }, // still UTC by default
    });
    return normalizeDates(result, 'toTZ');
  }

  async forceDelete(uniqueFilter: WhereUniqueInput): Promise<T> {
    const result = await this.getModelDelegate().delete({
      where: { ...uniqueFilter },
    });
    return normalizeDates(result, 'toTZ');
  }

  async count(
    filters: WhereInput,
    deleted?: string | boolean,
  ): Promise<number> {
    return this.getModelDelegate().count({
      where: {
        ...filters,
        deletedAt: deleted === 'true' ? { not: null } : null,
      },
    });
  }

  async countDistinct(filters: WhereInput, by?: any): Promise<number> {
    const result = await this.getModelDelegate().groupBy({
      by,
      where: { ...filters, deletedAt: null },
    });
    return result.length;
  }

  async findManyWithPagination(
    filters?: WhereInput,
    pagination?: { page?: number; limit?: number },
    orderBy: Prisma.SortOrder = 'desc',
    include?: any,
    select?: any,
    deleted?: string | boolean,
  ): Promise<T[]> {
    const { page = 1, limit = 20 } = pagination ?? {};
    const results = await this.getModelDelegate().findMany({
      where: {
        ...filters,
        deletedAt: deleted === 'true' ? { not: null } : null,
      },
      select,
      include,
      skip: (page - 1) * limit,
      take: +limit,
      orderBy: { createdAt: orderBy },
    });
    return normalizeDates(results, 'toTZ');
  }

  async findManyDistinctWithPagination(
    filters?: WhereInput,
    pagination?: { page?: number; limit?: number },
    orderBy: Prisma.SortOrder = 'desc',
    include?: any,
    select?: any,
    distinct?: any,
  ): Promise<T[]> {
    const { page = 1, limit = 20 } = pagination ?? {};
    const results = await this.getModelDelegate().findMany({
      where: { ...filters, deletedAt: null },
      select,
      include,
      skip: (page - 1) * limit,
      take: limit,
      distinct,
      orderBy: { createdAt: orderBy },
    });
    return normalizeDates(results, 'toTZ');
  }

  async transaction<R>(
    operations: (prisma: PrismaClient | any) => Promise<R>,
  ): Promise<R> {
    return this.prisma.$transaction(async (prisma) => operations(prisma));
  }

  async upsert(upsertData: UpsertArgs | any): Promise<T> {
    const payloadCreate = normalizeDates({ ...upsertData.create }, 'toUTC');
    const payloadUpdate = normalizeDates({ ...upsertData.update }, 'toUTC');
    const result = await this.getModelDelegate().upsert({
      where: { ...upsertData.where, deletedAt: null },
      create: payloadCreate,
      update: payloadUpdate,
    });
    return normalizeDates(result, 'toTZ');
  }

  async findMany(
    filters?: WhereInput,
    orderBy: Prisma.SortOrder = 'desc',
    include?: any,
    select?: any,
  ): Promise<T[]> {
    const results = await this.getModelDelegate().findMany({
      where: { ...filters, deletedAt: null },
      select,
      include,
      orderBy: { createdAt: orderBy },
    });
    return normalizeDates(results, 'toTZ');
  }

  async updateMany(
    uniqueFilter: WhereUniqueInput | any,
    data: UpdateInput,
  ): Promise<T> {
    const payload = normalizeDates({ ...data }, 'toUTC');
    const result = await this.getModelDelegate().updateMany({
      where: { ...uniqueFilter, deletedAt: null },
      data: payload,
    });
    return normalizeDates(result, 'toTZ');
  }
}
