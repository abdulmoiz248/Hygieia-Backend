import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { NewsletterService } from './newsletter.service';
import { GenerateNewsletterHtmlDto } from './dto/generate-newsletter-html.dto';
import { SendNewsletterDto } from './dto/send-newsletter.dto';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @MessagePattern({ cmd: 'generate_newsletter_html' })
  async generateNewsletterHtml(payload: GenerateNewsletterHtmlDto) {
    const html = await this.newsletterService.generateNewsletterHtml(payload.idea);

    return {
      data: { html },
      message: 'Newsletter HTML generated successfully',
    };
  }

  @MessagePattern({ cmd: 'send_newsletter' })
  async sendNewsletter(payload: SendNewsletterDto) {
    const result = await this.newsletterService.sendNewsletterToAll(
      payload.html,
      payload.subject,
    );

    return {
      data: result,
      message: 'Newsletter send request processed',
    };
  }
}
