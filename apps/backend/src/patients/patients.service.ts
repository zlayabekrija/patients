import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { AuthUser } from '../auth/auth.types';
import { parseDateOnly } from '../common/utils/date-only';
import { normalizePhoneNumber } from '../common/validators/patient-fields.validator';
import { PasswordSetupService } from '../auth/password-setup.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { QueryPatientsDto } from './dto/query-patients.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { toPatientResponse } from './patient.mapper';

const patientInclude = {
  user: {
    select: { email: true },
  },
} satisfies Prisma.PatientInclude;

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordSetupService: PasswordSetupService,
  ) {}

  private scopeForUser(user: AuthUser): Prisma.PatientWhereInput {
    return user.role === Role.USER ? { userId: user.id } : {};
  }

  private assertCanAccessPatient(patientUserId: string, user: AuthUser) {
    if (user.role === Role.USER && patientUserId !== user.id) {
      throw new ForbiddenException('You can only access your own patient profile');
    }
  }

  async findAll(query: QueryPatientsDto, user: AuthUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy ?? 'lastName';
    const sortOrder = query.sortOrder ?? 'asc';

    const roleScope = this.scopeForUser(user);
    const searchFilter: Prisma.PatientWhereInput = query.search
      ? {
          OR: [
            { firstName: { contains: query.search, mode: 'insensitive' } },
            { lastName: { contains: query.search, mode: 'insensitive' } },
            {
              user: {
                email: { contains: query.search, mode: 'insensitive' },
              },
            },
            { phoneNumber: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const where: Prisma.PatientWhereInput = {
      AND: [roleScope, searchFilter],
    };

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: patientInclude,
      }),
      this.prisma.patient.count({ where }),
    ]);

    return {
      data: patients.map(toPatientResponse),
      page,
      limit,
      total,
    };
  }

  async findOne(id: string, user: AuthUser) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: patientInclude,
    });

    if (!patient) {
      throw new NotFoundException(`Patient ${id} not found`);
    }

    this.assertCanAccessPatient(patient.userId, user);

    return toPatientResponse(patient);
  }

  async create(dto: CreatePatientDto) {
    try {
      const patient = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: dto.email,
            password: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
            role: Role.USER,
          },
        });

        return tx.patient.create({
          data: {
            userId: user.id,
            firstName: dto.firstName,
            lastName: dto.lastName,
          phoneNumber: dto.phoneNumber
            ? normalizePhoneNumber(dto.phoneNumber)
            : null,
          dateOfBirth: dto.dob ? parseDateOnly(dto.dob) : null,
          },
          include: patientInclude,
        });
      });

      await this.passwordSetupService.sendSetupEmail(
        patient.userId,
        dto.email,
        dto.firstName,
      );

      return toPatientResponse(patient);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A patient with this email already exists');
      }

      throw error;
    }
  }

  async update(id: string, dto: UpdatePatientDto) {
    const existing = await this.prisma.patient.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) {
      throw new NotFoundException(`Patient ${id} not found`);
    }

    try {
      const patient = await this.prisma.$transaction(async (tx) => {
        if (dto.email) {
          await tx.user.update({
            where: { id: existing.userId },
            data: { email: dto.email },
          });
        }

        return tx.patient.update({
          where: { id },
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            phoneNumber: dto.phoneNumber
              ? normalizePhoneNumber(dto.phoneNumber)
              : undefined,
            dateOfBirth:
              dto.dob === undefined
                ? undefined
                : dto.dob
                  ? parseDateOnly(dto.dob)
                  : null,
          },
          include: patientInclude,
        });
      });

      return toPatientResponse(patient);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A patient with this email already exists');
      }

      throw error;
    }
  }

  async remove(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!patient) {
      throw new NotFoundException(`Patient ${id} not found`);
    }

    await this.prisma.user.delete({ where: { id: patient.userId } });
    return { ok: true };
  }
}
