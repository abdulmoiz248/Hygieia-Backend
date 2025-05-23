import { Transport, TcpOptions } from '@nestjs/microservices';

export const microserviceClients: Record<string, { name: string; body: TcpOptions }> = {
  newsletter: {
    name: 'NEWSLETTER',
    body: {
      transport: Transport.TCP,
      options: {
        port: 4001,
        host: '127.0.0.1',
      }
    }
  },
  authService: {
    name: 'AUTH_SERVICE',
    body: {
      transport: Transport.TCP,
      options: {
        port: 4002,
        host: '127.0.0.1',
      }
    }
  },
  emailService: {
    name: 'EMAIL_SERVICE',
    body: {
      transport: Transport.TCP,
      options: {
        port: 4003,
        host: '127.0.0.1',
      }
    }
  }
};
