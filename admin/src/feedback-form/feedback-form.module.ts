import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { FeedbackFormController } from './feedback-form.controller';
import { FeedbackFormService } from './feedback-form.service';
import { SupabaseModule } from 'src/supabase/supabase.module';

@Module({
  imports: [
    SupabaseModule,
    ClientsModule.register([
      {
        name: 'MAILER_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [
            `amqp://guest:guest@${process.env.RABBITMQ_HOST || 'localhost'}:5672`,
          ],
          queue: 'email_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [FeedbackFormController],
  providers: [FeedbackFormService],
})
export class FeedbackFormModule {}
