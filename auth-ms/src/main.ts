import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'

async function bootstrap() {
  // create normal HTTP app
  const app = await NestFactory.create(AppModule)

  // middlewares + pipes work on the HTTP app
  app.use(cookieParser())
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.setGlobalPrefix('auth')

  // attach microservice
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: process.env.AUTH_MS_PORT ? parseInt(process.env.AUTH_MS_PORT) : 4002,
    },
  })

  // start both
  await app.startAllMicroservices()
  await app.listen(process.env.GOOGLE_OAUTH_PORT ? parseInt(process.env.GOOGLE_OAUTH_PORT) : 4001, '0.0.0.0')
}
bootstrap()
