import { Module } from '@nestjs/common';
import { LabTestsService } from './lab-tests.service';
import { LabTestsController } from './lab-tests.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
    imports: [
    ClientsModule.register([
      {
        name: 'LAB_TESTS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.LAB_HOST || 'localhost',
          port: process.env.LAB_MS_PORT ? parseInt(process.env.LAB_MS_PORT) : 4003,
        },
      },
    ]),
  ],
  controllers: [LabTestsController],
  providers: [LabTestsService],
})
export class LabTestsModule {}
