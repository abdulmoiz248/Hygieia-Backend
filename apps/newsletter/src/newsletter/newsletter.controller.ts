import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { NewsletterService } from './newsletter.service';
import { HttpStatus } from '@nestjs/common';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @MessagePattern('subscribe')
  async subscribe(email: string) {
    try {
      const result = await this.newsletterService.createNewsletter(email); 
      return {
        message: 'Subscribed successfully',
        success: true,
        statusCode: HttpStatus.OK,
      };
    } catch (error) {
     
      return {
        message: error.message || 'Email already exists',
        success: false,
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }
  }
}
