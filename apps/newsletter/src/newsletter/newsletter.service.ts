import { Injectable } from '@nestjs/common';
import { PrismaService } from 'apps/newsletter/prisma/prisma.service';

@Injectable()
export class NewsletterService {
    constructor(private readonly prisma: PrismaService) {}

    async createNewsletter(email: any) {
        return this.prisma.newsletter.create({
            data: {
              email,
            },
          });
          
    }
}
