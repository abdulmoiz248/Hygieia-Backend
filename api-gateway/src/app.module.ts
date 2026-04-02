import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { LabTestsModule } from './lab-tests/lab-tests.module';
import { MedicalRecordsModule } from './medical-records/medical-records.module';
import { FitnessModule } from './fitness/fitness.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DietPlanModule } from './diet-plan/diet-plan.module';
import { CvModule } from './cv/cv.module';
import { BlogPostModule } from './blog-post/blog-post.module';
import { BlogCategoryModule } from './blog-category/blog-category.module';
import { NutritionistsModule } from './nutritionists/nutritionists.module';
import { WorkoutSessionsModule } from './workout-sessions/workout-sessions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { DoctorsModule } from './doctors/doctors.module';
import { PatientJournalModule } from './patient-journal/patient-journal.module';
import { FaqModule } from './faq/faq.module';
import { RagModule } from './rag/rag.module';
import { CronTestModule } from './cron-test/cron-test.module';
import { AnnouncementModule } from './announcement/announcement.module';
import { WorkerReportModule } from './worker-report/worker-report.module';
import { LabTechniciansModule } from './lab-technicians/lab-technicians.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local', '../.env'],
    }),
    AuthModule,
    BookingsModule,
    LabTestsModule,
    MedicalRecordsModule,
    FitnessModule,
    AppointmentsModule,
    PatientJournalModule,
    AnalyticsModule,
    DietPlanModule,
    CvModule,
    BlogPostModule,
    BlogCategoryModule,
    NutritionistsModule,
    WorkoutSessionsModule,
    NotificationsModule,
    NewsletterModule,
    DoctorsModule,
    FaqModule,
    RagModule,
    CronTestModule,
    AnnouncementModule,
    WorkerReportModule,
    LabTechniciansModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
