import { Module } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { DoctorProfile,DoctorProfileSchema } from 'src/schema/doctor-profile.schema';

@Module({
   imports: [
    MongooseModule.forFeature([{ name: DoctorProfile.name, schema: DoctorProfileSchema }]),
  ],
  controllers: [DoctorsController],
  providers: [DoctorsService],
})
export class DoctorsModule {}
