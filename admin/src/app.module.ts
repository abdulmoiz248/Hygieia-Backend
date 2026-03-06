import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FaqModule } from './faq/faq.module';
import { SupabaseModule } from './supabase/supabase.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { BlogpostModule } from './blogpost/blogpost.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    FaqModule,
    NewsletterModule,
    BlogpostModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
