import { Module, Global } from '@nestjs/common';
import { EmailService } from './email.service';
import { nodemailerProvider } from './providers/nodemailer.provider';

@Global()
@Module({
  providers: [nodemailerProvider, EmailService],
  exports: [EmailService],
})
export class NotificationModule {}
