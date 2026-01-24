import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { SupabaseModule } from '../supabase/supabase.module'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { GoogleStrategy } from './google.strategy'
import { FitbitStrategy } from './fitbit.strategy'
import { MailerService } from 'src/mailer-service/mailer-service.service'
import { MongooseModule } from '@nestjs/mongoose'
import { Profile,ProfileSchema } from 'src/schema/patient.profile.schema'
import { NutritionistProfile, NutritionistProfileSchema } from 'src/schema/nutritionist-profile.schema'
import { FitbitModule } from '../fitbit/fitbit.module'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { DoctorProfile, DoctorProfileSchema } from 'src/schema/doctor-profile.schema'


@Module({
  imports: [
    SupabaseModule,
    PassportModule,
    FitbitModule,
    MongooseModule.forFeature([{ name: Profile.name, schema: ProfileSchema },{ name: NutritionistProfile.name, schema: NutritionistProfileSchema },{name:DoctorProfile.name,schema:DoctorProfileSchema}]),
    ClientsModule.register([
      {
        name: 'MAILER_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [`amqp://guest:guest@${process.env.RABBITMQ_HOST || 'localhost'}:5672`],
          queue: 'email_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES') || '15m' },
      }),
    }),
  ],
  providers: [AuthService, GoogleStrategy, FitbitStrategy, MailerService],   // <-- add FitbitStrategy
  controllers: [AuthController],
})
export class AuthModule {}
