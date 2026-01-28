import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { UpdateProfileDto } from 'src/auth/dto/auth.dto';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Find all users (excluding soft-deleted)
   */
  async findAll(
    filters?: { accountType?: string },
    pagination?: { page?: number; limit?: number },
  ) {
    const where: any = {};
    if (filters?.accountType) {
      where.accountType = filters.accountType.toUpperCase();
    }

    return this.userRepository.findManyWithPagination(
      where,
      pagination,
      'desc',
      undefined,
      {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        accountType: true,
        account_status: true,
        account_verification_status: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          include: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    );
  }

  /**
   * Find one user by ID
   */
  async findOne(id: string) {
    const user = await this.userRepository.findOne(
      { id },
      {
        roles: {
          include: {
            role: {
              select: {
                name: true,
                permissions: {
                  include: {
                    permission: {
                      select: {
                        key: true,
                        description: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        verification_document: true,
        bank_account: true,
      },
    );

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Return only specific fields, excluding sensitive data like password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Create a new user
   */
  async create(data: any) {
    // Add your validation and password hashing here
    return this.userRepository.create(data);
  }

  /**
   * Update a user
   */
  async update(id: string, data: any) {
    const user = await this.userRepository.findOne({ id });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.userRepository.update({ id }, data);
  }

  /**
   * Soft delete a user
   */
  async softDelete(id: string) {
    const user = await this.userRepository.findOne({ id });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.userRepository.update({ id }, { deletedAt: new Date() });
  }

  /**
   * Update profile for an authenticated user (only profile fields)
   */
  async updateUserProfile(userId: string, data: UpdateProfileDto) {
    const user = await this.userRepository.findOne({ id: userId });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    // `UpdateProfileDto` restricts allowed fields; trust DTO validation
    return this.userRepository.update({ id: userId }, data as any);
  }
}
