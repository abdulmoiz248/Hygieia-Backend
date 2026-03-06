import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure microservice transport
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: process.env.ADMIN_MS_HOST || 'localhost',
      port: process.env.ADMIN_MS_PORT ? parseInt(process.env.ADMIN_MS_PORT) : 4011,
    },
  });

  // Start listening for microservice messages
  await app.startAllMicroservices();

  // Listen on HTTP port for health checks and other endpoints
  const httpPort = process.env.PORT ?? 4011;
  await app.listen(httpPort, () => {
    console.log(`Admin microservice listening on port ${httpPort}`);
    console.log(`Admin microservice TCP listening on port ${process.env.ADMIN_MS_PORT ? parseInt(process.env.ADMIN_MS_PORT) : 4011}`);
  });
}

bootstrap();

