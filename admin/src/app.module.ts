import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FaqModule } from './faq/faq.module';
import { SupabaseModule } from './supabase/supabase.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { BlogpostModule } from './blogpost/blogpost.module';
import { AnnouncementModule } from './announcement/announcement.module';
import { WorkerReportModule } from './worker-report/worker-report.module';
import { ProviderReportModule } from './provider-report/provider-report.module';
import { FeedbackFormModule } from './feedback-form/feedback-form.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    FaqModule,
    NewsletterModule,
    BlogpostModule,
    AnnouncementModule,
    WorkerReportModule,
    ProviderReportModule,
    FeedbackFormModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

