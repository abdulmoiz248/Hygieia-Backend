import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppointmentsModule } from './appointments/appointments.module';
import { ConfigModule } from '@nestjs/config'
import { MailModule } from './mail/mail.module';
import { LabsModule } from './labs/labs.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { CvModule } from './cv/cv.module';
import { AuthModule } from './auth/auth.module';
import { NutritionAndAdherenceMailerModule } from './nutrition-and-adherence/nutrition-and-adherence.module';
import { ReportModule } from './report/report.module';

@Module({
  imports: [  ConfigModule.forRoot({ isGlobal: true }),
    AppointmentsModule,
    MailModule,
    LabsModule,
    NewsletterModule,
    CvModule,
    AuthModule,
    NutritionAndAdherenceMailerModule,
    ReportModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

