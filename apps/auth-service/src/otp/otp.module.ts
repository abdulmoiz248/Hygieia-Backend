import { Module } from '@nestjs/common';
import { OtpService } from './otp.service';
import { OtpController } from './otp.controller';
import { microserviceClients } from '../../../client';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientsModule } from '@nestjs/microservices';



@Module({
  imports: [ClientsModule.register([
    {name:microserviceClients.emailService.name,
      transport: microserviceClients.emailService.body.transport,
      options: {
        host: microserviceClients.emailService.body.options.host,
        port: microserviceClients.emailService.body.options.port,
      },
    }
      
  ])],
  controllers: [OtpController],
  providers: [OtpService,PrismaService],
})
export class OtpModule {}
