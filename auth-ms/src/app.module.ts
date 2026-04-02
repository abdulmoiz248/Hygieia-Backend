import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { AuthModule } from './auth/auth.module'
import { SupabaseModule } from './supabase/supabase.module'
import { MailerServiceModule } from './mailer-service/mailer-service.module';
import { MongooseModule } from '@nestjs/mongoose';
import { CvModule } from './cv/cv.module';
import { BlogPostModule } from './blog-post/blog-post.module';
import { BlogCategoryModule } from './blog-category/blog-category.module';
import { NutritionistsModule } from './nutritionists/nutritionists.module';
import { NotificationsModule } from './notifications/notifications.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { FitbitModule } from './fitbit/fitbit.module';
import { DoctorsModule } from './doctors/doctors.module';
import { FaqModule } from './faq/faq.module';
import { LabTechniciansModule } from './lab-technicians/lab-technicians.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    SupabaseModule,
    AuthModule,
    FitbitModule,
    MailerServiceModule,
     MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
     CvModule,
     BlogPostModule,
     BlogCategoryModule,
     NutritionistsModule,
     NotificationsModule,
     NewsletterModule,
     DoctorsModule,
     FaqModule,
     LabTechniciansModule,
  ],
})
export class AppModule {}
