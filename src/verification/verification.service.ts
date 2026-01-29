import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { VerificationRepository } from './verification.repository';
import { EmailService } from 'src/notification/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { userVerificationDto, partnerVerificationDto, companyVerificationDto } from './dto/verification.dto';
import { VerificationType, AccountVerificationStatus, AccountType, AccountVerificationDocumentStatus } from '@prisma/client';
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
	async approveVerification(verificationId: string) {
		const verification = await this.verificationRepository.findById(verificationId);
		if (!verification) throw new NotFoundException('Verification document not found');

		const userId = verification.user_id;

		// Get user contact info and account type
		const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true, firstName: true, accountType: true } });

		// Mark user as VERIFIED and clear any rejection reason on the verification record
		 await this.prisma.user.update({ where: { id: userId }, data: { account_verification_status: AccountVerificationStatus.VERIFIED } });
		 await this.prisma.verificationDocument.update({ where: { id: verificationId }, data: { RejectionReason: null, status: AccountVerificationDocumentStatus.VERIFIED } });

		// Send email notification (best-effort)
		if (user?.email) {
			try {
				 this.emailService.sendVerificationApprovedEmail(user.email, user.firstName || '');
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
	async rejectVerification(verificationId: string, reason: string, templateHtml?: string) {
		const verification = await this.verificationRepository.findById(verificationId);
		if (!verification) throw new NotFoundException('Verification document not found');

		const userId = verification.user_id;

		await this.prisma.verificationDocument.update({ where: { id: verificationId }, data: { RejectionReason: reason, status: AccountVerificationDocumentStatus.REJECTED } });
		// Keep user in PENDING state
		await this.prisma.user.update({ where: { id: userId }, data: { account_verification_status: AccountVerificationStatus.PENDING } });

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
			status: AccountVerificationDocumentStatus.PENDING,
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

		// also include user's account verification status (KYC status)
		const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { account_verification_status: true } });

		return {
			verification: result.verification,
			bank: result.bank,
			kycStatus: user?.account_verification_status || null,
		};
	}
}
