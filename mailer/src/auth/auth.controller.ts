import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MessagePattern } from '@nestjs/microservices/decorators/message-pattern.decorator';
import { Payload } from '@nestjs/microservices/decorators/payload.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Handle OTP verification email event
   */
  @MessagePattern('send-otp-verification-email')
  async handleOtpVerificationEmail(@Payload() data: { email: string; otp: string }) {
    await this.authService.handleOtpVerificationEmail(data);
  }

  /**
   * Handle password reset OTP email event
   */
  @MessagePattern('send-password-reset-otp-email')
  async handlePasswordResetOtpEmail(@Payload() data: { email: string; otp: string }) {
    await this.authService.handlePasswordResetOtpEmail(data);
  }

  /**
   * Handle welcome email event
   */
  @MessagePattern('send-welcome-email')
  async handleWelcomeEmail(@Payload() data: { email: string; name?: string }) {
    await this.authService.handleWelcomeEmail(data);
  }

  /**
   * Handle worker credentials email event
   */
  @MessagePattern('send-worker-credentials-email')
  async handleWorkerCredentialsEmail(@Payload() data: { 
    personalEmail: string; 
    workEmail: string; 
    password: string; 
    name: string; 
    role: string 
  }) {
    await this.authService.handleWorkerCredentialsEmail(data);
  }
}
