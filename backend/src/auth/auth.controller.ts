import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GoogleService } from './google.service';
import { RecoveryService } from './recovery.service';
import { SessionsService } from './sessions.service';
import {
  ClientDto,
  DeleteAccountDto,
  ForgotDto,
  GoogleDto,
  LinkGoogleDto,
  RefreshDto,
  ResetDto,
} from './dto/session.dto';
import type { SessionResult } from './auth.types';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessions: SessionsService,
    private readonly google: GoogleService,
    private readonly recovery: RecoveryService,
  ) {}

  private checkOrigin(client: ClientDto, req: Request) {
    if (client.client !== 'web') return;
    const allowed = (process.env.CORS_ORIGIN || 'http://localhost:8081')
      .split(',')
      .map((value) => value.trim());
    if (!req.headers.origin || !allowed.includes(req.headers.origin))
      throw new ForbiddenException('Untrusted browser origin');
  }
  private deliver(result: SessionResult, dto: ClientDto, response: Response) {
    if (dto.client !== 'web') return result;
    response.cookie('vero_refresh', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30) * 86400000,
    });
    return { user: result.user, accessToken: result.accessToken };
  }
  private refreshCredential(dto: RefreshDto, req: Request) {
    this.checkOrigin(dto, req);
    const raw =
      dto.client === 'web'
        ? req.headers.cookie
            ?.split(';')
            .map((part) => part.trim())
            .find((part) => part.startsWith('vero_refresh='))
            ?.slice('vero_refresh='.length)
        : dto.refreshToken;
    if (!raw || raw.length > 256 || raw.length < 32)
      throw new UnauthorizedException('Missing session credential');
    return raw;
  }

  @Public()
  @Get('config')
  configuration() {
    return {
      googleEnabled: this.google.audiences().length > 0,
      googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID || null,
      recoveryEnabled:
        !!process.env.SMTP_HOST &&
        !!process.env.PASSWORD_RESET_URL &&
        !!process.env.MAIL_FROM,
    };
  }

  @Public()
  @Post('google')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async googleLogin(
    @Body() dto: GoogleDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.checkOrigin(dto, req);
    return this.deliver(
      await this.authService.googleLogin(dto.idToken),
      dto,
      res,
    );
  }
  @Post('google/link')
  @ApiBearerAuth()
  linkGoogle(@Body() dto: LinkGoogleDto, @CurrentUser() user: { id: string }) {
    return this.authService.linkGoogle(
      user.id,
      dto.idToken,
      dto.currentPassword,
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const credential = this.refreshCredential(dto, req);
    return this.deliver(await this.sessions.refresh(credential), dto, res);
  }
  @Public()
  @Post('logout')
  @HttpCode(200)
  async logout(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.sessions.logout(this.refreshCredential(dto, req));
    res.clearCookie('vero_refresh', {
      path: '/api/auth',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return result;
  }
  @Public()
  @Post('forgot-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  forgot(@Body() dto: ForgotDto) {
    return this.recovery.request(dto.email);
  }
  @Public()
  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  reset(@Body() dto: ResetDto) {
    return this.recovery.reset(dto.token, dto.password);
  }
  @Delete('me')
  @ApiBearerAuth()
  async deleteMe(
    @Body() dto: DeleteAccountDto,
    @CurrentUser() user: { id: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.deleteAccount(user.id, dto);
    res.clearCookie('vero_refresh', { path: '/api/auth' });
    return result;
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new USER account' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.checkOrigin(dto, req);
    return this.deliver(await this.authService.register(dto), dto, res);
  }

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login and receive JWT' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.checkOrigin(dto, req);
    return this.deliver(await this.authService.login(dto), dto, res);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser() user: { id: string }) {
    return this.authService.getProfile(user.id);
  }

  @Get('me/security')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current account sign-in methods without credential fields',
  })
  security(@CurrentUser() user: { id: string }) {
    return this.authService.security(user.id);
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(user.id, dto);
  }

  @Patch('me/password')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current user password' })
  changePassword(
    @CurrentUser() user: { id: string },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.id, dto);
  }
}
