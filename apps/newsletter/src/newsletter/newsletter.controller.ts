import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

@Controller('newsletter')
export class NewsletterController {


    @MessagePattern("subscribe")
    subscribe(email: string) {
        console.log("subscribe", email);
        return { status: "ok" };
    }
}
