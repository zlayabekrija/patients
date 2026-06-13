import { isValidPhoneNumber } from 'libphonenumber-js';
import { z } from 'zod';
import { isFutureDateOnly, parseDateOnly } from '@/lib/date-only';

const optionalPhoneNumber = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .refine((value) => !value || isValidPhoneNumber(value), {
    message: 'Enter a valid international phone number (e.g. +14155550101)',
  });

const optionalDob = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine(
    (value) => {
      if (!value) {
        return true;
      }

      return Boolean(parseDateOnly(value));
    },
    { message: 'Enter a valid date of birth' },
  )
  .refine((value) => !value || !isFutureDateOnly(value), {
    message: 'Date of birth cannot be in the future',
  });

export const patientSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: z.string().trim().email('Enter a valid email'),
  phoneNumber: optionalPhoneNumber,
  dob: optionalDob,
});

export type PatientFormValues = z.infer<typeof patientSchema>;
