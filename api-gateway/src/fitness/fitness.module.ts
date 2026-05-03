import { Module } from '@nestjs/common';
import { FitnessService } from './fitness.service';
import { FitnessController } from './fitness.controller';
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
  controllers: [FitnessController],
  providers: [FitnessService],
})
export class FitnessModule {}
