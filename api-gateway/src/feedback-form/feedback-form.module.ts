import { Module } from '@nestjs/common';
import { FeedbackFormService } from './feedback-form.service';
import { FeedbackFormController } from './feedback-form.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'ADMIN_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.ADMIN_MS_HOST || 'localhost',
          port: process.env.ADMIN_MS_PORT ? parseInt(process.env.ADMIN_MS_PORT) : 4011,
        },
      },
    ]),
  ],
  controllers: [FeedbackFormController],
  providers: [FeedbackFormService],
})
export class FeedbackFormModule {}
