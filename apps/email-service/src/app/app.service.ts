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

  async sendOtp(email: string, otp: string) {
    const otpHtml = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Your OTP Code</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f7f9fc;
            padding: 20px;
          }
          .container {
            max-width: 500px;
            margin: auto;
            background: #ffffff;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
          }
          .otp {
            font-size: 28px;
            font-weight: bold;
            letter-spacing: 4px;
            margin: 20px 0;
            color: #007bff;
          }
          .footer {
            margin-top: 30px;
            font-size: 12px;
            color: #888888;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Hello,</h2>
          <p>Your One-Time Password (OTP) is:</p>
          <div class="otp">${otp}</div>
          <p>This code will expire in 10 minutes. If you didn't request this, just ignore this email.</p>
          <div class="footer">Hygieia Health System</div>
        </div>
      </body>
    </html>
  `
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
