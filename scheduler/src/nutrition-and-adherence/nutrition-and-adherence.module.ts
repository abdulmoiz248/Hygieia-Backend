import { Module } from '@nestjs/common'
import { NutritionAndAdherenceService } from './nutrition-and-adherence.service'
import { ClientsModule, Transport } from '@nestjs/microservices'

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'MAILER_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [`amqp://guest:guest@${process.env.RABBITMQ_HOST || 'localhost'}:5672`],
          queue: 'email_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  providers: [NutritionAndAdherenceService],
  exports: [NutritionAndAdherenceService],
})
export class NutritionAndAdherenceModule {}
