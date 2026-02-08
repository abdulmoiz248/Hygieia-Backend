import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { SupabaseModule } from './supabase/supabase.module'
import { AppointmentsModule } from './appointments/appointments.module'
import { MongooseModule } from '@nestjs/mongoose'
import { AnalyticsModule } from './analytics/analytics.module'
import { PatientJournalModule } from './patient-journal/patient-journal.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    SupabaseModule,
    AppointmentsModule,
    PatientJournalModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
