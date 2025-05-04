import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { microserviceClients } from 'apps/client';
import { ClientProxy } from '@nestjs/microservices';

@Controller()
export class AppController {
  constructor(
    @Inject(microserviceClients.newsletter.name) private readonly newsletterClient: ClientProxy
  ) {}

   @Post('subscribe-newsletter')
    async subscribeNewsletter(@Body('email') email: string) {
      console.log("subscribeNewsletter", email);
      return this.newsletterClient.send('subscribe',email)

    }
   
}
