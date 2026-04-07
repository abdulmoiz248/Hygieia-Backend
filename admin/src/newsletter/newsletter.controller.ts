import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { NewsletterService } from './newsletter.service';
import { GenerateNewsletterHtmlDto } from './dto/generate-newsletter-html.dto';
import { SendNewsletterDto } from './dto/send-newsletter.dto';
import { SendBlogpostNewsletterDto } from './dto/send-blogpost-newsletter.dto';
import { GetSentNewslettersDto } from './dto/get-sent-newsletters.dto';

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

  @MessagePattern({ cmd: 'send_blogpost_newsletter' })
  async sendBlogpostNewsletter(payload: SendBlogpostNewsletterDto) {
    const result = await this.newsletterService.sendBlogpostAsNewsletter(
      payload.blogpostId,
    );

    return {
      data: result,
      message: 'Blogpost newsletter sent successfully',
    };
  }

  @MessagePattern({ cmd: 'get_sent_newsletters' })
  async getSentNewsletters(payload: GetSentNewslettersDto) {
    const result = await this.newsletterService.getSentNewsletters(
      payload?.limit,
      payload?.offset,
    );

    return {
      data: result,
      message: 'Sent newsletters retrieved successfully',
    };
  }
}
