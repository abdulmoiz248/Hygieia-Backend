import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NewsletterModule } from '../newsletter/newsletter.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
@Module({
  imports: [NewsletterModule,ConfigModule.forRoot()],
  controllers: [AppController ],
  providers: [AppService,PrismaService],
})
export class AppModule {}
