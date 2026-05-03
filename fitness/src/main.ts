import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule,{
    transport:Transport.TCP,
     options: {
       host: '0.0.0.0',
       port: process.env.FITNESS_MS_PORT ? parseInt(process.env.FITNESS_MS_PORT) : 4005
     },
  });
  await app.listen();
}
bootstrap();
