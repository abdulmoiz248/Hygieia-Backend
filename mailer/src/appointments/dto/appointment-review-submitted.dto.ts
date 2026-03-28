import { IsEmail, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class AppointmentReviewSubmittedDto {
  @IsString()
  appointment_id: string

  @IsString()
  patient_id: string

  @IsString()
  provider_id: string

  @IsIn(['doctor', 'nutritionist'])
  provider_role: 'doctor' | 'nutritionist'

  @IsEmail()
  patient_email: string

  @IsString()
  patient_name: string

  @IsString()
  provider_name: string

  @IsString()
  appointment_date: string

  @IsString()
  appointment_time: string

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number

  @IsString()
  review_text: string

  @IsOptional()
  @IsString()
  appointment_mode?: string
}
