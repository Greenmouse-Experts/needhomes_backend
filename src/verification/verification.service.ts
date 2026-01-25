import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { VerificationRepository } from './verification.repository';
import { PrismaService } from '../prisma/prisma.service';
import { userVerificationDto, partnerVerificationDto, companyVerificationDto } from './dto/verification.dto';
import { VerificationType, AccountVerificationStatus } from '@prisma/client';

@Injectable()
export class VerificationService {
	constructor(
		private readonly verificationRepository: VerificationRepository,
		private readonly prisma: PrismaService,
	) {}

	/**
	 * Submit or update a verification document for a user and optionally save bank account
	 */
	async submitVerification(
		userId: string,
		dto: userVerificationDto | partnerVerificationDto | companyVerificationDto,
	) {
		const user = await this.prisma.user.findUnique({ where: { id: userId } });
		if (!user) throw new NotFoundException('User not found');

		// determine verification type from user's accountType
		const verificationType = (user.accountType as unknown) as VerificationType;

		const payload: any = {
			...dto,
			verificationType,
		};

		const verification = await this.verificationRepository.createOrUpdateVerification(userId, payload);

	

		

		return {
			verification,
            message: 'Verification document submitted successfully',
		};
	}

	/**
	 * Get verification document and attached bank account for a user
	 */
	
	async getUserVerification(userId: string) {
		const result = await this.verificationRepository.getUserVerification(userId);

		if (!result || !result.verification) {
			throw new NotFoundException('Verification document not found');
		}

		return result;
	}
}
