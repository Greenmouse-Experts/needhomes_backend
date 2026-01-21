import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaBaseRepository } from '../prisma/prisma.base.repository';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserRepository extends PrismaBaseRepository<
  User,
  Prisma.UserCreateInput,
  Prisma.UserUpdateInput,
  Prisma.UserWhereUniqueInput,
  Prisma.UserWhereInput,
  Prisma.UserUpsertArgs
> {
  constructor(prisma: PrismaService) {
    super('user', prisma);
  }

  // Add custom user repository methods here if needed
}
