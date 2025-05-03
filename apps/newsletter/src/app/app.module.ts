import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NewsletterController } from '../newsletter/newsletter.controller';

@Module({
  imports: [],
  controllers: [AppController, NewsletterController],
  providers: [AppService],
})
export class AppModule {}
