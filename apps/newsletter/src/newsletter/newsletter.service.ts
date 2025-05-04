import { Injectable } from '@nestjs/common';
import { PrismaService } from 'apps/newsletter/prisma/prisma.service';

@Injectable()
export class NewsletterService {
  constructor(private readonly prisma: PrismaService) {}

  
  async createNewsletter(email: string) {
    try {
   
      const existingEmail = await this.prisma.newsletter.findUnique({
        where: { email },
      });
      
      if (existingEmail) {
        throw new Error('Email already exists');
      }

    
      return await this.prisma.newsletter.create({
        data: { email },
      });
    } catch (error) {
   
      throw new Error(error.message || 'Failed to subscribe');
    }
  }
}
