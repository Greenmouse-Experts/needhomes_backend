import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { VerificationRepository } from './verification.repository';
import { EmailService } from 'src/notification/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { userVerificationDto, partnerVerificationDto, companyVerificationDto } from './dto/verification.dto';
import { VerificationType, AccountVerificationStatus, AccountType } from '@prisma/client';
import { PartnerService } from 'src/partner/partner.service';

@Injectable()
export class VerificationService {
	constructor(
		private readonly verificationRepository: VerificationRepository,
		private readonly prisma: PrismaService,
		private readonly emailService: EmailService,
		private readonly partnerService: PartnerService,
	) {}

	/**
	 * Admin: list all verification documents with user info
	 */
	async listAllVerifications() {
		return this.verificationRepository.getAllVerifications();
	}

	/**
	 * Admin: approve a user's verification
	 */
	async approveVerification(userId: string) {
		const verification = await this.verificationRepository.findByUserId(userId);
		if (!verification) throw new NotFoundException('Verification document not found');

		// Get user contact info and account type
		const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true, accountType: true } });

		// Mark user as VERIFIED and clear any rejection reason
		await this.prisma.user.update({ where: { id: userId }, data: { account_verification_status: 'VERIFIED' } });
		await this.prisma.verificationDocument.update({ where: { user_id: userId }, data: { RejectionReason: null } });

		// Send email notification (best-effort)
		if (user?.email) {
			try {
				await this.emailService.sendVerificationApprovedEmail(user.email, user.firstName || '');
			} catch (err) {
				// swallow email errors but log via EmailService
			}
		}

		// If the user is a partner, attempt to generate a referral code (fire-and-forget)
		if (user?.accountType === AccountType.PARTNER) {
			// Do not await; run asynchronously and swallow errors to avoid blocking approval
			this.partnerService.generateReferralCodeForPartner(userId).catch(() => {});
		}

		return { message: 'Verification approved' };
	}

	/**
	 * Admin: reject a user's verification with a reason
	 */
	async rejectVerification(userId: string, reason: string, templateHtml?: string) {
		const verification = await this.verificationRepository.findByUserId(userId);
		if (!verification) throw new NotFoundException('Verification document not found');

		await this.prisma.verificationDocument.update({ where: { user_id: userId }, data: { RejectionReason: reason } });
		// Keep user in PENDING state
		await this.prisma.user.update({ where: { id: userId }, data: { account_verification_status: 'PENDING' } });

		// Send rejection email (best-effort)
		const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true } });
		if (user?.email) {
			try {
				await this.emailService.sendVerificationRejectedEmail(user.email, user.firstName || '', reason, templateHtml);
			} catch (err) {
				// ignore email send errors
			}
		}

		return { message: 'Verification rejected', reason };
	}

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
