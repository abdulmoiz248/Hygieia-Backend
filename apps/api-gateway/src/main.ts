

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port =  4000;
   // Enable CORS with credentials
   app.enableCors({
    origin: 'http://localhost:3000', // Allow frontend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization', // Add Authorization if you need it
    credentials: true, // Allow cookies/credentials
  });
  await app.listen(port);
  console.log('[INFO] API Gateway is running on: 4000');
}

bootstrap();
