import { isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js';
import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isFutureDateOnly, parseDateOnly } from '../utils/date-only';

export function normalizePhoneNumber(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (!isValidPhoneNumber(trimmed)) {
    return null;
  }

  return parsePhoneNumberFromString(trimmed)?.format('E.164') ?? null;
}

@ValidatorConstraint({ name: 'isPhoneNumber', async: false })
export class IsPhoneNumberConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return true;
    }

    if (typeof value !== 'string') {
      return false;
    }

    return isValidPhoneNumber(value.trim());
  }

  defaultMessage() {
    return 'phoneNumber must be a valid international phone number (e.g. +14155550101)';
  }
}

export function IsPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPhoneNumberConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isPastOrPresentDateOnly', async: false })
export class IsPastOrPresentDateOnlyConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return true;
    }

    if (typeof value !== 'string') {
      return false;
    }

    if (!parseDateOnly(value)) {
      return false;
    }

    return !isFutureDateOnly(value);
  }

  defaultMessage() {
    return 'dob must be a valid date (YYYY-MM-DD) and cannot be in the future';
  }
}

export function IsPastOrPresentDateOnly(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPastOrPresentDateOnlyConstraint,
    });
  };
}
