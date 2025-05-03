import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { microserviceClients } from '../../client';
import { MicroserviceOptions } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    ...microserviceClients.newsletter.body
  });
  app.listen();
  console.log('[INFO] Newsletter microservice is running on port 4001');
}


bootstrap();
