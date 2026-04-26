import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { compareValues, hashValue } from '../../../common/utils/password.util';
import { RedisService } from '../../../redis/redis.service';
import { MailService } from '../../../services/mail.service';
import { ReferralService } from '../../referral/services/referral.service';
import { UserRepository } from '../../user/repositories/user.repository';
import { UserRole } from '../../user/schemas/role.schema';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { LoginDto } from '../dto/login.dto';
import { LogoutDto } from '../dto/logout.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegisterUserDto } from '../dto/register-user.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    private readonly referralService: ReferralService,
  ) {}

  async register(dto: RegisterUserDto) {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    let referredBy: import('mongoose').Types.ObjectId | null = null;
    if (dto.referralCode) {
      const referrer = await this.userRepository.findByReferralCode(dto.referralCode);
      if (!referrer) {
        throw new NotFoundException('Referral code is invalid');
      }
      referredBy = referrer._id;
    }

    const user = await this.userRepository.create({
      name: dto.name ?? '',
      email: dto.email,
      passwordHash: await hashValue(dto.password),
      role: UserRole.USER,
      referralCode: this.generateReferralCode(dto.email),
      referredBy,
      balance: { pending: 0, approved: 0, totalEarned: 0 },
    });

    if (referredBy) {
      await this.referralService.handleSignupReferral(String(referredBy), user.id);
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: randomUUID(),
    });

    await this.userRepository.updateRefreshToken(
      user.id,
      await hashValue(tokens.refreshToken),
    );

    return {
      ...tokens,
      user: await this.userRepository.findOrFail(user.id),
    };
  }

  async login(dto: LoginDto, expectedRole?: UserRole) {
    const user = await this.userRepository.findByEmail(dto.email, true);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await compareValues(dto.password, user.passwordHash);
    const userRole = user.role;

    if (!isPasswordValid || (expectedRole && userRole !== expectedRole)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive || user.isBanned) {
      throw new ForbiddenException('Account is not allowed to sign in');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: userRole,
      jti: randomUUID(),
    });

    await this.userRepository.updateRefreshToken(
      user.id,
      await hashValue(tokens.refreshToken),
    );
    await this.userRepository.updateProfile(user.id, {
      lastLoginAt: new Date(),
    } as never);

    return {
      ...tokens,
      user: await this.userRepository.findOrFail(user.id),
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    const payload = await this.jwtService.verifyAsync<JwtPayload>(dto.refreshToken, {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
    });

    const isBlacklisted = await this.redisService.isBlacklisted(payload.jti);
    if (isBlacklisted) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    const user = await this.userRepository.findById(payload.sub);
    const userWithSecrets = await this.userRepository.findByEmail(user?.email ?? '', true);
    if (!userWithSecrets?.hashedRefreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const isTokenValid = await compareValues(
      dto.refreshToken,
      userWithSecrets.hashedRefreshToken,
    );

    if (!isTokenValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.redisService.addToBlacklist(
      payload.jti,
      this.parseExpiryToSeconds(
        this.configService.getOrThrow<string>('jwt.refreshExpiresIn'),
      ),
    );

    const tokens = await this.generateTokens({
      sub: userWithSecrets.id,
      email: userWithSecrets.email,
      role: userWithSecrets.role,
      jti: randomUUID(),
    });

    await this.userRepository.updateRefreshToken(
      userWithSecrets.id,
      await hashValue(tokens.refreshToken),
    );

    return tokens;
  }

  async logout(userId: string, dto: LogoutDto) {
    const decoded = this.jwtService.decode(dto.refreshToken) as JwtPayload | null;
    if (decoded?.jti) {
      await this.redisService.addToBlacklist(
        decoded.jti,
        this.parseExpiryToSeconds(
          this.configService.getOrThrow<string>('jwt.refreshExpiresIn'),
        ),
      );
    }

    await this.userRepository.updateRefreshToken(userId, null);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      return { sent: true };
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await this.redisService.set(`otp:${dto.email}`, { otp }, 600);
    await this.mailService.sendPasswordResetOtp(dto.email, otp);

    return { sent: true };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const stored = await this.redisService.get<{ otp: string }>(`otp:${dto.email}`);
    if (!stored || stored.otp !== dto.otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    const user = await this.userRepository.findByEmail(dto.email, true);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.updateProfile(user.id, {
      passwordHash: await hashValue(dto.newPassword),
      hashedRefreshToken: null,
    } as never);
    await this.redisService.del(`otp:${dto.email}`);

    return { reset: true };
  }

  private async generateTokens(payload: JwtPayload) {
    const accessExpiresIn = this.configService.getOrThrow<string>('jwt.accessExpiresIn');
    const refreshExpiresIn = this.configService.getOrThrow<string>('jwt.refreshExpiresIn');

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.accessSecret'),
      expiresIn: accessExpiresIn as never,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: refreshExpiresIn as never,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private generateReferralCode(email: string) {
    const prefix = email
      .split('@')[0]
      .replace(/[^a-z0-9]/gi, '')
      .toUpperCase()
      .slice(0, 4)
      .padEnd(4, 'X');

    return `${prefix}${randomUUID().slice(0, 6).toUpperCase()}`;
  }

  private parseExpiryToSeconds(input: string) {
    const match = /^(\d+)([smhd])$/.exec(input);
    if (!match) {
      return 7 * 24 * 60 * 60;
    }

    const value = Number(match[1]);
    const unit = match[2] as 's' | 'm' | 'h' | 'd';
    const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * multipliers[unit];
  }
}
