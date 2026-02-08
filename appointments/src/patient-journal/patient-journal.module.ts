import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { PatientJournalService } from './patient-journal.service'
import { PatientJournalController } from './patient-journal.controller'
import { PatientJournal, PatientJournalSchema } from './schema/patient-journal.schema'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PatientJournal.name, schema: PatientJournalSchema },
    ]),
  ],
  controllers: [PatientJournalController],
  providers: [PatientJournalService],
  exports: [PatientJournalService],
})
export class PatientJournalModule {}
