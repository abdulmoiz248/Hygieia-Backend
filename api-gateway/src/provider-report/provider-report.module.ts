import { Module } from '@nestjs/common'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { ProviderReportController } from './provider-report.controller'
import { ProviderReportService } from './provider-report.service'

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
      {
        name: 'APPOINTMENTS_SERVICE',
        transport: Transport.TCP,
        options: {
          host: process.env.APPOINTMENTS_HOST || 'localhost',
          port: process.env.APPOINTMENTS_MS_PORT
            ? parseInt(process.env.APPOINTMENTS_MS_PORT)
            : 4006,
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
  controllers: [ProviderReportController],
  providers: [ProviderReportService],
})
export class ProviderReportModule {}
