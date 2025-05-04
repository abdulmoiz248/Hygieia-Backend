import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { NewsletterService } from './newsletter.service';

@Controller('newsletter')
export class NewsletterController {

    constructor(private readonly newsletterService: NewsletterService) {}

    @MessagePattern("subscribe")
    subscribe(email: string) {
        this.newsletterService.createNewsletter(email); 
        return { message: "Subscribed successfully" };
    }
}
