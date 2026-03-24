// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  // Create hybrid application - both HTTP and RabbitMQ
  const app = await NestFactory.create(AppModule);

  // Connect RabbitMQ microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [`amqp://guest:guest@${process.env.RABBITMQ_HOST || 'localhost'}:5672`],
      queue: 'appointments_queue',
      queueOptions: { durable: true },
    },
  });

  // Start microservice
  await app.startAllMicroservices();

  // Listen on HTTP port for REST endpoints (trigger endpoints)
  const httpPort = process.env.SCHEDULER_PORT || 4009;
  await app.listen(httpPort, '0.0.0.0', () => {
    console.log(`Scheduler service listening on HTTP port ${httpPort}`);
  });
}
bootstrap();
