import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { DoctorProfile,DoctorProfileDocument } from 'src/schema/doctor-profile.schema';
import { SupabaseService } from '../supabase/supabase.service'


@Injectable()
export class DoctorsService {



    constructor(
    @InjectModel(DoctorProfile.name) private doctorModel: Model<DoctorProfileDocument>,
    private readonly supabase: SupabaseService,
  ) {}

  async findAll() {
    const [doctors, { data: users, error }] = await Promise.all([
      this.doctorModel.find().lean().exec(),
      this.supabase.getClient().from('users').select('id, email'),
    ])

    if (error) {
      throw new Error(`Failed to fetch doctors email records: ${error.message}`)
    }

    const emailById = new Map((users ?? []).map((user) => [user.id, user.email]))

    return doctors.map((doctor) => ({
      ...doctor,
      email: emailById.get(String(doctor.id)) ?? '',
    }))
  }

}
