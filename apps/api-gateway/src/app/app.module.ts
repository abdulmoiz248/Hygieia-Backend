// app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule } from '@nestjs/microservices';
import { microserviceClients } from '../../../client';

@Module({
  imports: [
    ClientsModule.register(
      Object.keys(microserviceClients).map(key => ({
        name: microserviceClients[key].name,
        transport: microserviceClients[key].body.transport,
        options: {
          port: microserviceClients[key].body.options.port,
        },
      }))
    ),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}