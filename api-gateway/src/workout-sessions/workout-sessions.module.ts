import { Module } from '@nestjs/common';
import { WorkoutSessionsService } from './workout-sessions.service';
import { WorkoutSessionsController } from './workout-sessions.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
@Module({
    imports: [
      ClientsModule.register([
        {
          name: 'FITNESS_SERVICE',
          transport: Transport.TCP,
          options: {
            host: process.env.FITNESS_HOST || 'localhost',
            port: process.env.FITNESS_MS_PORT ? parseInt(process.env.FITNESS_MS_PORT) : 4005,
          },
        },
      ]),
    ],
  controllers: [WorkoutSessionsController],
  providers: [WorkoutSessionsService],
})
export class WorkoutSessionsModule {}
