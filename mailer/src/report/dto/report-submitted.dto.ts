import { IsEmail, IsString, IsIn, IsUUID } from 'class-validator'

export class ReportSubmittedDto {
  @IsEmail()
  patient_email: string

  @IsString()
  patient_name: string

  @IsIn(['doctor', 'nutritionist'])
  reported_provider_role: 'doctor' | 'nutritionist'

  @IsString()
  report_id: string
}
