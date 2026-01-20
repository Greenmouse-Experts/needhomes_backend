import { PrismaClient, Prisma } from '@prisma/client';

export class PrismaBaseService<Model, WhereInput, CreateInput, UpdateInput> {
  constructor(protected readonly prismaModel: any) {}

  findAll(args?: any): Promise<Model[]> {
    return this.prismaModel.findMany(args);
  }

  findOne(where: WhereInput): Promise<Model | null> {
    return this.prismaModel.findUnique({ where });
  }

  create(data: CreateInput): Promise<Model> {
    return this.prismaModel.create({ data });
  }

  update(where: WhereInput, data: UpdateInput): Promise<Model> {
    return this.prismaModel.update({ where, data });
  }

  delete(where: WhereInput): Promise<Model> {
    return this.prismaModel.delete({ where });
  }
}

