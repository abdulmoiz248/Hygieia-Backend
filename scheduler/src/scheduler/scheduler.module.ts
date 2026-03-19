import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { BullModule } from '@nestjs/bullmq'
import { ClientsModule, Transport } from '@nestjs/microservices'

@Module({
  imports: [  
    BullModule.registerQueue(
      {name: 'appointment-schedules'},
      { name: 'lab-schedules' },
    ),
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
  controllers: [SchedulerController],
  providers: [SchedulerService],
})
export class SchedulerModule {}
