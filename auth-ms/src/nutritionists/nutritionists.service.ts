import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { NutritionistProfile,NutritionistProfileDocument } from 'src/schema/nutritionist-profile.schema';
import { SupabaseService } from '../supabase/supabase.service'


@Injectable()
export class NutritionistsService {



    constructor(
    @InjectModel(NutritionistProfile.name) private nutritionistModel: Model<NutritionistProfileDocument>,
    private readonly supabase: SupabaseService,
  ) {}

  async findAll() {
    const [nutritionists, { data: users, error }] = await Promise.all([
      this.nutritionistModel.find().lean().exec(),
      this.supabase.getClient().from('users').select('id, email'),
    ])

    if (error) {
      throw new Error(`Failed to fetch nutritionists email records: ${error.message}`)
    }

    const emailById = new Map((users ?? []).map((user) => [user.id, user.email]))

    return nutritionists.map((nutritionist) => ({
      ...nutritionist,
      email: emailById.get(String(nutritionist.id)) ?? '',
    }))
  }

}
