export type UserRole = 'admin' | 'user';

export type AuthUser = {
  email: string;
  role: UserRole;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type SetupPasswordValidation = {
  email: string;
  firstName: string;
};

export type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  dob: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PatientsResponse = {
  data: Patient[];
  page: number;
  limit: number;
  total: number;
};

export type PatientInput = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dob?: string;
};

export type PatientsQuery = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'lastName' | 'dateOfBirth' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
};
