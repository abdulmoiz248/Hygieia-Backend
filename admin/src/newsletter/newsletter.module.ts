import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
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
  controllers: [NewsletterController],
  providers: [NewsletterService],
})
export class NewsletterModule {}
