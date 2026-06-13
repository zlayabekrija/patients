import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { JwtPayload } from './auth.types';

@Injectable()
export class PasswordSetupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  private hashTokenSecret(secret: string) {
    return createHash('sha256').update(secret).digest('hex');
  }

  private parseToken(token: string) {
    const separatorIndex = token.indexOf('.');
    if (separatorIndex <= 0 || separatorIndex === token.length - 1) {
      throw new BadRequestException('Invalid setup link');
    }

    return {
      id: token.slice(0, separatorIndex),
      secret: token.slice(separatorIndex + 1),
    };
  }

  private async findValidTokenRecord(token: string) {
    const { id, secret } = this.parseToken(token);

    const record = await this.prisma.passwordSetupToken.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            patient: {
              select: { firstName: true },
            },
          },
        },
      },
    });

    if (!record) {
      throw new NotFoundException('This setup link is invalid or has expired');
    }

    const secretHash = this.hashTokenSecret(secret);
    if (secretHash !== record.tokenHash) {
      throw new NotFoundException('This setup link is invalid or has expired');
    }

    return record;
  }

  async createTokenForUser(userId: string) {
    const secret = randomBytes(32).toString('hex');
    const tokenHash = this.hashTokenSecret(secret);

    const record = await this.prisma.passwordSetupToken.upsert({
      where: { userId },
      create: { userId, tokenHash },
      update: { tokenHash },
    });

    return `${record.id}.${secret}`;
  }

  buildSetupUrl(token: string) {
    const frontendUrl = this.configService.get(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
    const url = new URL('/setup-password', frontendUrl);
    url.searchParams.set('token', token);
    return url.toString();
  }

  async sendSetupEmail(userId: string, email: string, firstName: string) {
    const token = await this.createTokenForUser(userId);
    const setupUrl = this.buildSetupUrl(token);

    await this.mailService.sendPasswordSetupEmail({
      to: email,
      firstName,
      setupUrl,
    });
  }

  async validateToken(token: string) {
    const record = await this.findValidTokenRecord(token);

    return {
      email: record.user.email,
      firstName: record.user.patient?.firstName ?? 'there',
    };
  }

  async completeSetup(token: string, password: string) {
    const record = await this.findValidTokenRecord(token);
    const hashedPassword = await bcrypt.hash(password, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.user.id },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordSetupToken.delete({
        where: { id: record.id },
      }),
    ]);

    const payload: JwtPayload = {
      sub: record.user.id,
      email: record.user.email,
      role: record.user.role,
    };

    const jwt = await this.jwtService.signAsync(payload);

    return {
      token: jwt,
      user: {
        email: record.user.email,
        role: this.authService.toApiRole(record.user.role),
      },
    };
  }
}
