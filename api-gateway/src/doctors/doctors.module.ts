import { Module } from '@nestjs/common';
import { DoctorsController } from './doctors.controller';

import { ClientsModule,Transport } from '@nestjs/microservices';
@Module({
  imports: [
        ClientsModule.register([
          {
            name: 'AUTH_SERVICE',
            transport: Transport.TCP,
            options: {
              host: process.env.AUTH_MS_HOST || 'localhost',
              port: process.env.AUTH_MS_PORT ? parseInt(process.env.AUTH_MS_PORT) : 4002,
            },
          },
        ]),
      ],
  controllers: [DoctorsController],
  providers: [],
})
export class DoctorsModule {}