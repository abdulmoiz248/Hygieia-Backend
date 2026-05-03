import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { ClientsModule } from '@nestjs/microservices/module/clients.module';
import { Transport } from '@nestjs/microservices/enums/transport.enum';

@Module({
  imports:[ ClientsModule.register([
          {
            name: 'AUTH_SERVICE',
            transport: Transport.TCP,
            options: {
              host: process.env.AUTH_MS_HOST || 'localhost',
              port: process.env.AUTH_MS_PORT ? parseInt(process.env.AUTH_MS_PORT) : 4002,
            },
          },
        ]),],
  controllers: [NotificationsController],
  providers: [NotificationsService],
})
export class NotificationsModule {}
