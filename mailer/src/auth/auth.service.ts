import { Injectable } from '@nestjs/common';
import { generateOtpVerificationEmail } from 'src/helpers/generateOtpVerificationEmail';
import { generatePasswordResetOtpEmail } from 'src/helpers/generatePasswordResetOtpEmail';
import { generateWelcomeEmail } from 'src/helpers/generateWelcomeEmail';
import { generateWorkerCredentialsEmail } from 'src/helpers/generateWorkerCredentialsEmail';
import { generateWorkerGoodbyeEmail } from 'src/helpers/generateWorkerGoodbyeEmail';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(private mailService: MailService) {}

  /**
   * Send OTP verification email for new user registration
   */
  async handleOtpVerificationEmail(data: { email: string; otp: string }) {
    console.log(`[MAILER SERVICE] Sending OTP verification email to ${data.email}`);
    await this.mailService.sendMail(
      data.email,
      'Verify Your Email - Hygieia',
      generateOtpVerificationEmail(data.email, data.otp)
    );
  }

  /**
   * Send password reset OTP email
   */
  async handlePasswordResetOtpEmail(data: { email: string; otp: string }) {
    console.log(`[MAILER SERVICE] Sending password reset OTP email to ${data.email}`);
    await this.mailService.sendMail(
      data.email,
      'Password Reset Request - Hygieia',
      generatePasswordResetOtpEmail(data.email, data.otp)
    );
  }

  /**
   * Send welcome email after successful email verification
   */
  async handleWelcomeEmail(data: { email: string; name?: string }) {
    console.log(`[MAILER SERVICE] Sending welcome email to ${data.email}`);
    await this.mailService.sendMail(
      data.email,
      'Welcome to Hygieia - Your Healthcare Journey Begins!',
      generateWelcomeEmail(data.email, data.name)
    );
  }

  /**
   * Send worker credentials email to personal email
   */
  async handleWorkerCredentialsEmail(data: { 
    personalEmail: string; 
    workEmail: string; 
    password: string; 
    name: string; 
    role: string 
  }) {
    console.log(`[MAILER SERVICE] Sending worker credentials email to ${data.personalEmail}`);
    await this.mailService.sendMail(
      data.personalEmail,
      `Welcome to Hygieia Team - Your ${data.role} Account Details`,
      generateWorkerCredentialsEmail(
        data.personalEmail, 
        data.workEmail, 
        data.password, 
        data.name, 
        data.role
      )
    );
  }

  /**
   * Send worker goodbye/thank-you email to personal email
   */
  async handleWorkerGoodbyeEmail(data: {
    personalEmail: string;
    workEmail: string;
    name: string;
    role: string;
  }) {
    console.log(`[MAILER SERVICE] Sending worker goodbye email to ${data.personalEmail}`);
    await this.mailService.sendMail(
      data.personalEmail,
      `Thank You for Your Service at Hygieia`,
      generateWorkerGoodbyeEmail(
        data.personalEmail,
        data.name,
        data.role,
        data.workEmail
      )
    );
  }
}
