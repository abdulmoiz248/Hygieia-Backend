import { Controller, Post, Body } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { SubscribeNewsletterDto } from './dto/subscribeNewsletter.dto';
import { MessagePattern } from '@nestjs/microservices';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @MessagePattern({ cmd: 'subscribe-newsletter' })
  subscribe(@Body() dto: SubscribeNewsletterDto) {
    console.log(
      '[INFO NEWSLETTER MS] Received newsletter subscription request for email:',
      dto.email,
    );
    return this.newsletterService.subscribe(dto.email);
  }

  @MessagePattern({ cmd: 'allNewsletterSubscribers' })
  async getAll() {
    return await this.newsletterService.findAll();
  }

  @MessagePattern({ cmd: 'unsubscribe-newsletter' })
  unsubscribe(@Body() dto: { email: string }) {
    console.log(
      '[INFO NEWSLETTER MS] Received newsletter unsubscribe request for email:',
      dto.email,
    );
    return this.newsletterService.unsubscribe(dto.email);
  }
}
