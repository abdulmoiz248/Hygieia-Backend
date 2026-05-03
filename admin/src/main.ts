import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure microservice transport
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: process.env.ADMIN_MS_PORT ? parseInt(process.env.ADMIN_MS_PORT) : 4011,
    },
  });

  // Start listening for microservice messages
  await app.startAllMicroservices();

  
}

bootstrap();

