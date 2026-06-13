import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { maskEmail, maskSetupUrl } from '../common/utils/mask-pii';

type PasswordSetupEmailParams = {
  to: string;
  firstName: string;
  setupUrl: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getTransporter(): Transporter | null {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.configService.get<string>('SMTP_HOST');
    if (!host) {
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(this.configService.get('SMTP_PORT', '587')),
      secure: this.configService.get('SMTP_SECURE', 'false') === 'true',
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });

    return this.transporter;
  }

  async sendPasswordSetupEmail(params: PasswordSetupEmailParams) {
    const from =
      this.configService.get<string>('SMTP_FROM') ??
      'Patients <noreply@localhost>';
    const subject = 'Set up your Patients account password';
    const text = [
      `Hi ${params.firstName},`,
      '',
      'An account has been created for you in the Patients system.',
      'Use the link below to set your password:',
      '',
      params.setupUrl,
      '',
      'This link stays valid until you complete password setup.',
      '',
      'If you did not expect this email, you can ignore it.',
    ].join('\n');

    const html = `
      <p>Hi ${params.firstName},</p>
      <p>An account has been created for you in the Patients system.</p>
      <p><a href="${params.setupUrl}">Set up your password</a></p>
      <p>This link stays valid until you complete password setup.</p>
      <p>If you did not expect this email, you can ignore it.</p>
    `;

    const transporter = this.getTransporter();

    if (!transporter) {
      this.logger.warn(
        `SMTP not configured. Password setup email for ${maskEmail(params.to)}:\n${maskSetupUrl(params.setupUrl)}`,
      );
      return;
    }

    await transporter.sendMail({
      from,
      to: params.to,
      subject,
      text,
      html,
    });
  }
}
