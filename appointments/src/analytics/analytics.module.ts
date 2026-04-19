import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Profile, ProfileSchema } from '../appointments/schema/patient.profile.schema';
import { PatientJournal, PatientJournalSchema } from '../patient-journal/schema/patient-journal.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Profile.name, schema: ProfileSchema },
      { name: PatientJournal.name, schema: PatientJournalSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
