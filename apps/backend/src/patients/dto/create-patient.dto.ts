import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  IsPastOrPresentDateOnly,
  IsPhoneNumber,
} from '../../common/validators/patient-fields.validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @IsPhoneNumber()
  @MaxLength(30)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'dob must use YYYY-MM-DD format',
  })
  @IsPastOrPresentDateOnly()
  dob?: string;
}
