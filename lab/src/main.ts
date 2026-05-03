import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices'


async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule,{
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: process.env.LAB_MS_PORT ? parseInt(process.env.LAB_MS_PORT) : 4003, 
    },
  })
  await app.listen()
}


bootstrap();
