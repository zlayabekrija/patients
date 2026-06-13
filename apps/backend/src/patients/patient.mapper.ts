import { Patient, User } from '@prisma/client';
import { formatDateOnly } from '../common/utils/date-only';

export type PatientWithUser = Patient & {
  user: Pick<User, 'email'>;
};

export type PatientResponse = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  dob: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toPatientResponse(patient: PatientWithUser): PatientResponse {
  return {
    id: patient.id,
    firstName: patient.firstName,
    lastName: patient.lastName,
    email: patient.user.email,
    phoneNumber: patient.phoneNumber,
    dob: patient.dateOfBirth ? formatDateOnly(patient.dateOfBirth) : null,
    createdAt: patient.createdAt.toISOString(),
    updatedAt: patient.updatedAt.toISOString(),
  };
}
