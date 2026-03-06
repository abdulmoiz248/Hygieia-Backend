import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NewsletterController } from './newsletter.controller';

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
  controllers: [NewsletterController],
})
export class NewsletterModule {}
