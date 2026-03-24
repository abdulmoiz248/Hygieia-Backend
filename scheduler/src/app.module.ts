import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ConfigModule } from '@nestjs/config/dist/config.module';
import { ReminderModule } from './reminder/reminder.module';
import { BullModule } from '@nestjs/bullmq'
import { LabsReminderModule } from './labs-reminder/labs-reminder.module';
import { ScheduleModule } from '@nestjs/schedule';
import { FitbitModule } from './fitbit/fitbit.module';
import { NutritionAndAdherenceModule } from './nutrition-and-adherence/nutrition-and-adherence.module';
import { TriggerModule } from './trigger/trigger.module';


@Module({
  imports: [
     ScheduleModule.forRoot(),
    SchedulerModule,
     ConfigModule.forRoot({
      isGlobal: true,
    }),
     ReminderModule,
      BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost', 
        port: 6379,
      },
    }),
      LabsReminderModule,
      FitbitModule,
      NutritionAndAdherenceModule,
      TriggerModule,
  
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
