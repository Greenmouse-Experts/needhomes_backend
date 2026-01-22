import { Provider } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export const NODEMAILER_TRANSPORTER = 'NODEMAILER_TRANSPORTER';

export const nodemailerProvider: Provider = {
  provide: NODEMAILER_TRANSPORTER,
  useFactory: (): Transporter => {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT || '465'),
      secure: process.env.MAIL_SECURE === 'true',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    // Verify connection on startup
    transporter.verify((error, success) => {
      if (error) {
        console.error('Email service connection failed:', error);
      } else {
        console.log('Email service connected successfully');
      }
    });

    return transporter;
  },
};
