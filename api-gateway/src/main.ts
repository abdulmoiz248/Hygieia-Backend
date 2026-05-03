import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log', 'debug', 'verbose'] });

  app.enableCors({
    origin: ['http://localhost:3000', 'https://hygieia-frontend.vercel.app'], // array of allowed origins
    credentials: true, // allow cookies/headers if needed
  });

    const config = new DocumentBuilder()
    .setTitle('Hygieia API') // your project name
    .setDescription('API docs for Hygieia backend') // description
    .setVersion('1.0')
    .addBearerAuth() // if you’re using JWT auth
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);


  await app.listen(process.env.PORT ?? 4000, '0.0.0.0');
}
bootstrap();
