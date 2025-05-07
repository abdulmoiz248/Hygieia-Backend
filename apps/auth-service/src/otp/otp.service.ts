import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { ClientProxy } from '@nestjs/microservices';

import { microserviceClients } from '../../../client';

@Injectable()
export class OtpService {
    
  constructor(private prisma: PrismaService,
    @Inject(microserviceClients.emailService.name) private readonly emailClient: ClientProxy 
  ) {}

  async verifyOtp(email: string, code: string): Promise<boolean> {
    try {
      const otp = await this.prisma.user.findFirst({
        where: {
          email,
          otpExpiry: {
            gt: new Date() 
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (!otp) {
        console.log(`[INFO] OTP verification failed for email: ${email} - OTP not found or expired`);
        return false; 
      }

      const isValid = otp.otp === code;
      
      if (isValid) {
        console.log(`[INFO] OTP verified successfully for email: ${email}`);
      }

      return isValid;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return false;
    }
  }

  async resendOtp(email: string): Promise<{success: boolean, message: string}> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        console.log(`[INFO] OTP resend failed - User not found for email: ${email}`);
        return {
          success: false,
          message: 'User not found'
        };
      }

      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); 

      await this.prisma.user.update({
        where: { email },
        data: {
          otp: newOtp,
          otpExpiry
        }
      });

      this.emailClient.emit('send_otp', { email, newOtp });
      
      console.log(`[INFO] New OTP generated and sent for email: ${email}`);

      return {
        success: true,
        message: 'OTP resent successfully'
      };

    } catch (error) {
      console.error('Error resending OTP:', error);
      return {
        success: false,
        message: 'Failed to resend OTP'
      };
    }
  }
}
