import { Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AdminService {
	constructor(private readonly userService: UserService) {}

	/**
	 * List users with optional accountType filter (INDIVIDUAL, CORPORATE, PARTNER)
	 */
	async listUsers(accountType?: string, page?: number, limit?: number) {
		return this.userService.findAll(
			accountType ? { accountType } : undefined,
			{ page, limit }
		);
	}
}
