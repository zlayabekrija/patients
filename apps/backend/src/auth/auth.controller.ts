import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SetupPasswordDto } from './dto/setup-password.dto';
import { ValidateSetupTokenDto } from './dto/validate-setup-token.dto';
import { PasswordSetupService } from './password-setup.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordSetupService: PasswordSetupService,
  ) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Get('setup-password/validate')
  validateSetupToken(@Query() dto: ValidateSetupTokenDto) {
    return this.passwordSetupService.validateToken(dto.token);
  }

  @Public()
  @Post('setup-password')
  setupPassword(@Body() dto: SetupPasswordDto) {
    return this.passwordSetupService.completeSetup(dto.token, dto.password);
  }
}
