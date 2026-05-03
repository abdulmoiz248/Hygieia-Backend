import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
    imports: [
      ClientsModule.register([
        {
          name: 'APPOINTMENTS_SERVICE',
          transport: Transport.TCP,
          options: {
            host: process.env.APPOINTMENTS_HOST || 'localhost',
            port: process.env.APPOINTMENTS_MS_PORT ? parseInt(process.env.APPOINTMENTS_MS_PORT) : 4006,
          },
        },
      ]),
    ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
