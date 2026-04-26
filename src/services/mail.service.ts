import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendPasswordResetOtp(email: string, otp: string) {
    this.logger.log(`Simulated OTP for ${email}: ${otp}`);
  }
}
