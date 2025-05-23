import { Module } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { NewsletterController } from './newsletter.controller';
import { PrismaService } from 'apps/newsletter/prisma/prisma.service';

@Module({
  imports: [],
  controllers: [NewsletterController],
  providers: [NewsletterService,PrismaService],
})
export class NewsletterModule {}
