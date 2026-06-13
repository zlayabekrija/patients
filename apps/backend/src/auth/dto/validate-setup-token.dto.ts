import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateSetupTokenDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
