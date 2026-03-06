// nutritionist-profile.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type NutritionistProfileDocument = NutritionistProfile & Document

@Schema({ timestamps: true })
export class NutritionistProfile {

@Prop({ required: true,unique:  true })
  id: string
    
  @Prop({ required: true })
  name: string

  @Prop()
  phone: string

  @Prop()
  gender: string

  @Prop()
  dateofbirth: string

  @Prop()
  img: string

  @Prop()
  personal_email: string

  @Prop()
  specialization: string

  @Prop()
  experienceYears: number

  @Prop([String])
  certifications: string[]

  @Prop([String])
  education: string[]

  @Prop([String])
  languages: string[]

  @Prop()
  bio: string

  @Prop()
  consultationFee: number

  @Prop([{ day: String, start: String, end: String, location: String }])
  workingHours: { day: string; start: string; end: string; location: string }[]

  @Prop({ default: 0 })
  rating: number
}

export const NutritionistProfileSchema =
  SchemaFactory.createForClass(NutritionistProfile)
