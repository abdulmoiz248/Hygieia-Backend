import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

   @MessagePattern('send-email')
  async sendEmail(data: { to: string; subject: string; html: string }) {
    this.appService.sendEmail(data.to, data.subject, data.html);
  }

  @MessagePattern('send_otp')
  async sendOtp(data: { email: string; otp: string }) {
    this.appService.sendOtp(data.email, data.otp);
  }
}
