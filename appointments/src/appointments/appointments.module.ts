import { Module } from '@nestjs/common'
import { AppointmentsService } from './appointments.service'
import { AppointmentsController } from './appointments.controller'
import { MongooseModule } from '@nestjs/mongoose'
import { Profile,ProfileSchema } from './schema/patient.profile.schema'
import { NutritionistProfile, NutritionistProfileSchema } from './schema/nutritionist-profile.schema'
import { DoctorProfile, DoctorProfileSchema } from './schema/doctor-profile.schema'
import { MailerModule } from '../mailer/mailer.module'
import { ClientsModule, Transport } from '@nestjs/microservices'


@Module({
    imports: [
      ClientsModule.register([
          {
        name: 'SCHEDULER_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [`amqp://guest:guest@${process.env.RABBITMQ_HOST || 'localhost'}:5672`],
          queue: 'appointments_queue',
          queueOptions: { durable: true },
        },
      }, 
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
      MongooseModule.forFeature([
        { name: Profile.name, schema: ProfileSchema },
        { name: NutritionistProfile.name, schema: NutritionistProfileSchema },
        { name: DoctorProfile.name, schema: DoctorProfileSchema }
      ]),
      MailerModule,
   
    ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
