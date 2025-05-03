import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

@Controller('newsletter')
export class NewsletterController {

    @MessagePattern("subscribe")
    subscribe(data: any) {
        console.log("subscribe", data);
        return { status: "ok" };
    }
}
