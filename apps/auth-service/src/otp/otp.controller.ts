import { Controller } from '@nestjs/common';
import { OtpService } from './otp.service';
import { MessagePattern } from '@nestjs/microservices';



@Controller('otp')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}
  @MessagePattern('verify_otp')
  async verifyOtp(data: { email: string; code: string }) {
    try {
      const isValid = await this.otpService.verifyOtp(data.email, data.code);

      if (isValid) {
        return {
          statusCode: 200,
          message: 'OTP verified successfully',
          success: true
        };
      }

      return {
        statusCode: 400,
        message: 'Invalid or expired OTP',
        success: false
      };

    } catch (error) {
      console.error('Error in OTP verification:', error);
      return {
        statusCode: 500,
        message: 'Internal server error',
        success: false
      };
    }
  }
  @MessagePattern('resend_otp')
  async resendOtp(data: { email: string }) {
    try {
      const result = await this.otpService.resendOtp(data.email);

      if (result.success) {
        return {
          statusCode: 200,
          message: result.message,
          success: true
        };
      }

      return {
        statusCode: 400,
        message: result.message,
        success: false
      };

    } catch (error) {
      console.error('Error in OTP resend:', error);
      return {
        statusCode: 500,
        message: 'Internal server error',
        success: false
      };
    }
  }
}
