import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { microserviceClients } from 'apps/client';
import { ClientProxy } from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(
    @Inject(microserviceClients.newsletter.name) private readonly newsletterClient: ClientProxy
  ,
    @Inject(microserviceClients.authService.name) private readonly authClient: ClientProxy,
  ) {}

   @Post('subscribe-newsletter')
    async subscribeNewsletter(@Body('email') email: string) {
      return this.newsletterClient.send('subscribe',email)

    }
   @Post('signup')
    async signup(@Body('name') name: string,@Body('email') email: string, @Body('password') password: string, @Body('role') role?: string) {
     return this.authClient.send('signup',{name,email, password,role})
    }

   @Post('verify-otp')
   async verifyOtp(@Body('email') email: string, @Body('code') code: string) {
     return this.authClient.send('verify_otp', { email, code });
   }

   @Post('resend-otp') 
   async resendOtp(@Body('email') email: string) {
     return this.authClient.send('resend_otp', { email });
   }
}
