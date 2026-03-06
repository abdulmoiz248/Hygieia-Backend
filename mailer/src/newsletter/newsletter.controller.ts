import { Controller } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { MessagePattern } from '@nestjs/microservices/decorators/message-pattern.decorator';
import { Payload } from '@nestjs/microservices/decorators/payload.decorator';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

   @MessagePattern('welcome-newsletter-email')
  async handleWelcomeNewsletterEmail(@Payload() data) {
     await this.newsletterService.handleWelcomeNewsletterEmail(data)
    }

  @MessagePattern({ cmd: 'send-newsletter-bulk' })
  async handleSendNewsletterBulk(
    @Payload() data: { emails: string[]; html: string; subject?: string },
  ) {
    return this.newsletterService.handleSendNewsletterBulk(data);
  }
}
