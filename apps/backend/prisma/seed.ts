import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { maskEmail, maskPiiInText, formatLogMessage } from '../src/common/utils/mask-pii';
import { createWinstonLogger } from '../src/common/logging/winston.config';

const prisma = new PrismaClient();
const logger = createWinstonLogger();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@admin.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'P4$$w0rd';
const USER_EMAIL = process.env.USER_EMAIL ?? 'user@user.com';
const USER_PASSWORD = process.env.USER_PASSWORD ?? 'P4$$w0rd';

async function main() {
  const adminPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const userPassword = await bcrypt.hash(USER_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      password: adminPassword,
      role: Role.ADMIN,
    },
    create: {
      email: ADMIN_EMAIL,
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: USER_EMAIL },
    update: {
      password: userPassword,
      role: Role.USER,
    },
    create: {
      email: USER_EMAIL,
      password: userPassword,
      role: Role.USER,
    },
  });

  await prisma.patient.upsert({
    where: { userId: user.id },
    update: {
      firstName: 'Demo',
      lastName: 'Patient',
      phoneNumber: '+15550100',
      dateOfBirth: new Date(Date.UTC(1990, 5, 15, 12, 0, 0)),
    },
    create: {
      userId: user.id,
      firstName: 'Demo',
      lastName: 'Patient',
      phoneNumber: '+15550100',
      dateOfBirth: new Date(Date.UTC(1990, 5, 15, 12, 0, 0)),
    },
  });

  const patients = [
    {
      firstName: 'Jane',
      lastName: 'Cooper',
      email: 'jane.cooper@example.com',
      phoneNumber: '+1 555 0101',
      dateOfBirth: new Date('1988-04-12'),
    },
    {
      firstName: 'Robert',
      lastName: 'Fox',
      email: 'robert.fox@example.com',
      phoneNumber: '+1 555 0102',
      dateOfBirth: new Date('1975-09-30'),
    },
    {
      firstName: 'Esther',
      lastName: 'Howard',
      email: 'esther.howard@example.com',
      phoneNumber: '+1 555 0103',
      dateOfBirth: new Date('1992-01-18'),
    },
  ];

  for (const patient of patients) {
    const existingUser = await prisma.user.findUnique({
      where: { email: patient.email },
      include: { patient: true },
    });

    if (existingUser?.patient) {
      await prisma.patient.update({
        where: { id: existingUser.patient.id },
        data: {
          firstName: patient.firstName,
          lastName: patient.lastName,
          phoneNumber: patient.phoneNumber,
          dateOfBirth: patient.dateOfBirth,
        },
      });
      continue;
    }

    const patientUser =
      existingUser ??
      (await prisma.user.create({
        data: {
          email: patient.email,
          password: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
          role: Role.USER,
        },
      }));

    await prisma.patient.create({
      data: {
        userId: patientUser.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        phoneNumber: patient.phoneNumber,
        dateOfBirth: patient.dateOfBirth,
      },
    });
  }

  logger.info(
    formatLogMessage(`Admin user ready: ${maskEmail(admin.email)} (${admin.role})`),
    { context: 'Seed' },
  );
  logger.info(
    formatLogMessage(`Regular user ready: ${maskEmail(user.email)} (${user.role})`),
    { context: 'Seed' },
  );
  logger.info(formatLogMessage(`Seeded ${patients.length} patients`), {
    context: 'Seed',
  });
}

main()
  .catch((error) => {
    const message =
      error instanceof Error ? error.message : 'Unknown seed error';
    logger.error(maskPiiInText(message), { context: 'Seed' });
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
