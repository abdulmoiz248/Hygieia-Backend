import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({
    imports: [
      ClientsModule.register([
        {
          name: 'LABS',
          transport: Transport.TCP,
          options: {
            host: process.env.LAB_HOST || 'localhost',
            port: process.env.LAB_MS_PORT ? parseInt(process.env.LAB_MS_PORT) : 4003,
          },
        },
      ]),
    ],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
