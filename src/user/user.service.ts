import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Find all users (excluding soft-deleted)
   */
  async findAll() {
    return this.userRepository.findMany(
      {},
      'desc',
      {
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
      },
    );
  }

  /**
   * Find one user by ID
   */
  async findOne(id: number) {
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
  async update(id: number, data: any) {
    const user = await this.userRepository.findOne({ id });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.userRepository.update({ id }, data);
  }

  /**
   * Soft delete a user
   */
  async softDelete(id: number) {
    const user = await this.userRepository.findOne({ id });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.userRepository.update({ id }, { deletedAt: new Date() });
  }
}
