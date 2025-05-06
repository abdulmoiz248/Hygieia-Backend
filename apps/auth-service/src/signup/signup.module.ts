import { Module } from '@nestjs/common';
import { SignupService } from './signup.service';
import { SignupController } from './signup.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { ClientsModule } from '@nestjs/microservices';
import { microserviceClients } from '../../../client';

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
  controllers: [SignupController],
  providers: [SignupService,PrismaService],
})
export class SignupModule {}
