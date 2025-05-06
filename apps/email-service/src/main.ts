
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { microserviceClients } from '../../client';


async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule,{
    ...microserviceClients.emailService.body
  });

  await app.listen();
  console.log(`[INFO] Email Service is running on: ${microserviceClients.emailService.body.options.port}`);
}

bootstrap();
