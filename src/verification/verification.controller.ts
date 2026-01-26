import {
	Controller,
	Post,
	UseGuards,
	Body,
	Query,
	BadRequestException,
	Get,
} from '@nestjs/common';
import { VerificationService } from './verification.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { userVerificationDto, partnerVerificationDto, companyVerificationDto } from './dto/verification.dto';
import { PermissionsGuard } from 'src/auth/guards/permissions.guard';
import { PermissionKey } from 'app/common';
import { RequirePermissions } from 'src/auth/decorators/permissions.decorator';
import { AccountType } from '@prisma/client';

@Controller('kyc')
export class VerificationController {
	constructor(private readonly verificationService: VerificationService) {}

	/**
	 * Submit verification documents (KYC). Query param `accountType` determines expected payload shape:
	 * - partner -> partnerVerificationDto
	 * - company  -> companyVerificationDto
	 * - individual (or unspecified) -> userVerificationDto
	* Expects JSON with Cloudinary URL strings for files (frontPage, backpage, utilityBill, cacDocument etc).
	 */
	@UseGuards(JwtAuthGuard, PermissionsGuard)
   @RequirePermissions(PermissionKey.VERIFICATION_CREATE_OWN)
	@Post('submit')
	async submitVerification(
		@CurrentUser('id') userId: string,
		@Query('accountType') accountType: string,
		@Body() body: any,
	) {
		// Determine DTO based on accountType
		const at = (accountType || 'INDIVIDUAL').toUpperCase();

		let dto: any;

		switch (at) {
			case 'PARTNER':
				dto = ({
					idType: body.idType,
					frontPage: body.frontPage || body.frontpage || undefined,
					backPage: body.backPage || body.backpage || undefined,
					utilityBill: body.utilityBill,
					address: body.address,
				} as partnerVerificationDto);
				break;

			case 'CORPORATE':
				dto = ({
					companyName: body.companyName,
					rcNumber: body.rcNumber,
					cacDocument: body.cacDocument,
					authorizedId: body.authorizedId,
				} as companyVerificationDto);
				break;
			default:
				dto = ({
					idType: body.idType,
					frontPage: body.frontPage || body.frontpage || undefined,
					backPage: body.backPage || body.backpage || undefined,
					utilityBill: body.utilityBill,
					address: body.address,
				} as userVerificationDto);
		}

		

		// Basic validation: ensure required fields exist (controller-level minimal checks)
		if (!dto) throw new BadRequestException('Invalid verification payload');

		return this.verificationService.submitVerification(userId, dto);
	}

	@UseGuards(JwtAuthGuard, PermissionsGuard)
   @RequirePermissions(PermissionKey.VERIFICATION_READ_OWN)
	@Get('')
	async getVerificationWithBank(
		@CurrentUser('id') userId: string,
	) {
		return this.verificationService.getUserVerification(userId);
	}
}
