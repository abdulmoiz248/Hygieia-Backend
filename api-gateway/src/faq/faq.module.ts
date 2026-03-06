import { Module } from '@nestjs/common';
import { FaqService } from './faq.service';
import { FaqController } from './faq.controller';
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
  controllers: [FaqController],
  providers: [FaqService],
})
export class FaqModule {}
