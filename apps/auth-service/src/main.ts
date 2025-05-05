
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

import { microserviceClients } from '../../client';
async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule,{
    ...microserviceClients.authService.body
  });
 

  await app.listen();
 
}

bootstrap();
