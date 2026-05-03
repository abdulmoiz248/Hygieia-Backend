import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices'


async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule,{
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: process.env.APPOINTMENTS_MS_PORT ? parseInt(process.env.APPOINTMENTS_MS_PORT) : 4006, 
    },
  })
  await app.listen()
}


bootstrap();
