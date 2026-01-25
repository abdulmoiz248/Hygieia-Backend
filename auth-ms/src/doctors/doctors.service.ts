import { Injectable } from '@nestjs/common';
import { DoctorProfile,DoctorProfileDocument } from 'src/schema/doctor-profile.schema';
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'


@Injectable()
export class DoctorsService {



    constructor(
    @InjectModel(DoctorProfile.name) private doctorModel: Model<DoctorProfileDocument>,
  ) {}

  async findAll() {
    return this.doctorModel.find().exec()
  }

}
