// email.service.ts
import { Injectable } from '@nestjs/common'
import * as nodemailer from 'nodemailer'

@Injectable()
export class AppService {
  private transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, 
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })
   generateOtpEmail = (otp: string) => {
    // Convert theme colors to hex for email compatibility
    const colors = {
      mintGreen: "#8bc8b9",
      softBlue: "#4a7caa",
      softCoral: "#e87a6f",
      snowWhite: "#f9f9f9",
      darkSlateGray: "#1e2a3a",
      coolGray: "#4d5c6a"
    };
  
    const otpHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Your Verification Code</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: ${colors.snowWhite}; color: ${colors.darkSlateGray};">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background: linear-gradient(to bottom, ${colors.mintGreen}20, ${colors.snowWhite}, ${colors.mintGreen}20);">
            <tr>
              <td style="padding: 40px 30px 0 30px;">
                <!-- Header with Logo -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td align="center" style="padding-bottom: 30px;">
                      <img src="http://localhost:3000/logo.png" alt="Hygieia Health System" style="display: block; width: 150px; height: auto;" />
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 30px;">
                <!-- Main Content -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: white; border-radius: 8px; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);">
                  <tr>
                    <td style="padding: 40px 30px;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td>
                            <h1 style="margin: 0 0 20px 0; font-size: 24px; line-height: 30px; color: ${colors.darkSlateGray}; font-weight: 600;">Verification Required</h1>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 0 0 20px 0; color: ${colors.coolGray}; font-size: 16px; line-height: 24px;">
                            <p style="margin: 0;">Hello,</p>
                            <p style="margin: 16px 0 0 0;">Please use the following verification code to complete your authentication:</p>
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding: 30px 0;">
                            <table border="0" cellpadding="0" cellspacing="0" style="background-color: ${colors.darkSlateGray}; border-radius: 8px; width: 100%; max-width: 320px;">
                              <tr>
                                <td align="center" style="padding: 20px 10px;">
                                  <table border="0" cellpadding="0" cellspacing="0">
                                    ${Array.from(otp).map(digit => `
                                      <td style="padding: 0 4px;">
                                        <div style="background-color: ${colors.coolGray}; border-radius: 6px; width: 40px; height: 50px; display: inline-block; text-align: center; line-height: 50px; font-size: 24px; font-weight: bold; color: ${colors.snowWhite};">${digit}</div>
                                      </td>
                                    `).join('')}
                                  </table>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 0 0 20px 0;">
                            <p style="margin: 0; color: ${colors.coolGray}; font-size: 16px; line-height: 24px;">This code will expire in <span style="color: ${colors.softCoral}; font-weight: bold;">10 minutes</span>.</p>
                            <p style="margin: 16px 0 0 0; color: ${colors.coolGray}; font-size: 16px; line-height: 24px;">If you didn't request this code, please ignore this email or contact support if you have concerns.</p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 30px 0 0 0; border-top: 1px solid #e1e1e8;">
                            <p style="margin: 0; color: ${colors.coolGray}; font-size: 14px; line-height: 22px;">For security reasons, never share this code with anyone, including Hygieia Health staff. Our team will never ask for your verification code.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 30px;">
                <!-- Footer -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td align="center" style="padding: 0 0 20px 0;">
                      <table border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding: 0 10px;">
                            <a href="https://example.com" style="color: ${colors.softBlue}; text-decoration: none;">
                              <img src="https://via.placeholder.com/30?text=f" alt="Facebook" style="display: block; width: 30px; height: 30px; border-radius: 15px;" />
                            </a>
                          </td>
                          <td style="padding: 0 10px;">
                            <a href="https://example.com" style="color: ${colors.softBlue}; text-decoration: none;">
                              <img src="https://via.placeholder.com/30?text=t" alt="Twitter" style="display: block; width: 30px; height: 30px; border-radius: 15px;" />
                            </a>
                          </td>
                          <td style="padding: 0 10px;">
                            <a href="https://example.com" style="color: ${colors.softBlue}; text-decoration: none;">
                              <img src="https://via.placeholder.com/30?text=in" alt="LinkedIn" style="display: block; width: 30px; height: 30px; border-radius: 15px;" />
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="color: ${colors.coolGray}; font-size: 13px; line-height: 20px;">
                      <p style="margin: 0;">&copy; ${new Date().getFullYear()} Hygieia Health System. All rights reserved.</p>
                      <p style="margin: 8px 0 0 0;">123 Healing Way, Wellness City, WC 12345</p>
                      <p style="margin: 8px 0 0 0;">
                        <a href="https://example.com/privacy" style="color: ${colors.softBlue}; text-decoration: none;">Privacy Policy</a> | 
                        <a href="https://example.com/terms" style="color: ${colors.softBlue}; text-decoration: none;">Terms of Service</a> | 
                        <a href="https://example.com/unsubscribe" style="color: ${colors.softBlue}; text-decoration: none;">Unsubscribe</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  
    return otpHtml;
  };
  
 

  async sendOtp(email: string, otp: string) {
    const otpHtml = this.generateOtpEmail(otp);
  await this.sendEmail(email, 'Your OTP Code', otpHtml)
  console.log('OTP sent successfully to', email)
  }

  async sendEmail(to: string, subject: string, html: string) {
    console.log('[INFO] Sending email to:', to, ' subject:', subject)
    await this.transporter.sendMail({
      from: `"Hygieia" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    })
  }
}
