import { Module } from '@nestjs/common';
import { LabTechniciansController } from './lab-technicians.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
     {
        name: 'AUTH_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.AUTH_MS_HOST || 'localhost',
          port: 4002,
        },
      },
     
  ]),
  ],
  controllers: [LabTechniciansController],
})
export class LabTechniciansModule {}
