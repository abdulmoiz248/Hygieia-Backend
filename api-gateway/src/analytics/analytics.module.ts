import { Module } from '@nestjs/common';

import { ClientsModule, Transport } from '@nestjs/microservices';

import { AnalyticsController } from './analytics.controller';
import { DashboardController } from './dashboard.controller';

@Module({
   imports: [
        ClientsModule.register([
          {
            name: 'APPOINTMENTS_SERVICE',
            transport: Transport.TCP,
            options: {
              host: process.env.APPOINTMENTS_HOST || 'localhost',
              port: 4006,
            },
          },
        ]),
      ],
  controllers: [AnalyticsController, DashboardController],

})
export class AnalyticsModule {}
