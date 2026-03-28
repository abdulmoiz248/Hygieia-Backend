import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator'

export class AppointmentReviewRequestDto {
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

  @IsString()
  review_link: string

  @IsOptional()
  @IsString()
  appointment_mode?: string
}
