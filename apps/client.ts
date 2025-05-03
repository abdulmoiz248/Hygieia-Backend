import { Transport, TcpOptions } from '@nestjs/microservices';

export const microserviceClients: Record<string, { name: string; body: TcpOptions }> = {
  newsletter: {
    name: 'NEWSLETTER',
    body: {
      transport: Transport.TCP,
      options: {
        port: 4001
      }
    }
  }
};
