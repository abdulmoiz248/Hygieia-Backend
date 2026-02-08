import { Module } from '@nestjs/common'
import { PatientJournalController } from './patient-journal.controller'
import { ClientsModule, Transport } from '@nestjs/microservices'

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'APPOINTMENTS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.APPOINTMENTS_HOST || 'localhost',
          port: 4006,
        },
      },
    ]),
  ],
  controllers: [PatientJournalController],
})
export class PatientJournalModule {}
